import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from '../extraction/llm/ollama.service';
import { InsightType } from './dto/insight.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InsightsService {
  constructor(
    private prisma: PrismaService,
    private ollamaService: OllamaService,
  ) {}

  private toNumber(value: Decimal | null): number {
    return value ? Number(value) : 0;
  }

  async findAll(tenantId: string, type?: InsightType, limit = 10) {
    return this.prisma.insight.findMany({
      where: {
        tenantId,
        ...(type ? { insightType: type } : {}),
      },
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });
  }

  async findOne(tenantId: string, id: string) {
    const insight = await this.prisma.insight.findFirst({
      where: { id, tenantId },
    });

    if (!insight) {
      throw new NotFoundException('Insight not found');
    }

    return insight;
  }

  async remove(tenantId: string, id: string) {
    const insight = await this.prisma.insight.findFirst({
      where: { id, tenantId },
    });

    if (!insight) {
      throw new NotFoundException('Insight not found');
    }

    await this.prisma.insight.delete({ where: { id } });

    return { deleted: true };
  }

  async generate(tenantId: string, types?: InsightType[]) {
    const typesToGenerate = types || [
      InsightType.MONTHLY_NARRATIVE,
      InsightType.RECURRING_CHARGES,
      InsightType.ANOMALIES,
    ];

    const startTime = Date.now();
    const insights: any[] = [];

    for (const type of typesToGenerate) {
      try {
        const insight = await this.generateInsight(tenantId, type);
        if (insight) {
          insights.push(insight);
        }
      } catch (error) {
        console.error(`Failed to generate ${type} insight:`, error);
      }
    }

    return {
      generated: insights,
      processingTimeMs: Date.now() - startTime,
    };
  }

  private async generateInsight(tenantId: string, type: InsightType) {
    let metrics: any;
    let title: string;

    switch (type) {
      case InsightType.MONTHLY_NARRATIVE:
        metrics = await this.computeMonthlyNarrativeMetrics(tenantId);
        title = `${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Spending Summary`;
        break;
      case InsightType.RECURRING_CHARGES:
        metrics = await this.computeRecurringChargesMetrics(tenantId);
        title = 'Recurring Charges Detected';
        break;
      case InsightType.ANOMALIES:
        metrics = await this.computeAnomaliesMetrics(tenantId);
        title = 'Spending Anomalies';
        break;
    }

    if (
      !metrics ||
      (Array.isArray(metrics.detected) && metrics.detected.length === 0) ||
      (Array.isArray(metrics.items) && metrics.items.length === 0)
    ) {
      return null;
    }

    // Generate narrative using LLM
    const narrative = await this.generateNarrative(type, metrics);

    // Store insight
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

  private async computeMonthlyNarrativeMetrics(tenantId: string) {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const endOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    const [currentResult, previousResult] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { tenantId, invoiceDate: { gte: startOfCurrentMonth } },
        _sum: { normalizedAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          invoiceDate: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
        },
        _sum: { normalizedAmount: true },
      }),
    ]);

    const currentMonthSpend = this.toNumber(
      currentResult._sum.normalizedAmount,
    );
    const previousMonthSpend = this.toNumber(
      previousResult._sum.normalizedAmount,
    );
    const changePercent =
      previousMonthSpend > 0
        ? ((currentMonthSpend - previousMonthSpend) / previousMonthSpend) * 100
        : 0;

    // Find top vendor change
    const topVendorChange = await this.findTopVendorChange(
      tenantId,
      startOfCurrentMonth,
      startOfPreviousMonth,
      endOfPreviousMonth,
    );

    return {
      currentMonthSpend,
      previousMonthSpend,
      changePercent: Math.round(changePercent * 100) / 100,
      topVendorChange,
    };
  }

  private async findTopVendorChange(
    tenantId: string,
    startOfCurrentMonth: Date,
    startOfPreviousMonth: Date,
    endOfPreviousMonth: Date,
  ) {
    const currentByVendor = await this.prisma.invoice.groupBy({
      by: ['vendorId'],
      where: { tenantId, invoiceDate: { gte: startOfCurrentMonth } },
      _sum: { normalizedAmount: true },
    });

    const previousByVendor = await this.prisma.invoice.groupBy({
      by: ['vendorId'],
      where: {
        tenantId,
        invoiceDate: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
      },
      _sum: { normalizedAmount: true },
    });

    let maxChange = 0;
    let topVendorId = '';

    for (const current of currentByVendor) {
      const previous = previousByVendor.find(
        (p) => p.vendorId === current.vendorId,
      );
      const currentAmount = this.toNumber(current._sum.normalizedAmount);
      const previousAmount = previous
        ? this.toNumber(previous._sum.normalizedAmount)
        : 0;
      const change = currentAmount - previousAmount;

      if (current.vendorId && Math.abs(change) > Math.abs(maxChange)) {
        maxChange = change;
        topVendorId = current.vendorId;
      }
    }

    if (!topVendorId) return null;

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: topVendorId },
    });

    return {
      name: vendor?.name || 'Unknown',
      change: Math.round(maxChange * 100) / 100,
    };
  }

  private async computeRecurringChargesMetrics(tenantId: string) {
    // Find patterns: same vendor + similar amount appearing 3+ times
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId },
      include: { vendor: { select: { name: true } } },
      orderBy: { invoiceDate: 'desc' },
    });

    const patterns: Map<
      string,
      { vendor: string; amount: number; count: number }
    > = new Map();

    for (const invoice of invoices) {
      const amount =
        Math.round(this.toNumber(invoice.originalAmount) * 100) / 100;
      const key = `${invoice.vendorId}-${amount}`;

      if (patterns.has(key)) {
        patterns.get(key)!.count++;
      } else {
        patterns.set(key, {
          vendor: invoice.vendor?.name || 'Unassigned', // v2.0: vendor can be null
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
        confidence: Math.min(0.95, 0.7 + p.count * 0.05),
      }))
      .slice(0, 5);

    return { detected };
  }

  private async computeAnomaliesMetrics(tenantId: string) {
    const items: any[] = [];

    // Find duplicates (same vendor + amount + date)
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId },
      include: { vendor: { select: { name: true } } },
    });

    const duplicateMap: Map<string, string[]> = new Map();

    for (const invoice of invoices) {
      const dateStr = invoice.invoiceDate.toISOString().split('T')[0];
      const amount =
        Math.round(this.toNumber(invoice.originalAmount) * 100) / 100;
      const key = `${invoice.vendorId}-${amount}-${dateStr}`;

      if (duplicateMap.has(key)) {
        duplicateMap.get(key)!.push(invoice.id);
      } else {
        duplicateMap.set(key, [invoice.id]);
      }
    }

    for (const [key, ids] of duplicateMap.entries()) {
      if (ids.length > 1) {
        const invoice = invoices.find((i) => i.id === ids[0]);
        items.push({
          category: 'duplicate',
          invoiceIds: ids,
          vendor: invoice?.vendor?.name || 'Unassigned', // v2.0: vendor can be null
          amount: invoice?.originalAmount
            ? this.toNumber(invoice.originalAmount)
            : 0,
          action: 'Review for potential double-charge',
        });
      }
    }

    // Find spikes (amount > 3x average for vendor)
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
          vendor: invoice.vendor?.name || 'Unassigned', // v2.0: vendor can be null
          amount: invoiceAmount,
          expectedAmount: Math.round(avgAmount * 100) / 100,
          action: 'Unusually high - verify this purchase',
        });
      }
    }

    return { items: items.slice(0, 10) };
  }

  private async generateNarrative(
    type: InsightType,
    metrics: any,
  ): Promise<string> {
    const prompt = `You are a financial analyst. Given the following SQL-computed metrics, generate a brief narrative summary.
DO NOT recalculate any numbers - use the exact values provided.

Insight Type: ${type}
Metrics: ${JSON.stringify(metrics, null, 2)}

Generate a 2-3 sentence insight explaining these patterns and suggesting one actionable recommendation.
Return ONLY the narrative text, no JSON or formatting.`;

    try {
      const response = await this.ollamaService.generate(prompt);
      return response.trim();
    } catch (error) {
      // Fallback narrative if LLM fails
      return this.getFallbackNarrative(type, metrics);
    }
  }

  private getFallbackNarrative(type: InsightType, metrics: any): string {
    switch (type) {
      case InsightType.MONTHLY_NARRATIVE:
        const change = metrics.changePercent > 0 ? 'increased' : 'decreased';
        return `Your spending ${change} by ${Math.abs(metrics.changePercent).toFixed(1)}% compared to last month.`;
      case InsightType.RECURRING_CHARGES:
        return `Detected ${metrics.detected.length} recurring charges in your spending history.`;
      case InsightType.ANOMALIES:
        return `Found ${metrics.items.length} potential anomalies that may require your attention.`;
      default:
        return 'Insight generated based on your spending data.';
    }
  }
}
