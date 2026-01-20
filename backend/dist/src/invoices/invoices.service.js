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
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const extraction_service_1 = require("../extraction/extraction.service");
const storage_service_1 = require("../storage/storage.service");
let InvoicesService = class InvoicesService {
    prisma;
    extractionService;
    storageService;
    constructor(prisma, extractionService, storageService) {
        this.prisma = prisma;
        this.extractionService = extractionService;
        this.storageService = storageService;
    }
    async upload(tenantId, file, vendorId) {
        const user = await this.prisma.user.findUnique({
            where: { id: tenantId },
            select: { systemCurrency: true },
        });
        const systemCurrency = user?.systemCurrency || 'USD';
        const result = await this.extractionService.processInvoice(file.buffer, file.originalname, file.mimetype, tenantId, systemCurrency);
        if (vendorId && vendorId !== result.vendor.id) {
            await this.prisma.invoice.update({
                where: { id: result.invoice.id },
                data: { vendorId },
            });
            result.invoice.vendorId = vendorId;
        }
        return result;
    }
    async findAll(tenantId, query) {
        const { vendorId, search, startDate, endDate, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (vendorId) {
            where.vendorId = vendorId;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { vendor: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (startDate || endDate) {
            where.invoiceDate = {};
            if (startDate)
                where.invoiceDate.gte = new Date(startDate);
            if (endDate)
                where.invoiceDate.lte = new Date(endDate);
        }
        const [invoices, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where,
                include: { vendor: { select: { id: true, name: true } } },
                orderBy: { invoiceDate: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.invoice.count({ where }),
        ]);
        return {
            data: invoices,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(tenantId, id) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id, tenantId },
            include: {
                vendor: { select: { id: true, name: true } },
                extractionRuns: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        return invoice;
    }
    async update(tenantId, id, dto) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id, tenantId },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        return this.prisma.invoice.update({
            where: { id },
            data: {
                name: dto.name,
                originalAmount: dto.originalAmount,
                originalCurrency: dto.originalCurrency,
                invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
                vendorId: dto.vendorId,
            },
            include: { vendor: { select: { id: true, name: true } } },
        });
    }
    async remove(tenantId, id) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id, tenantId },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        await this.storageService.deleteFile(invoice.fileUrl);
        await this.prisma.invoice.delete({ where: { id } });
        return { deletedInvoiceId: id };
    }
    async getFile(tenantId, id) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id, tenantId },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        return this.storageService.getFile(invoice.fileUrl);
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        extraction_service_1.ExtractionService,
        storage_service_1.StorageService])
], InvoicesService);
//# sourceMappingURL=invoices.service.js.map