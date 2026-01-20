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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    toNumber(value) {
        return value ? Number(value) : 0;
    }
    getMonthLabels() {
        const labels = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        }
        return labels;
    }
    getMonthRanges() {
        const ranges = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            ranges.push({ start, end });
        }
        return ranges;
    }
    async getVendorAnalytics(tenantId, vendorId) {
        const vendor = await this.prisma.vendor.findFirst({
            where: { id: vendorId, tenantId },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor not found');
        }
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        const currentMonthResult = await this.prisma.invoice.aggregate({
            where: {
                tenantId,
                vendorId,
                invoiceDate: { gte: startOfMonth },
            },
            _sum: { normalizedAmount: true },
        });
        const currentMonthSpend = this.toNumber(currentMonthResult._sum.normalizedAmount);
        const last12MonthsResult = await this.prisma.invoice.aggregate({
            where: {
                tenantId,
                vendorId,
                invoiceDate: { gte: twelveMonthsAgo },
            },
            _sum: { normalizedAmount: true },
        });
        const monthlyAverage = this.toNumber(last12MonthsResult._sum.normalizedAmount) / 12;
        const yearlyResult = await this.prisma.invoice.aggregate({
            where: {
                tenantId,
                vendorId,
                invoiceDate: { gte: startOfYear },
            },
            _sum: { normalizedAmount: true },
        });
        const yearlyAverage = this.toNumber(yearlyResult._sum.normalizedAmount);
        const monthlyLimit = vendor.monthlyLimit ? Number(vendor.monthlyLimit) : null;
        const limitUtilization = monthlyLimit ? (currentMonthSpend / monthlyLimit) * 100 : null;
        const monthRanges = this.getMonthRanges();
        const monthlyData = [];
        for (const range of monthRanges) {
            const result = await this.prisma.invoice.aggregate({
                where: {
                    tenantId,
                    vendorId,
                    invoiceDate: { gte: range.start, lte: range.end },
                },
                _sum: { normalizedAmount: true },
            });
            monthlyData.push(this.toNumber(result._sum.normalizedAmount));
        }
        return {
            vendorId,
            vendorName: vendor.name,
            kpis: {
                currentMonthSpend,
                monthlyLimit,
                monthlyAverage,
                yearlyAverage,
                limitUtilization,
            },
            pieChart: {
                title: 'Monthly Distribution',
                segments: [],
                otherTotal: 0,
            },
            lineChart: {
                title: 'Monthly Spending',
                labels: this.getMonthLabels(),
                datasets: [
                    {
                        label: 'Spend',
                        data: monthlyData,
                        color: '#4F46E5',
                    },
                ],
            },
        };
    }
    async getOverallAnalytics(tenantId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        const totalSpendResult = await this.prisma.invoice.aggregate({
            where: { tenantId, invoiceDate: { gte: startOfMonth } },
            _sum: { normalizedAmount: true },
        });
        const totalSpend = this.toNumber(totalSpendResult._sum.normalizedAmount);
        const limitsResult = await this.prisma.vendor.aggregate({
            where: { tenantId, monthlyLimit: { not: null } },
            _sum: { monthlyLimit: true },
        });
        const totalLimits = this.toNumber(limitsResult._sum.monthlyLimit);
        const [vendorCount, invoiceCount] = await Promise.all([
            this.prisma.vendor.count({ where: { tenantId } }),
            this.prisma.invoice.count({ where: { tenantId } }),
        ]);
        const topVendors = await this.prisma.invoice.groupBy({
            by: ['vendorId'],
            where: { tenantId },
            _sum: { normalizedAmount: true },
            orderBy: { _sum: { normalizedAmount: 'desc' } },
            take: 5,
        });
        const vendorIds = topVendors.map((v) => v.vendorId);
        const vendors = await this.prisma.vendor.findMany({
            where: { id: { in: vendorIds } },
        });
        const totalAllSpend = topVendors.reduce((sum, v) => sum + this.toNumber(v._sum.normalizedAmount), 0);
        const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        const segments = topVendors.map((v, i) => {
            const vendor = vendors.find((vn) => vn.id === v.vendorId);
            const value = this.toNumber(v._sum.normalizedAmount);
            return {
                label: vendor?.name || 'Unknown',
                value,
                percentage: totalAllSpend > 0 ? (value / totalAllSpend) * 100 : 0,
                color: colors[i] || '#6B7280',
            };
        });
        const monthRanges = this.getMonthRanges();
        const monthlyData = [];
        for (const range of monthRanges) {
            const result = await this.prisma.invoice.aggregate({
                where: {
                    tenantId,
                    invoiceDate: { gte: range.start, lte: range.end },
                },
                _sum: { normalizedAmount: true },
            });
            monthlyData.push(this.toNumber(result._sum.normalizedAmount));
        }
        return {
            kpis: {
                totalSpend,
                totalLimits,
                remainingBalance: totalLimits - totalSpend,
                vendorCount,
                invoiceCount,
            },
            pieChart: {
                title: 'Top 5 Vendors by Spend',
                segments,
                otherTotal: 0,
            },
            lineChart: {
                title: 'Monthly Spending',
                labels: this.getMonthLabels(),
                datasets: [
                    {
                        label: 'Total Spend',
                        data: monthlyData,
                        color: '#4F46E5',
                    },
                ],
            },
        };
    }
    async updateVendorLimit(tenantId, vendorId, monthlyLimit) {
        const vendor = await this.prisma.vendor.findFirst({
            where: { id: vendorId, tenantId },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor not found');
        }
        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: { monthlyLimit },
        });
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map