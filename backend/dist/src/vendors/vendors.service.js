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
exports.VendorsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let VendorsService = class VendorsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId, includeInvoiceCount = false, includeLatestInvoices = false, search) {
        const includeClause = {};
        if (includeInvoiceCount || includeLatestInvoices) {
            includeClause._count = { select: { invoices: true } };
        }
        if (includeLatestInvoices) {
            includeClause.invoices = {
                orderBy: { invoiceDate: 'desc' },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    originalAmount: true,
                    originalCurrency: true,
                    normalizedAmount: true,
                    invoiceDate: true,
                    needsReview: true,
                },
            };
        }
        const where = { tenantId };
        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }
        const vendors = await this.prisma.vendor.findMany({
            where,
            orderBy: { displayOrder: 'asc' },
            include: Object.keys(includeClause).length > 0 ? includeClause : undefined,
        });
        return vendors.map((vendor) => {
            const result = {
                id: vendor.id,
                tenantId: vendor.tenantId,
                name: vendor.name,
                displayOrder: vendor.displayOrder,
                monthlyLimit: vendor.monthlyLimit ? Number(vendor.monthlyLimit) : null,
                createdAt: vendor.createdAt,
                updatedAt: vendor.updatedAt,
            };
            if (includeInvoiceCount || includeLatestInvoices) {
                result.invoiceCount = vendor._count.invoices;
            }
            if (includeLatestInvoices) {
                result.latestInvoices = vendor.invoices.map((inv) => ({
                    ...inv,
                    originalAmount: Number(inv.originalAmount),
                    normalizedAmount: inv.normalizedAmount
                        ? Number(inv.normalizedAmount)
                        : null,
                }));
            }
            return result;
        });
    }
    async findOne(tenantId, id) {
        const vendor = await this.prisma.vendor.findFirst({
            where: { id, tenantId },
            include: {
                invoices: {
                    orderBy: { invoiceDate: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        name: true,
                        originalAmount: true,
                        originalCurrency: true,
                        invoiceDate: true,
                    },
                },
            },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor not found');
        }
        return {
            ...vendor,
            recentInvoices: vendor.invoices,
            invoices: undefined,
        };
    }
    async create(tenantId, dto) {
        const existing = await this.prisma.vendor.findFirst({
            where: { tenantId, name: dto.name },
        });
        if (existing) {
            throw new common_1.ConflictException('Vendor with this name already exists');
        }
        const maxOrder = await this.prisma.vendor.aggregate({
            where: { tenantId },
            _max: { displayOrder: true },
        });
        return this.prisma.vendor.create({
            data: {
                tenantId,
                name: dto.name,
                monthlyLimit: dto.monthlyLimit,
                displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
            },
        });
    }
    async update(tenantId, id, dto) {
        const vendor = await this.prisma.vendor.findFirst({
            where: { id, tenantId },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor not found');
        }
        if (dto.name && dto.name !== vendor.name) {
            const existing = await this.prisma.vendor.findFirst({
                where: { tenantId, name: dto.name, NOT: { id } },
            });
            if (existing) {
                throw new common_1.ConflictException('Vendor with this name already exists');
            }
        }
        return this.prisma.vendor.update({
            where: { id },
            data: {
                name: dto.name,
                monthlyLimit: dto.monthlyLimit,
            },
        });
    }
    async remove(tenantId, id) {
        const vendor = await this.prisma.vendor.findFirst({
            where: { id, tenantId },
            include: { _count: { select: { invoices: true } } },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor not found');
        }
        const invoiceCount = vendor._count.invoices;
        await this.prisma.vendor.delete({ where: { id } });
        return {
            deletedVendorId: id,
            deletedInvoicesCount: invoiceCount,
        };
    }
    async reorder(tenantId, vendorIds) {
        const vendors = await this.prisma.vendor.findMany({
            where: { tenantId, id: { in: vendorIds } },
        });
        if (vendors.length !== vendorIds.length) {
            throw new common_1.NotFoundException('One or more vendors not found');
        }
        await this.prisma.$transaction(vendorIds.map((id, index) => this.prisma.vendor.update({
            where: { id },
            data: { displayOrder: index },
        })));
        return this.findAll(tenantId);
    }
};
exports.VendorsService = VendorsService;
exports.VendorsService = VendorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VendorsService);
//# sourceMappingURL=vendors.service.js.map