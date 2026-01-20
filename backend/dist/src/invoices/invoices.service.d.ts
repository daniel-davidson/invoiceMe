import { PrismaService } from '../prisma/prisma.service';
import { ExtractionService } from '../extraction/extraction.service';
import { StorageService } from '../storage/storage.service';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CheckDuplicateDto } from './dto/check-duplicate.dto';
export declare class InvoicesService {
    private prisma;
    private extractionService;
    private storageService;
    constructor(prisma: PrismaService, extractionService: ExtractionService, storageService: StorageService);
    upload(tenantId: string, file: Express.Multer.File, vendorId?: string): Promise<import("../extraction/extraction.service").ProcessInvoiceResult>;
    findAll(tenantId: string, query: InvoiceQueryDto): Promise<{
        data: ({
            vendor: {
                id: string;
                name: string;
            } | null;
            items: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                displayOrder: number;
                invoiceId: string;
                currency: string | null;
                description: string;
                quantity: import("@prisma/client/runtime/library").Decimal | null;
                unitPrice: import("@prisma/client/runtime/library").Decimal | null;
                total: import("@prisma/client/runtime/library").Decimal;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string | null;
            tenantId: string;
            originalAmount: import("@prisma/client/runtime/library").Decimal;
            originalCurrency: string;
            normalizedAmount: import("@prisma/client/runtime/library").Decimal | null;
            fxRate: import("@prisma/client/runtime/library").Decimal | null;
            fxDate: Date | null;
            invoiceDate: Date;
            invoiceNumber: string | null;
            fileUrl: string;
            fileHash: string | null;
            useItemsTotal: boolean;
            needsReview: boolean;
            vendorId: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    findOne(tenantId: string, id: string): Promise<{
        vendor: {
            id: string;
            name: string;
        } | null;
        extractionRuns: {
            id: string;
            createdAt: Date;
            tenantId: string;
            status: import(".prisma/client").$Enums.ExtractionStatus;
            ocrText: string | null;
            llmResponse: import("@prisma/client/runtime/library").JsonValue | null;
            errorMessage: string | null;
            processingTimeMs: number | null;
            invoiceId: string;
        }[];
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            displayOrder: number;
            invoiceId: string;
            currency: string | null;
            description: string;
            quantity: import("@prisma/client/runtime/library").Decimal | null;
            unitPrice: import("@prisma/client/runtime/library").Decimal | null;
            total: import("@prisma/client/runtime/library").Decimal;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        tenantId: string;
        originalAmount: import("@prisma/client/runtime/library").Decimal;
        originalCurrency: string;
        normalizedAmount: import("@prisma/client/runtime/library").Decimal | null;
        fxRate: import("@prisma/client/runtime/library").Decimal | null;
        fxDate: Date | null;
        invoiceDate: Date;
        invoiceNumber: string | null;
        fileUrl: string;
        fileHash: string | null;
        useItemsTotal: boolean;
        needsReview: boolean;
        vendorId: string | null;
    }>;
    update(tenantId: string, id: string, dto: UpdateInvoiceDto): Promise<({
        vendor: {
            id: string;
            name: string;
        } | null;
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            displayOrder: number;
            invoiceId: string;
            currency: string | null;
            description: string;
            quantity: import("@prisma/client/runtime/library").Decimal | null;
            unitPrice: import("@prisma/client/runtime/library").Decimal | null;
            total: import("@prisma/client/runtime/library").Decimal;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        tenantId: string;
        originalAmount: import("@prisma/client/runtime/library").Decimal;
        originalCurrency: string;
        normalizedAmount: import("@prisma/client/runtime/library").Decimal | null;
        fxRate: import("@prisma/client/runtime/library").Decimal | null;
        fxDate: Date | null;
        invoiceDate: Date;
        invoiceNumber: string | null;
        fileUrl: string;
        fileHash: string | null;
        useItemsTotal: boolean;
        needsReview: boolean;
        vendorId: string | null;
    }) | null>;
    remove(tenantId: string, id: string): Promise<{
        deletedInvoiceId: string;
    }>;
    getFile(tenantId: string, id: string): Promise<{
        buffer: Buffer;
        mimeType: string;
        fileName: string;
    }>;
    private computeFileHash;
    checkDuplicate(tenantId: string, dto: CheckDuplicateDto): Promise<{
        isDuplicate: boolean;
        existingInvoice: {
            id: string;
            name: string | null;
            vendorName: string;
            originalAmount: number;
            originalCurrency: string;
            invoiceDate: Date;
            createdAt: Date;
        };
    } | {
        isDuplicate: boolean;
        existingInvoice?: undefined;
    }>;
}
