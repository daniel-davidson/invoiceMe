import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { UploadInvoiceDto } from './dto/upload-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
export declare class InvoicesController {
    private readonly invoicesService;
    constructor(invoicesService: InvoicesService);
    upload(tenantId: string, file: Express.Multer.File, dto: UploadInvoiceDto): Promise<import("../extraction/extraction.service").ProcessInvoiceResult>;
    findAll(tenantId: string, query: InvoiceQueryDto): Promise<{
        data: ({
            vendor: {
                id: string;
                name: string;
            };
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
            needsReview: boolean;
            vendorId: string;
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
        };
        extractionRuns: {
            id: string;
            createdAt: Date;
            tenantId: string;
            status: import("@prisma/client").$Enums.ExtractionStatus;
            ocrText: string | null;
            llmResponse: import("@prisma/client/runtime/library").JsonValue | null;
            errorMessage: string | null;
            processingTimeMs: number | null;
            invoiceId: string;
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
        needsReview: boolean;
        vendorId: string;
    }>;
    update(tenantId: string, id: string, dto: UpdateInvoiceDto): Promise<{
        vendor: {
            id: string;
            name: string;
        };
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
        needsReview: boolean;
        vendorId: string;
    }>;
    remove(tenantId: string, id: string): Promise<{
        deletedInvoiceId: string;
    }>;
    getFile(tenantId: string, id: string, res: Response): Promise<StreamableFile>;
}
