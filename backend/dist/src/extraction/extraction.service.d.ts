import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PdfProcessorService } from './ocr/pdf-processor.service';
import { OcrService } from './ocr/ocr.service';
import { OllamaService } from './llm/ollama.service';
import { VendorMatcherService } from './vendor-matcher.service';
import { CurrencyService } from '../currency/currency.service';
export interface ProcessInvoiceResult {
    invoice: {
        id: string;
        vendorId: string;
        name: string | null;
        originalAmount: number;
        originalCurrency: string;
        normalizedAmount: number | null;
        invoiceDate: Date;
        invoiceNumber: string | null;
        fxRate: number | null;
        fxDate: Date | null;
        needsReview: boolean;
        fileUrl: string;
    };
    vendor: {
        id: string;
        name: string;
        isNew: boolean;
    };
    extraction: {
        status: string;
        confidence: {
            vendorName: number;
            invoiceDate: number;
            totalAmount: number;
            currency: number;
        };
        warnings: string[];
    };
}
export declare class ExtractionService {
    private readonly prisma;
    private readonly storage;
    private readonly pdfProcessor;
    private readonly ocr;
    private readonly ollama;
    private readonly vendorMatcher;
    private readonly currency;
    private readonly logger;
    constructor(prisma: PrismaService, storage: StorageService, pdfProcessor: PdfProcessorService, ocr: OcrService, ollama: OllamaService, vendorMatcher: VendorMatcherService, currency: CurrencyService);
    private toNumber;
    processInvoice(file: Buffer, originalName: string, mimeType: string, tenantId: string, userSystemCurrency: string): Promise<ProcessInvoiceResult>;
    private getDefaultExtractedData;
    private validateExtractedData;
}
