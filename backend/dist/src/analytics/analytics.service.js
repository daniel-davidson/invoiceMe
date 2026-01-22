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
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const currency_service_1 = require("../currency/currency.service");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    prisma;
    currencyService;
    logger = new common_1.Logger(AnalyticsService_1.name);
    constructor(prisma, currencyService) {
        this.prisma = prisma;
        this.currencyService = currencyService;
    }
    toNumber(value) {
        return value ? Number(value) : 0;
    }
    async convertToUserCurrency(amount, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency || amount === 0) {
            return amount;
        }
        try {
            const result = await this.currencyService.convert(amount, fromCurrency, toCurrency);
            return result.normalizedAmount;
        }
        catch (error) {
            this.logger.warn(`Currency conversion failed from ${fromCurrency} to ${toCurrency}: ${error}`);
            return amount;
        }
    }
    async getUserCurrency(tenantId) {
        const user = await this.prisma.user.findUnique({
            where: { id: tenantId },
            select: { systemCurrency: true },
        });
        return user?.systemCurrency || 'USD';
    }
    getMonthLabels(referenceDate) {
        const labels = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        }
        return labels;
    }
    getMonthRanges(referenceDate) {
        const ranges = [];
        for (let i = 11; i >= 0; i--) {
            const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
            const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i + 1, 0, 23, 59, 59);
            ranges.push({ start, end });
        }
        return ranges;
    }
    async getAvailablePeriods(tenantId, vendorId) {
        const invoices = await this.prisma.invoice.findMany({
            where: { tenantId, vendorId },
            select: { invoiceDate: true },
            orderBy: { invoiceDate: 'desc' },
        });
        if (invoices.length === 0) {
            return {
                periods: [],
                latestPeriod: null,
            };
        }
        const periodsSet = new Set();
        invoices.forEach((inv) => {
            const year = inv.invoiceDate.getFullYear();
            const month = inv.invoiceDate.getMonth() + 1;
            periodsSet.add(`${year}-${month}`);
        });
        const periods = Array.from(periodsSet)
            .map((p) => {
            const [year, month] = p.split('-').map(Number);
            return { year, month };
        })
            .sort((a, b) => {
            if (a.year !== b.year)
                return b.year - a.year;
            return b.month - a.month;
        });
        return {
            periods,
            latestPeriod: periods[0] || null,
        };
    }
    async getVendorAnalytics(tenantId, vendorId, year, month) {
        const startTime = Date.now();
        const vendor = await this.prisma.vendor.findFirst({
            where: { id: vendorId, tenantId },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor not found');
        }
        const userCurrency = await this.getUserCurrency(tenantId);
        let referenceDate;
        if (year && month) {
            referenceDate = new Date(year, month - 1, 1);
        }
        else if (year) {
            const latestInYear = await this.prisma.invoice.findFirst({
                where: {
                    tenantId,
                    vendorId,
                    invoiceDate: {
                        gte: new Date(year, 0, 1),
                        lt: new Date(year + 1, 0, 1),
                    },
                },
                orderBy: { invoiceDate: 'desc' },
                select: { invoiceDate: true },
            });
            referenceDate = latestInYear?.invoiceDate || new Date(year, 0, 1);
        }
        else {
            referenceDate = new Date();
        }
        const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
        const startOfYear = new Date(referenceDate.getFullYear(), 0, 1);
        const twelveMonthsAgo = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 11, 1);
        const currentMonthInvoices = await this.prisma.invoice.findMany({
            where: {
                tenantId,
                vendorId,
                invoiceDate: { gte: startOfMonth },
            },
            select: {
                originalAmount: true,
                originalCurrency: true,
            },
        });
        let currentMonthSpend = 0;
        for (const invoice of currentMonthInvoices) {
            const amount = this.toNumber(invoice.originalAmount);
            const currency = invoice.originalCurrency;
            const converted = await this.convertToUserCurrency(amount, currency, userCurrency);
            currentMonthSpend += converted;
        }
        const last12MonthsInvoices = await this.prisma.invoice.findMany({
            where: {
                tenantId,
                vendorId,
                invoiceDate: { gte: twelveMonthsAgo },
            },
            select: {
                originalAmount: true,
                originalCurrency: true,
            },
        });
        let total12Months = 0;
        for (const invoice of last12MonthsInvoices) {
            const amount = this.toNumber(invoice.originalAmount);
            const currency = invoice.originalCurrency;
            const converted = await this.convertToUserCurrency(amount, currency, userCurrency);
            total12Months += converted;
        }
        const monthlyAverage = total12Months / 12;
        const yearlyInvoices = await this.prisma.invoice.findMany({
            where: {
                tenantId,
                vendorId,
                invoiceDate: { gte: startOfYear },
            },
            select: {
                originalAmount: true,
                originalCurrency: true,
            },
        });
        let yearlyAverage = 0;
        for (const invoice of yearlyInvoices) {
            const amount = this.toNumber(invoice.originalAmount);
            const currency = invoice.originalCurrency;
            const converted = await this.convertToUserCurrency(amount, currency, userCurrency);
            yearlyAverage += converted;
        }
        const monthlyLimit = vendor.monthlyLimit
            ? Number(vendor.monthlyLimit)
            : null;
        const limitUtilization = monthlyLimit
            ? (currentMonthSpend / monthlyLimit) * 100
            : null;
        const monthRanges = this.getMonthRanges(referenceDate);
        const monthlyData = [];
        for (const range of monthRanges) {
            const invoices = await this.prisma.invoice.findMany({
                where: {
                    tenantId,
                    vendorId,
                    invoiceDate: { gte: range.start, lte: range.end },
                },
                select: {
                    originalAmount: true,
                    originalCurrency: true,
                },
            });
            let monthTotal = 0;
            for (const invoice of invoices) {
                const amount = this.toNumber(invoice.originalAmount);
                const currency = invoice.originalCurrency;
                const converted = await this.convertToUserCurrency(amount, currency, userCurrency);
                monthTotal += converted;
            }
            monthlyData.push(monthTotal);
        }
        const duration = Date.now() - startTime;
        this.logger.log(`[AnalyticsService] Vendor analytics query took ${duration}ms`);
        return {
            vendorId,
            vendorName: vendor.name,
            selectedPeriod: {
                year: referenceDate.getFullYear(),
                month: referenceDate.getMonth() + 1,
            },
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
                labels: this.getMonthLabels(referenceDate),
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
        const startTime = Date.now();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const userCurrency = await this.getUserCurrency(tenantId);
        const currentMonthInvoices = await this.prisma.invoice.findMany({
            where: { tenantId, invoiceDate: { gte: startOfMonth } },
            select: {
                originalAmount: true,
                originalCurrency: true,
                vendorId: true,
            },
        });
        let totalSpend = 0;
        for (const invoice of currentMonthInvoices) {
            const amount = this.toNumber(invoice.originalAmount);
            const currency = invoice.originalCurrency;
            const converted = await this.convertToUserCurrency(amount, currency, userCurrency);
            totalSpend += converted;
        }
        const limitsResult = await this.prisma.vendor.aggregate({
            where: { tenantId },
            _sum: { monthlyLimit: true },
        });
        const totalLimits = this.toNumber(limitsResult._sum?.monthlyLimit);
        const [vendorCount, invoiceCount] = await Promise.all([
            this.prisma.vendor.count({ where: { tenantId } }),
            this.prisma.invoice.count({ where: { tenantId } }),
        ]);
        const allInvoices = await this.prisma.invoice.findMany({
            where: { tenantId },
            select: {
                vendorId: true,
                originalAmount: true,
                originalCurrency: true,
            },
        });
        const vendorSpendMap = new Map();
        for (const invoice of allInvoices) {
            if (!invoice.vendorId)
                continue;
            const amount = this.toNumber(invoice.originalAmount);
            const currency = invoice.originalCurrency;
            const converted = await this.convertToUserCurrency(amount, currency, userCurrency);
            const currentTotal = vendorSpendMap.get(invoice.vendorId) || 0;
            vendorSpendMap.set(invoice.vendorId, currentTotal + converted);
        }
        const sortedVendors = Array.from(vendorSpendMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        const vendorIds = sortedVendors.map(([vendorId]) => vendorId);
        const vendors = await this.prisma.vendor.findMany({
            where: { id: { in: vendorIds } },
        });
        const totalAllSpend = sortedVendors.reduce((sum, [, spend]) => sum + spend, 0);
        const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        const segments = sortedVendors.map(([vendorId, value], i) => {
            const vendor = vendors.find((v) => v.id === vendorId);
            return {
                label: vendor?.name || 'Unknown',
                value,
                percentage: totalAllSpend > 0 ? (value / totalAllSpend) * 100 : 0,
                color: colors[i] || '#6B7280',
            };
        });
        const monthRanges = this.getMonthRanges(now);
        const monthlyData = [];
        for (const range of monthRanges) {
            const invoices = await this.prisma.invoice.findMany({
                where: {
                    tenantId,
                    invoiceDate: { gte: range.start, lte: range.end },
                },
                select: {
                    originalAmount: true,
                    originalCurrency: true,
                },
            });
            let monthTotal = 0;
            for (const invoice of invoices) {
                const amount = this.toNumber(invoice.originalAmount);
                const currency = invoice.originalCurrency;
                const converted = await this.convertToUserCurrency(amount, currency, userCurrency);
                monthTotal += converted;
            }
            monthlyData.push(monthTotal);
        }
        const duration = Date.now() - startTime;
        this.logger.log(`[AnalyticsService] Overall analytics query took ${duration}ms`);
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
                labels: this.getMonthLabels(now),
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
        if (monthlyLimit <= 0) {
            throw new common_1.NotFoundException('Monthly limit must be greater than 0');
        }
        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: { monthlyLimit },
        });
    }
    async exportVendorCsv(tenantId, vendorId) {
        const analytics = await this.getVendorAnalytics(tenantId, vendorId);
        let csv = 'Month,Spend,Monthly Limit,Utilization %\n';
        const labels = analytics.lineChart.labels;
        const data = analytics.lineChart.datasets[0].data;
        for (let i = 0; i < labels.length; i++) {
            const month = labels[i];
            const spend = data[i].toFixed(2);
            const limit = analytics.kpis.monthlyLimit?.toFixed(2) || '';
            const utilization = analytics.kpis.monthlyLimit
                ? ((data[i] / analytics.kpis.monthlyLimit) * 100).toFixed(1)
                : '';
            csv += `${month},${spend},${limit},${utilization}\n`;
        }
        return csv;
    }
    async exportOverallCsv(tenantId) {
        const vendors = await this.prisma.vendor.findMany({
            where: { tenantId },
            include: {
                _count: { select: { invoices: true } },
                invoices: {
                    orderBy: { invoiceDate: 'desc' },
                    take: 1,
                    select: { invoiceDate: true, originalAmount: true },
                },
            },
        });
        const vendorSpends = await Promise.all(vendors.map(async (vendor) => {
            const result = await this.prisma.invoice.aggregate({
                where: { tenantId, vendorId: vendor.id },
                _sum: { normalizedAmount: true, originalAmount: true },
            });
            const totalSpend = this.toNumber(result._sum.normalizedAmount) ||
                this.toNumber(result._sum.originalAmount);
            return {
                name: vendor.name,
                totalSpend,
                invoiceCount: vendor._count.invoices,
                monthlyLimit: vendor.monthlyLimit
                    ? Number(vendor.monthlyLimit)
                    : null,
                latestInvoice: vendor.invoices[0]?.invoiceDate || null,
            };
        }));
        let csv = 'Business,Total Spend,Invoice Count,Monthly Limit,Latest Invoice\n';
        vendorSpends
            .sort((a, b) => b.totalSpend - a.totalSpend)
            .forEach((v) => {
            const latestDate = v.latestInvoice
                ? v.latestInvoice.toISOString().split('T')[0]
                : '';
            csv += `"${v.name}",${v.totalSpend.toFixed(2)},${v.invoiceCount},${v.monthlyLimit?.toFixed(2) || ''},${latestDate}\n`;
        });
        return csv;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        currency_service_1.CurrencyService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map