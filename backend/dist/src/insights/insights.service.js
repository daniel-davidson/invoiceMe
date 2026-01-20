"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ollama_service_1 = require("../extraction/llm/ollama.service");
const insight_dto_1 = require("./dto/insight.dto");
let InsightsService = class InsightsService {
    prisma;
    ollamaService;
    constructor(prisma, ollamaService) {
        this.prisma = prisma;
        this.ollamaService = ollamaService;
    }
    toNumber(value) {
        return value ? Number(value) : 0;
    }
    async findAll(tenantId, type, limit = 10) {
        return this.prisma.insight.findMany({
            where: {
                tenantId,
                ...(type ? { insightType: type } : {}),
            },
            orderBy: { generatedAt: 'desc' },
            take: limit,
        });
    }
    async findOne(tenantId, id) {
        const insight = await this.prisma.insight.findFirst({
            where: { id, tenantId },
        });
        if (!insight) {
            throw new common_1.NotFoundException('Insight not found');
        }
        return insight;
    }
    async remove(tenantId, id) {
        const insight = await this.prisma.insight.findFirst({
            where: { id, tenantId },
        });
        if (!insight) {
            throw new common_1.NotFoundException('Insight not found');
        }
        await this.prisma.insight.delete({ where: { id } });
        return { deleted: true };
    }
    async generate(tenantId, types) {
        const typesToGenerate = types || [
            insight_dto_1.InsightType.MONTHLY_NARRATIVE,
            insight_dto_1.InsightType.RECURRING_CHARGES,
            insight_dto_1.InsightType.ANOMALIES,
        ];
        const startTime = Date.now();
        const insights = [];
        for (const type of typesToGenerate) {
            try {
                const insight = await this.generateInsight(tenantId, type);
                if (insight) {
                    insights.push(insight);
                }
            }
            catch (error) {
                console.error(`Failed to generate ${type} insight:`, error);
            }
        }
        return {
            generated: insights,
            processingTimeMs: Date.now() - startTime,
        };
    }
    async generateInsight(tenantId, type) {
        let metrics;
        let title;
        switch (type) {
            case insight_dto_1.InsightType.MONTHLY_NARRATIVE:
                metrics = await this.computeMonthlyNarrativeMetrics(tenantId);
                title = `${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Spending Summary`;
                break;
            case insight_dto_1.InsightType.RECURRING_CHARGES:
                metrics = await this.computeRecurringChargesMetrics(tenantId);
                title = 'Recurring Charges Detected';
                break;
            case insight_dto_1.InsightType.ANOMALIES:
                metrics = await this.computeAnomaliesMetrics(tenantId);
                title = 'Spending Anomalies';
                break;
        }
        if (!metrics || (Array.isArray(metrics.detected) && metrics.detected.length === 0) ||
            (Array.isArray(metrics.items) && metrics.items.length === 0)) {
            return null;
        }
        const narrative = await this.generateNarrative(type, metrics);
        const insight = await this.prisma.insight.create({
            data: {
                tenantId,
                insightType: type,
                title,
                content: narrative,
                relatedMetrics: metrics,
                generatedAt: new Date(),
            },
        });
        return insight;
    }
    async computeMonthlyNarrativeMetrics(tenantId) {
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        const [currentResult, previousResult] = await Promise.all([
            this.prisma.invoice.aggregate({
                where: { tenantId, invoiceDate: { gte: startOfCurrentMonth } },
                _sum: { normalizedAmount: true },
            }),
            this.prisma.invoice.aggregate({
                where: { tenantId, invoiceDate: { gte: startOfPreviousMonth, lte: endOfPreviousMonth } },
                _sum: { normalizedAmount: true },
            }),
        ]);
        const currentMonthSpend = this.toNumber(currentResult._sum.normalizedAmount);
        const previousMonthSpend = this.toNumber(previousResult._sum.normalizedAmount);
        const changePercent = previousMonthSpend > 0
            ? ((currentMonthSpend - previousMonthSpend) / previousMonthSpend) * 100
            : 0;
        const topVendorChange = await this.findTopVendorChange(tenantId, startOfCurrentMonth, startOfPreviousMonth, endOfPreviousMonth);
        return {
            currentMonthSpend,
            previousMonthSpend,
            changePercent: Math.round(changePercent * 100) / 100,
            topVendorChange,
        };
    }
    async findTopVendorChange(tenantId, startOfCurrentMonth, startOfPreviousMonth, endOfPreviousMonth) {
        const currentByVendor = await this.prisma.invoice.groupBy({
            by: ['vendorId'],
            where: { tenantId, invoiceDate: { gte: startOfCurrentMonth } },
            _sum: { normalizedAmount: true },
        });
        const previousByVendor = await this.prisma.invoice.groupBy({
            by: ['vendorId'],
            where: { tenantId, invoiceDate: { gte: startOfPreviousMonth, lte: endOfPreviousMonth } },
            _sum: { normalizedAmount: true },
        });
        let maxChange = 0;
        let topVendorId = '';
        for (const current of currentByVendor) {
            const previous = previousByVendor.find((p) => p.vendorId === current.vendorId);
            const currentAmount = this.toNumber(current._sum.normalizedAmount);
            const previousAmount = previous ? this.toNumber(previous._sum.normalizedAmount) : 0;
            const change = currentAmount - previousAmount;
            if (current.vendorId && Math.abs(change) > Math.abs(maxChange)) {
                maxChange = change;
                topVendorId = current.vendorId;
            }
        }
        if (!topVendorId)
            return null;
        const vendor = await this.prisma.vendor.findUnique({ where: { id: topVendorId } });
        return {
            name: vendor?.name || 'Unknown',
            change: Math.round(maxChange * 100) / 100,
        };
    }
    async computeRecurringChargesMetrics(tenantId) {
        const invoices = await this.prisma.invoice.findMany({
            where: { tenantId },
            include: { vendor: { select: { name: true } } },
            orderBy: { invoiceDate: 'desc' },
        });
        const patterns = new Map();
        for (const invoice of invoices) {
            const amount = Math.round(this.toNumber(invoice.originalAmount) * 100) / 100;
            const key = `${invoice.vendorId}-${amount}`;
            if (patterns.has(key)) {
                patterns.get(key).count++;
            }
            else {
                patterns.set(key, {
                    vendor: invoice.vendor?.name || 'Unassigned',
                    amount,
                    count: 1,
                });
            }
        }
        const detected = Array.from(patterns.values())
            .filter((p) => p.count >= 3)
            .map((p) => ({
            vendor: p.vendor,
            amount: p.amount,
            frequency: 'monthly',
            confidence: Math.min(0.95, 0.7 + (p.count * 0.05)),
        }))
            .slice(0, 5);
        return { detected };
    }
    async computeAnomaliesMetrics(tenantId) {
        const items = [];
        const invoices = await this.prisma.invoice.findMany({
            where: { tenantId },
            include: { vendor: { select: { name: true } } },
        });
        const duplicateMap = new Map();
        for (const invoice of invoices) {
            const dateStr = invoice.invoiceDate.toISOString().split('T')[0];
            const amount = Math.round(this.toNumber(invoice.originalAmount) * 100) / 100;
            const key = `${invoice.vendorId}-${amount}-${dateStr}`;
            if (duplicateMap.has(key)) {
                duplicateMap.get(key).push(invoice.id);
            }
            else {
                duplicateMap.set(key, [invoice.id]);
            }
        }
        for (const [key, ids] of duplicateMap.entries()) {
            if (ids.length > 1) {
                const invoice = invoices.find((i) => i.id === ids[0]);
                items.push({
                    category: 'duplicate',
                    invoiceIds: ids,
                    vendor: invoice?.vendor?.name || 'Unassigned',
                    amount: invoice?.originalAmount ? this.toNumber(invoice.originalAmount) : 0,
                    action: 'Review for potential double-charge',
                });
            }
        }
        const vendorAverages = await this.prisma.invoice.groupBy({
            by: ['vendorId'],
            where: { tenantId },
            _avg: { normalizedAmount: true },
        });
        for (const invoice of invoices) {
            const avg = vendorAverages.find((v) => v.vendorId === invoice.vendorId);
            const avgAmount = avg ? this.toNumber(avg._avg.normalizedAmount) : 0;
            const invoiceAmount = this.toNumber(invoice.normalizedAmount);
            if (avgAmount > 0 && invoiceAmount > avgAmount * 3) {
                items.push({
                    category: 'spike',
                    invoiceIds: [invoice.id],
                    vendor: invoice.vendor?.name || 'Unassigned',
                    amount: invoiceAmount,
                    expectedAmount: Math.round(avgAmount * 100) / 100,
                    action: 'Unusually high - verify this purchase',
                });
            }
        }
        return { items: items.slice(0, 10) };
    }
    async generateNarrative(type, metrics) {
        const prompt = `You are a financial analyst. Given the following SQL-computed metrics, generate a brief narrative summary.
DO NOT recalculate any numbers - use the exact values provided.

Insight Type: ${type}
Metrics: ${JSON.stringify(metrics, null, 2)}

Generate a 2-3 sentence insight explaining these patterns and suggesting one actionable recommendation.
Return ONLY the narrative text, no JSON or formatting.`;
        try {
            const response = await this.ollamaService.generate(prompt);
            return response.trim();
        }
        catch (error) {
            return this.getFallbackNarrative(type, metrics);
        }
    }
    getFallbackNarrative(type, metrics) {
        switch (type) {
            case insight_dto_1.InsightType.MONTHLY_NARRATIVE:
                const change = metrics.changePercent > 0 ? 'increased' : 'decreased';
                return `Your spending ${change} by ${Math.abs(metrics.changePercent).toFixed(1)}% compared to last month.`;
            case insight_dto_1.InsightType.RECURRING_CHARGES:
                return `Detected ${metrics.detected.length} recurring charges in your spending history.`;
            case insight_dto_1.InsightType.ANOMALIES:
                return `Found ${metrics.items.length} potential anomalies that may require your attention.`;
            default:
                return 'Insight generated based on your spending data.';
        }
    }
};
exports.InsightsService = InsightsService;
exports.InsightsService = InsightsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ollama_service_1.OllamaService])
], InsightsService);
//# sourceMappingURL=insights.service.js.map