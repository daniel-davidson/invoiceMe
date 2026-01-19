import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PdfProcessorService } from './ocr/pdf-processor.service';
import { OcrService } from './ocr/ocr.service';
import { OllamaService } from './llm/ollama.service';
import { VendorMatcherService } from './vendor-matcher.service';
import { CurrencyService } from '../currency/currency.service';
import { ExtractedInvoiceData } from './llm/extraction-schema';
import { Decimal } from '@prisma/client/runtime/library';

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

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly pdfProcessor: PdfProcessorService,
    private readonly ocr: OcrService,
    private readonly ollama: OllamaService,
    private readonly vendorMatcher: VendorMatcherService,
    private readonly currency: CurrencyService,
  ) {}

  private toNumber(value: Decimal | null | undefined): number | null {
    return value ? Number(value) : null;
  }

  /**
   * Process invoice: saveFile → detectPdfText/OCR → LLM extract → validate → matchVendor → convertCurrency
   */
  async processInvoice(
    file: Buffer,
    originalName: string,
    mimeType: string,
    tenantId: string,
    userSystemCurrency: string,
  ): Promise<ProcessInvoiceResult> {
    const startTime = Date.now();

    // Step 1: Save file
    this.logger.log(`Saving file: ${originalName}`);
    const fileUrl = await this.storage.saveFileBuffer(tenantId, file, originalName);

    // Step 2: Extract text (PDF text detection or OCR)
    let extractedText = '';
    let ocrError: string | null = null;

    try {
      if (mimeType === 'application/pdf') {
        const hasText = await this.pdfProcessor.hasSelectableText(file);

        if (hasText) {
          this.logger.log('PDF has selectable text, extracting directly');
          extractedText = (await this.pdfProcessor.extractTextFromPdf(file)) || '';
        } else {
          this.logger.log('PDF requires OCR');
          extractedText = await this.ocr.recognizeText(file, mimeType);
        }
      } else {
        // Image file - use OCR
        this.logger.log('Processing image with OCR');
        extractedText = await this.ocr.recognizeText(file, mimeType);
      }
    } catch (error) {
      this.logger.error(`OCR/Text extraction failed: ${error.message}`);
      ocrError = error.message;
      extractedText = '';
    }

    // Step 3: LLM extraction
    let extractedData: ExtractedInvoiceData;
    let llmError: string | null = null;

    if (extractedText) {
      try {
        this.logger.log('Extracting structured data with LLM');
        extractedData = await this.ollama.extractFromText(extractedText);
      } catch (error) {
        this.logger.error(`LLM extraction failed: ${error.message}`);
        llmError = error.message;
        extractedData = this.getDefaultExtractedData();
      }
    } else {
      extractedData = this.getDefaultExtractedData();
    }

    // Step 4: Validate extracted data
    const validationResult = this.validateExtractedData(extractedData);
    if (ocrError) validationResult.warnings.push(`OCR error: ${ocrError}`);
    if (llmError) validationResult.warnings.push(`LLM error: ${llmError}`);

    // Step 5: Match or create vendor
    this.logger.log('Matching vendor');
    const vendor = await this.vendorMatcher.matchVendor(
      extractedData.vendorName || 'Unknown Vendor',
      tenantId,
    );

    // Step 6: Convert currency
    let normalizedAmount: number | null = null;
    let fxRate: number | null = null;
    let fxDate: Date | null = null;

    if (extractedData.totalAmount && extractedData.totalAmount > 0 && extractedData.currency) {
      try {
        this.logger.log(
          `Converting ${extractedData.totalAmount} ${extractedData.currency} to ${userSystemCurrency}`,
        );

        const conversionResult = await this.currency.convert(
          extractedData.totalAmount,
          extractedData.currency,
          userSystemCurrency,
        );

        if (conversionResult) {
          normalizedAmount = conversionResult.normalizedAmount;
          fxRate = conversionResult.fxRate;
          fxDate = new Date(conversionResult.fxDate);
        }
      } catch (error) {
        validationResult.warnings.push('Currency conversion failed');
        validationResult.needsReview = true;
      }
    }

    // Step 7: Parse invoice date with validation
    let invoiceDate: Date;
    if (extractedData.invoiceDate) {
      const parsedDate = new Date(extractedData.invoiceDate);
      // Check if date is valid
      if (!isNaN(parsedDate.getTime())) {
        invoiceDate = parsedDate;
      } else {
        this.logger.warn(`Invalid date format: ${extractedData.invoiceDate}, using today's date`);
        invoiceDate = new Date();
        validationResult.warnings.push('Invalid date format, using today\'s date');
        validationResult.needsReview = true;
      }
    } else {
      this.logger.warn('No invoice date found, using today\'s date');
      invoiceDate = new Date();
      validationResult.warnings.push('No invoice date found');
      validationResult.needsReview = true;
    }

    // Step 8: Create invoice record
    const processingTimeMs = Date.now() - startTime;

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        vendorId: vendor.id,
        name: extractedData.invoiceNumber || null,
        originalAmount: extractedData.totalAmount || 0,
        originalCurrency: extractedData.currency || 'USD',
        normalizedAmount,
        invoiceDate,
        invoiceNumber: extractedData.invoiceNumber || null,
        fxRate,
        fxDate,
        needsReview: validationResult.needsReview || ocrError !== null || llmError !== null,
        fileUrl,
      },
    });

    // Create extraction run record
    await this.prisma.extractionRun.create({
      data: {
        tenantId,
        invoiceId: invoice.id,
        status: llmError ? 'ERROR' : validationResult.needsReview ? 'VALIDATION_FAILED' : 'SUCCESS',
        ocrText: extractedText || null,
        llmResponse: extractedData as any,
        errorMessage: ocrError || llmError || null,
        processingTimeMs,
      },
    });

    this.logger.log(
      `Invoice processed successfully in ${processingTimeMs}ms (ID: ${invoice.id})`,
    );

    return {
      invoice: {
        id: invoice.id,
        vendorId: invoice.vendorId,
        name: invoice.name,
        originalAmount: Number(invoice.originalAmount),
        originalCurrency: invoice.originalCurrency,
        normalizedAmount: this.toNumber(invoice.normalizedAmount),
        invoiceDate: invoice.invoiceDate,
        invoiceNumber: invoice.invoiceNumber,
        fxRate: this.toNumber(invoice.fxRate),
        fxDate: invoice.fxDate,
        needsReview: invoice.needsReview,
        fileUrl: invoice.fileUrl,
      },
      vendor: {
        id: vendor.id,
        name: vendor.name,
        isNew: vendor.isNew,
      },
      extraction: {
        status: validationResult.needsReview ? 'NEEDS_REVIEW' : 'SUCCESS',
        confidence: extractedData.confidence,
        warnings: validationResult.warnings,
      },
    };
  }

  private getDefaultExtractedData(): ExtractedInvoiceData {
    return {
      vendorName: 'Unknown Vendor',
      invoiceDate: undefined,
      totalAmount: 0,
      currency: 'USD',
      invoiceNumber: undefined,
      vatAmount: undefined,
      subtotalAmount: undefined,
      lineItems: [],
      confidence: {
        vendorName: 0,
        invoiceDate: 0,
        totalAmount: 0,
        currency: 0,
      },
      warnings: ['Could not extract invoice data'],
    };
  }

  /**
   * Validate extracted data
   */
  private validateExtractedData(data: ExtractedInvoiceData): {
    isValid: boolean;
    needsReview: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [...(data.warnings || [])];
    let needsReview = false;

    // Validate total amount
    if (!data.totalAmount || data.totalAmount <= 0) {
      warnings.push('Invalid total amount (must be positive)');
      needsReview = true;
    }

    // Validate invoice date
    if (data.invoiceDate) {
      const date = new Date(data.invoiceDate);
      const now = new Date();

      if (isNaN(date.getTime())) {
        warnings.push('Invalid invoice date format');
        needsReview = true;
      } else if (date > now) {
        warnings.push('Invoice date is in the future');
        needsReview = true;
      }
    }

    // Validate currency
    const validCurrencyPattern = /^[A-Z]{3}$/;
    if (!data.currency || !validCurrencyPattern.test(data.currency)) {
      warnings.push('Invalid currency code format');
      needsReview = true;
    }

    // Check confidence scores
    const confidenceThreshold = 0.7;
    const lowConfidenceFields: string[] = [];

    if (data.confidence.vendorName < confidenceThreshold) {
      lowConfidenceFields.push('vendor name');
    }
    if (data.confidence.totalAmount < confidenceThreshold) {
      lowConfidenceFields.push('total amount');
    }
    if (data.confidence.currency < confidenceThreshold) {
      lowConfidenceFields.push('currency');
    }
    if (data.invoiceDate && data.confidence.invoiceDate < confidenceThreshold) {
      lowConfidenceFields.push('invoice date');
    }

    if (lowConfidenceFields.length > 0) {
      warnings.push(`Low confidence in: ${lowConfidenceFields.join(', ')}`);
      needsReview = true;
    }

    return {
      isValid: warnings.length === 0 || !needsReview,
      needsReview,
      warnings,
    };
  }
}
