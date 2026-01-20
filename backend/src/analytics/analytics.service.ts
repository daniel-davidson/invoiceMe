import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { VendorAnalyticsDto, OverallAnalyticsDto } from './dto/analytics-response.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  private toNumber(value: Decimal | null): number {
    return value ? Number(value) : 0;
  }

  private getMonthLabels(): string[] {
    const labels: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    }
    return labels;
  }

  private getMonthRanges(): { start: Date; end: Date }[] {
    const ranges: { start: Date; end: Date }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      ranges.push({ start, end });
    }
    return ranges;
  }

  async getVendorAnalytics(tenantId: string, vendorId: string): Promise<VendorAnalyticsDto> {
    const startTime = Date.now();
    
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, tenantId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // DEBUG: Log all invoices for this vendor
    const allInvoices = await this.prisma.invoice.findMany({
      where: { tenantId, vendorId },
      select: {
        id: true,
        invoiceDate: true,
        originalAmount: true,
        originalCurrency: true,
        normalizedAmount: true,
        fxRate: true,
        needsReview: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });
    this.logger.log(`[DEBUG] Found ${allInvoices.length} invoices for vendor ${vendorId}:`);
    allInvoices.forEach((inv, i) => {
      this.logger.log(`  [${i}] ${inv.invoiceDate.toISOString().split('T')[0]} - Original: ${inv.originalAmount} ${inv.originalCurrency}, Normalized: ${inv.normalizedAmount}, FxRate: ${inv.fxRate}, NeedsReview: ${inv.needsReview}`);
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    
    // DEBUG: Log date ranges being queried
    this.logger.log(`[DEBUG] Date ranges for analytics:`);
    this.logger.log(`  Current month: ${startOfMonth.toISOString().split('T')[0]} to now`);
    this.logger.log(`  Last 12 months: ${twelveMonthsAgo.toISOString().split('T')[0]} to now`);
    this.logger.log(`  Year to date: ${startOfYear.toISOString().split('T')[0]} to now`);

    // Current month spend
    const currentMonthResult = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        vendorId,
        invoiceDate: { gte: startOfMonth },
      },
      _sum: { normalizedAmount: true, originalAmount: true },
    });
    // Fallback to originalAmount if normalizedAmount is null (FX conversion failed)
    const currentMonthSpend = this.toNumber(currentMonthResult._sum.normalizedAmount) 
      || this.toNumber(currentMonthResult._sum.originalAmount);

    // Monthly average (last 12 months)
    const last12MonthsResult = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        vendorId,
        invoiceDate: { gte: twelveMonthsAgo },
      },
      _sum: { normalizedAmount: true, originalAmount: true },
    });
    const total12Months = this.toNumber(last12MonthsResult._sum.normalizedAmount) 
      || this.toNumber(last12MonthsResult._sum.originalAmount);
    const monthlyAverage = total12Months / 12;

    // Yearly average
    const yearlyResult = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        vendorId,
        invoiceDate: { gte: startOfYear },
      },
      _sum: { normalizedAmount: true, originalAmount: true },
    });
    const yearlyAverage = this.toNumber(yearlyResult._sum.normalizedAmount) 
      || this.toNumber(yearlyResult._sum.originalAmount);

    const monthlyLimit = vendor.monthlyLimit ? Number(vendor.monthlyLimit) : null;
    const limitUtilization = monthlyLimit ? (currentMonthSpend / monthlyLimit) * 100 : null;

    // Line chart data
    const monthRanges = this.getMonthRanges();
    const monthlyData: number[] = [];

    for (const range of monthRanges) {
      const result = await this.prisma.invoice.aggregate({
        where: {
          tenantId,
          vendorId,
          invoiceDate: { gte: range.start, lte: range.end },
        },
        _sum: { normalizedAmount: true, originalAmount: true },
      });
      const amount = this.toNumber(result._sum.normalizedAmount) 
        || this.toNumber(result._sum.originalAmount);
      monthlyData.push(amount);
    }

    const duration = Date.now() - startTime;
    this.logger.log(`[AnalyticsService] Vendor analytics query took ${duration}ms`);

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

  async getOverallAnalytics(tenantId: string): Promise<OverallAnalyticsDto> {
    const startTime = Date.now();
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Total spend current month
    const totalSpendResult = await this.prisma.invoice.aggregate({
      where: { tenantId, invoiceDate: { gte: startOfMonth } },
      _sum: { normalizedAmount: true, originalAmount: true },
    });
    const totalSpend = this.toNumber(totalSpendResult._sum.normalizedAmount) 
      || this.toNumber(totalSpendResult._sum.originalAmount);

    // Total limits
    const limitsResult = await this.prisma.vendor.aggregate({
      where: { tenantId, monthlyLimit: { not: null } },
      _sum: { monthlyLimit: true },
    });
    const totalLimits = this.toNumber(limitsResult._sum.monthlyLimit);

    // Counts
    const [vendorCount, invoiceCount] = await Promise.all([
      this.prisma.vendor.count({ where: { tenantId } }),
      this.prisma.invoice.count({ where: { tenantId } }),
    ]);

    // Top 5 vendors by spend
    const topVendors = await this.prisma.invoice.groupBy({
      by: ['vendorId'],
      where: { tenantId },
      _sum: { normalizedAmount: true, originalAmount: true },
      orderBy: { _sum: { normalizedAmount: 'desc' } },
      take: 5,
    });

    const vendorIds = topVendors.map((v) => v.vendorId);
    const vendors = await this.prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
    });

    const totalAllSpend = topVendors.reduce(
      (sum, v) => sum + (this.toNumber(v._sum.normalizedAmount) || this.toNumber(v._sum.originalAmount)),
      0,
    );

    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    const segments = topVendors.map((v, i) => {
      const vendor = vendors.find((vn) => vn.id === v.vendorId);
      const value = this.toNumber(v._sum.normalizedAmount) || this.toNumber(v._sum.originalAmount);
      return {
        label: vendor?.name || 'Unknown',
        value,
        percentage: totalAllSpend > 0 ? (value / totalAllSpend) * 100 : 0,
        color: colors[i] || '#6B7280',
      };
    });

    // Line chart data
    const monthRanges = this.getMonthRanges();
    const monthlyData: number[] = [];

    for (const range of monthRanges) {
      const result = await this.prisma.invoice.aggregate({
        where: {
          tenantId,
          invoiceDate: { gte: range.start, lte: range.end },
        },
        _sum: { normalizedAmount: true, originalAmount: true },
      });
      const amount = this.toNumber(result._sum.normalizedAmount) 
        || this.toNumber(result._sum.originalAmount);
      monthlyData.push(amount);
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

  async updateVendorLimit(tenantId: string, vendorId: string, monthlyLimit: number | null) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, tenantId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: { monthlyLimit },
    });
  }

  /**
   * Export vendor analytics as CSV
   */
  async exportVendorCsv(tenantId: string, vendorId: string): Promise<string> {
    const analytics = await this.getVendorAnalytics(tenantId, vendorId);
    
    // CSV header
    let csv = 'Month,Spend,Monthly Limit,Utilization %\n';
    
    // CSV rows (combine labels and data)
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

  /**
   * Export overall analytics as CSV
   */
  async exportOverallCsv(tenantId: string): Promise<string> {
    const analytics = await this.getOverallAnalytics(tenantId);
    
    // Get detailed vendor data
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

    // Aggregate spend per vendor
    const vendorSpends = await Promise.all(
      vendors.map(async (vendor) => {
        const result = await this.prisma.invoice.aggregate({
          where: { tenantId, vendorId: vendor.id },
          _sum: { normalizedAmount: true, originalAmount: true },
        });
        const totalSpend = this.toNumber(result._sum.normalizedAmount) 
          || this.toNumber(result._sum.originalAmount);
        return {
          name: vendor.name,
          totalSpend,
          invoiceCount: vendor._count.invoices,
          monthlyLimit: vendor.monthlyLimit ? Number(vendor.monthlyLimit) : null,
          latestInvoice: vendor.invoices[0]?.invoiceDate || null,
        };
      }),
    );

    // CSV header
    let csv = 'Business,Total Spend,Invoice Count,Monthly Limit,Latest Invoice\n';
    
    // CSV rows (sorted by spend descending)
    vendorSpends
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .forEach((v) => {
        const latestDate = v.latestInvoice ? v.latestInvoice.toISOString().split('T')[0] : '';
        csv += `"${v.name}",${v.totalSpend.toFixed(2)},${v.invoiceCount},${v.monthlyLimit?.toFixed(2) || ''},${latestDate}\n`;
      });
    
    return csv;
  }
}
