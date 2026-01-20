"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const extraction_service_1 = require("../extraction/extraction.service");
const storage_service_1 = require("../storage/storage.service");
const crypto = __importStar(require("crypto"));
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
        console.log('[InvoicesService] Upload called with:', {
            tenantId,
            fileName: file.originalname,
            explicitVendorId: vendorId,
            hasVendorId: !!vendorId,
        });
        const fileHash = this.computeFileHash(file.buffer);
        const duplicate = await this.checkDuplicate(tenantId, { fileHash });
        if (duplicate.isDuplicate) {
            throw new common_1.ConflictException({
                message: 'This invoice has already been uploaded',
                isDuplicate: true,
                existingInvoice: duplicate.existingInvoice,
            });
        }
        const user = await this.prisma.user.findUnique({
            where: { id: tenantId },
            select: { systemCurrency: true },
        });
        const systemCurrency = user?.systemCurrency || 'USD';
        const result = await this.extractionService.processInvoice(file.buffer, file.originalname, file.mimetype, tenantId, systemCurrency, fileHash);
        console.log('[InvoicesService] Extraction result:', {
            extractedVendorNameCandidate: result.extractedVendorNameCandidate,
            vendorId: result.invoice.vendorId,
            explicitVendorIdProvided: vendorId,
        });
        if (vendorId) {
            console.log('[InvoicesService] Assigning vendor via explicit vendorId:', {
                vendorId,
            });
            await this.prisma.invoice.update({
                where: { id: result.invoice.id },
                data: {
                    vendorId,
                    needsReview: false,
                },
            });
            result.invoice.vendorId = vendorId;
            result.invoice.needsReview = false;
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
                { invoiceNumber: { contains: search, mode: 'insensitive' } },
                ...(isNaN(Number(search)) ? [] : [
                    { originalAmount: { equals: Number(search) } },
                ]),
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
                include: {
                    vendor: { select: { id: true, name: true } },
                    items: { orderBy: { displayOrder: 'asc' } },
                },
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
                items: { orderBy: { displayOrder: 'asc' } },
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
            include: { items: true },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        if (dto.useItemsTotal !== false && dto.items && dto.items.length > 0) {
            const itemsTotal = dto.items.reduce((sum, item) => sum + item.total, 0);
            const invoiceAmount = dto.originalAmount ?? Number(invoice.originalAmount);
            const tolerance = 0.01;
            if (Math.abs(itemsTotal - invoiceAmount) > tolerance) {
                throw new Error(`Total mismatch: invoice amount $${invoiceAmount.toFixed(2)} ≠ items total $${itemsTotal.toFixed(2)} (useItemsTotal is true)`);
            }
        }
        return this.prisma.$transaction(async (tx) => {
            const updatedInvoice = await tx.invoice.update({
                where: { id },
                data: {
                    name: dto.name,
                    invoiceNumber: dto.invoiceNumber,
                    originalAmount: dto.originalAmount,
                    originalCurrency: dto.originalCurrency,
                    invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
                    vendorId: dto.vendorId,
                    useItemsTotal: dto.useItemsTotal,
                    needsReview: dto.needsReview,
                },
            });
            if (dto.items !== undefined) {
                const existingItemIds = invoice.items.map(item => item.id);
                const providedItemIds = dto.items.filter(item => item.id).map(item => item.id);
                const itemsToDelete = existingItemIds.filter(id => !providedItemIds.includes(id));
                if (itemsToDelete.length > 0) {
                    await tx.invoiceItem.deleteMany({
                        where: { id: { in: itemsToDelete } },
                    });
                }
                for (let i = 0; i < dto.items.length; i++) {
                    const itemDto = dto.items[i];
                    if (itemDto.id) {
                        await tx.invoiceItem.update({
                            where: { id: itemDto.id },
                            data: {
                                description: itemDto.description,
                                quantity: itemDto.quantity,
                                unitPrice: itemDto.unitPrice,
                                total: itemDto.total,
                                currency: itemDto.currency,
                                displayOrder: i,
                            },
                        });
                    }
                    else {
                        await tx.invoiceItem.create({
                            data: {
                                invoiceId: id,
                                tenantId,
                                description: itemDto.description,
                                quantity: itemDto.quantity,
                                unitPrice: itemDto.unitPrice,
                                total: itemDto.total,
                                currency: itemDto.currency || updatedInvoice.originalCurrency,
                                displayOrder: i,
                            },
                        });
                    }
                }
            }
            return tx.invoice.findUnique({
                where: { id },
                include: {
                    vendor: { select: { id: true, name: true } },
                    items: { orderBy: { displayOrder: 'asc' } },
                },
            });
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
    computeFileHash(buffer) {
        return 'sha256:' + crypto.createHash('sha256').update(buffer).digest('hex');
    }
    async checkDuplicate(tenantId, dto) {
        const existing = await this.prisma.invoice.findFirst({
            where: {
                tenantId,
                fileHash: dto.fileHash,
            },
            include: {
                vendor: { select: { name: true } },
            },
        });
        if (existing) {
            return {
                isDuplicate: true,
                existingInvoice: {
                    id: existing.id,
                    name: existing.name,
                    vendorName: existing.vendor?.name || 'Unassigned',
                    originalAmount: Number(existing.originalAmount),
                    originalCurrency: existing.originalCurrency,
                    invoiceDate: existing.invoiceDate,
                    createdAt: existing.createdAt,
                },
            };
        }
        return { isDuplicate: false };
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