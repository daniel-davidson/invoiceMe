import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, includeInvoiceCount = false) {
    if (includeInvoiceCount) {
      const vendors = await this.prisma.vendor.findMany({
        where: { tenantId },
        orderBy: { displayOrder: 'asc' },
        include: { _count: { select: { invoices: true } } },
      });

      return vendors.map((vendor) => ({
        id: vendor.id,
        tenantId: vendor.tenantId,
        name: vendor.name,
        displayOrder: vendor.displayOrder,
        monthlyLimit: vendor.monthlyLimit ? Number(vendor.monthlyLimit) : null,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
        invoiceCount: vendor._count.invoices,
      }));
    }

    const vendors = await this.prisma.vendor.findMany({
      where: { tenantId },
      orderBy: { displayOrder: 'asc' },
    });

    return vendors.map((vendor) => ({
      id: vendor.id,
      tenantId: vendor.tenantId,
      name: vendor.name,
      displayOrder: vendor.displayOrder,
      monthlyLimit: vendor.monthlyLimit ? Number(vendor.monthlyLimit) : null,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    }));
  }

  async findOne(tenantId: string, id: string) {
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
      throw new NotFoundException('Vendor not found');
    }

    return {
      ...vendor,
      recentInvoices: vendor.invoices,
      invoices: undefined,
    };
  }

  async create(tenantId: string, dto: CreateVendorDto) {
    // Check for duplicate name
    const existing = await this.prisma.vendor.findFirst({
      where: { tenantId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Vendor with this name already exists');
    }

    // Get max display order
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

  async update(tenantId: string, id: string, dto: UpdateVendorDto) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, tenantId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Check for duplicate name if name is being changed
    if (dto.name && dto.name !== vendor.name) {
      const existing = await this.prisma.vendor.findFirst({
        where: { tenantId, name: dto.name, NOT: { id } },
      });

      if (existing) {
        throw new ConflictException('Vendor with this name already exists');
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

  async remove(tenantId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { invoices: true } } },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const invoiceCount = vendor._count.invoices;

    // Cascade delete: invoices are deleted by Prisma cascade
    await this.prisma.vendor.delete({ where: { id } });

    return {
      deletedVendorId: id,
      deletedInvoicesCount: invoiceCount,
    };
  }

  async reorder(tenantId: string, vendorIds: string[]) {
    // Verify all vendors belong to tenant
    const vendors = await this.prisma.vendor.findMany({
      where: { tenantId, id: { in: vendorIds } },
    });

    if (vendors.length !== vendorIds.length) {
      throw new NotFoundException('One or more vendors not found');
    }

    // Update display order
    await this.prisma.$transaction(
      vendorIds.map((id, index) =>
        this.prisma.vendor.update({
          where: { id },
          data: { displayOrder: index },
        }),
      ),
    );

    return this.findAll(tenantId);
  }
}
