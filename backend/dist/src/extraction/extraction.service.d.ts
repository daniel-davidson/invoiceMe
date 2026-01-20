import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PdfProcessorService } from './ocr/pdf-processor.service';
import { OcrService } from './ocr/ocr.service';
import { OllamaService } from './llm/ollama.service';
import { VendorMatcherService } from './vendor-matcher.service';
import { CurrencyService } from '../currency/currency.service';
import { DeterministicParserService } from './ocr/deterministic-parser.service';
export interface ProcessInvoiceResult {
    invoice: {
        id: string;
        vendorId: string | null;
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
    extractedVendorNameCandidate: string;
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
    private readonly deterministicParser;
    private readonly logger;
    constructor(prisma: PrismaService, storage: StorageService, pdfProcessor: PdfProcessorService, ocr: OcrService, ollama: OllamaService, vendorMatcher: VendorMatcherService, currency: CurrencyService, deterministicParser: DeterministicParserService);
    private toNumber;
    processInvoice(file: Buffer, originalName: string, mimeType: string, tenantId: string, userSystemCurrency: string, fileHash?: string): Promise<ProcessInvoiceResult>;
    private getDefaultExtractedData;
    private validateExtractedData;
}
