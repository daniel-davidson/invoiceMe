import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AnalyticsService {
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

  async getVendorAnalytics(tenantId: string, vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, tenantId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Current month spend
    const currentMonthResult = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        vendorId,
        invoiceDate: { gte: startOfMonth },
      },
      _sum: { normalizedAmount: true },
    });
    const currentMonthSpend = this.toNumber(currentMonthResult._sum.normalizedAmount);

    // Monthly average (last 12 months)
    const last12MonthsResult = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        vendorId,
        invoiceDate: { gte: twelveMonthsAgo },
      },
      _sum: { normalizedAmount: true },
    });
    const monthlyAverage = this.toNumber(last12MonthsResult._sum.normalizedAmount) / 12;

    // Yearly average
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

  async getOverallAnalytics(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Total spend current month
    const totalSpendResult = await this.prisma.invoice.aggregate({
      where: { tenantId, invoiceDate: { gte: startOfMonth } },
      _sum: { normalizedAmount: true },
    });
    const totalSpend = this.toNumber(totalSpendResult._sum.normalizedAmount);

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
      _sum: { normalizedAmount: true },
      orderBy: { _sum: { normalizedAmount: 'desc' } },
      take: 5,
    });

    const vendorIds = topVendors.map((v) => v.vendorId);
    const vendors = await this.prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
    });

    const totalAllSpend = topVendors.reduce(
      (sum, v) => sum + this.toNumber(v._sum.normalizedAmount),
      0,
    );

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

    // Line chart data
    const monthRanges = this.getMonthRanges();
    const monthlyData: number[] = [];

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
}
