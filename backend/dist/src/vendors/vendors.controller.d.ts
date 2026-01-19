import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { ReorderVendorsDto } from './dto/reorder-vendors.dto';
export declare class VendorsController {
    private readonly vendorsService;
    constructor(vendorsService: VendorsService);
    findAll(tenantId: string, includeInvoiceCount?: string, includeLatestInvoices?: string): Promise<any[]>;
    findOne(tenantId: string, id: string): Promise<{
        recentInvoices: {
            id: string;
            name: string | null;
            originalAmount: import("@prisma/client/runtime/library").Decimal;
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
        monthlyLimit: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    create(tenantId: string, dto: CreateVendorDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        tenantId: string;
        displayOrder: number;
        monthlyLimit: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    update(tenantId: string, id: string, dto: UpdateVendorDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        tenantId: string;
        displayOrder: number;
        monthlyLimit: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    remove(tenantId: string, id: string): Promise<{
        deletedVendorId: string;
        deletedInvoicesCount: number;
    }>;
    reorder(tenantId: string, dto: ReorderVendorsDto): Promise<any[]>;
}
