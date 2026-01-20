import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createObjectCsvStringifier } from 'csv-writer';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async exportInvoices(
    tenantId: string,
    vendorId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<string> {
    const where: any = { tenantId };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate);
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { vendor: { select: { name: true } } },
      orderBy: { invoiceDate: 'desc' },
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'invoiceDate', title: 'Date' },
        { id: 'vendorName', title: 'Vendor' },
        { id: 'name', title: 'Description' },
        { id: 'originalAmount', title: 'Amount' },
        { id: 'originalCurrency', title: 'Currency' },
        { id: 'normalizedAmount', title: 'Normalized Amount' },
        { id: 'invoiceNumber', title: 'Invoice Number' },
      ],
    });

    const records = invoices.map((invoice) => ({
      invoiceDate: invoice.invoiceDate.toISOString().split('T')[0],
      vendorName: invoice.vendor.name,
      name: invoice.name || '',
      originalAmount: Number(invoice.originalAmount).toFixed(2),
      originalCurrency: invoice.originalCurrency,
      normalizedAmount: invoice.normalizedAmount ? Number(invoice.normalizedAmount).toFixed(2) : '',
      invoiceNumber: invoice.invoiceNumber || '',
    }));

    return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
  }

  async exportAnalytics(
    tenantId: string,
    vendorId?: string,
    year?: number,
  ): Promise<string> {
    const targetYear = year || new Date().getFullYear();
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

    const where: any = {
      tenantId,
      invoiceDate: { gte: startOfYear, lte: endOfYear },
    };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    // Get monthly totals
    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { vendor: { select: { name: true } } },
    });

    // Group by month and vendor
    const monthlyData: Map<string, { month: string; vendor: string; total: number }> = new Map();

    for (const invoice of invoices) {
      const month = invoice.invoiceDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const key = `${month}-${invoice.vendor.name}`;
      const amount = Number(invoice.normalizedAmount || invoice.originalAmount);

      if (monthlyData.has(key)) {
        monthlyData.get(key)!.total += amount;
      } else {
        monthlyData.set(key, { month, vendor: invoice.vendor.name, total: amount });
      }
    }

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'month', title: 'Month' },
        { id: 'vendor', title: 'Vendor' },
        { id: 'total', title: 'Total Spend' },
      ],
    });

    const records = Array.from(monthlyData.values()).map((data) => ({
      month: data.month,
      vendor: data.vendor,
      total: data.total.toFixed(2),
    }));

    return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
  }
}
