import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { Prisma } from '@prisma/client';
export declare class VendorsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string, includeInvoiceCount?: boolean, includeLatestInvoices?: boolean, search?: string): Promise<any[]>;
    findOne(tenantId: string, id: string): Promise<{
        recentInvoices: {
            id: string;
            name: string | null;
            originalAmount: Prisma.Decimal;
            originalCurrency: string;
            invoiceDate: Date;
        }[];
        invoices: undefined;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        tenantId: string;
        displayOrder: number;
        monthlyLimit: Prisma.Decimal | null;
    }>;
    create(tenantId: string, dto: CreateVendorDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        tenantId: string;
        displayOrder: number;
        monthlyLimit: Prisma.Decimal | null;
    }>;
    update(tenantId: string, id: string, dto: UpdateVendorDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        tenantId: string;
        displayOrder: number;
        monthlyLimit: Prisma.Decimal | null;
    }>;
    remove(tenantId: string, id: string): Promise<{
        deletedVendorId: string;
        deletedInvoicesCount: number;
    }>;
    reorder(tenantId: string, vendorIds: string[]): Promise<any[]>;
}
