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
exports.ExportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const csv_writer_1 = require("csv-writer");
let ExportService = class ExportService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async exportInvoices(tenantId, vendorId, startDate, endDate) {
        const where = { tenantId };
        if (vendorId) {
            where.vendorId = vendorId;
        }
        if (startDate || endDate) {
            where.invoiceDate = {};
            if (startDate)
                where.invoiceDate.gte = new Date(startDate);
            if (endDate)
                where.invoiceDate.lte = new Date(endDate);
        }
        const invoices = await this.prisma.invoice.findMany({
            where,
            include: { vendor: { select: { name: true } } },
            orderBy: { invoiceDate: 'desc' },
        });
        const csvStringifier = (0, csv_writer_1.createObjectCsvStringifier)({
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
            vendorName: invoice.vendor?.name || 'Unassigned',
            name: invoice.name || '',
            originalAmount: Number(invoice.originalAmount).toFixed(2),
            originalCurrency: invoice.originalCurrency,
            normalizedAmount: invoice.normalizedAmount
                ? Number(invoice.normalizedAmount).toFixed(2)
                : '',
            invoiceNumber: invoice.invoiceNumber || '',
        }));
        return (csvStringifier.getHeaderString() +
            csvStringifier.stringifyRecords(records));
    }
    async exportAnalytics(tenantId, vendorId, year) {
        const targetYear = year || new Date().getFullYear();
        const startOfYear = new Date(targetYear, 0, 1);
        const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);
        const where = {
            tenantId,
            invoiceDate: { gte: startOfYear, lte: endOfYear },
        };
        if (vendorId) {
            where.vendorId = vendorId;
        }
        const invoices = await this.prisma.invoice.findMany({
            where,
            include: { vendor: { select: { name: true } } },
        });
        const monthlyData = new Map();
        for (const invoice of invoices) {
            const month = invoice.invoiceDate.toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
            });
            const vendorName = invoice.vendor?.name || 'Unassigned';
            const key = `${month}-${vendorName}`;
            const amount = Number(invoice.normalizedAmount || invoice.originalAmount);
            if (monthlyData.has(key)) {
                monthlyData.get(key).total += amount;
            }
            else {
                monthlyData.set(key, { month, vendor: vendorName, total: amount });
            }
        }
        const csvStringifier = (0, csv_writer_1.createObjectCsvStringifier)({
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
        return (csvStringifier.getHeaderString() +
            csvStringifier.stringifyRecords(records));
    }
};
exports.ExportService = ExportService;
exports.ExportService = ExportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExportService);
//# sourceMappingURL=export.service.js.map