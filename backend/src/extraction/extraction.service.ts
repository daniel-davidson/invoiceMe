import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PdfProcessorService } from './ocr/pdf-processor.service';
import { OcrService } from './ocr/ocr.service';
import { LlmService } from './llm/llm.service';
import { VendorMatcherService } from './vendor-matcher.service';
import { CurrencyService } from '../currency/currency.service';
import { DeterministicParserService } from './ocr/deterministic-parser.service';
import { ExtractedInvoiceData } from './llm/extraction-schema';
import { Decimal } from '@prisma/client/runtime/library';

export interface ProcessInvoiceResult {
  invoice: {
    id: string;
    vendorId: string | null; // v2.0: null on upload until user assigns
    name: string | null;
    originalAmount: number;
    originalCurrency: string;
    normalizedAmount: number | null;
    invoiceDate: Date;
    invoiceNumber: string | null;
    fxRate: number | null;
    fxDate: Date | null;
    needsReview: boolean; // v2.0: true when vendorId is null
    fileUrl: string;
  };
  extractedVendorNameCandidate: string; // v2.0: For prefilling in post-upload modal
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
    private readonly llmService: LlmService, // Changed from OllamaService to LlmService
    private readonly vendorMatcher: VendorMatcherService,
    private readonly currency: CurrencyService,
    private readonly deterministicParser: DeterministicParserService,
  ) {}

  private toNumber(value: Decimal | null | undefined): number | null {
    return value ? Number(value) : null;
  }

  /**
   * Process invoice: saveFile → detectPdfText/OCR → LLM extract → validate → matchVendor → convertCurrency → save items
   */
  async processInvoice(
    file: Buffer,
    originalName: string,
    mimeType: string,
    tenantId: string,
    userSystemCurrency: string,
    fileHash?: string,
  ): Promise<ProcessInvoiceResult> {
    const startTime = Date.now();

    // Step 1: Save file
    this.logger.log(`Saving file: ${originalName}`);
    const fileUrl = await this.storage.saveFileBuffer(
      tenantId,
      file,
      originalName,
    );

    // Step 2: Extract text (PDF text detection or enhanced multi-pass OCR)
    let extractedText = '';
    let ocrError: string | null = null;
    let ocrMetadata: any = null;

    try {
      if (mimeType === 'application/pdf') {
        const hasText = await this.pdfProcessor.hasSelectableText(file);

        if (hasText) {
          this.logger.log('PDF has selectable text, extracting directly');
          extractedText =
            (await this.pdfProcessor.extractTextFromPdf(file)) || '';
          ocrMetadata = { method: 'pdf_text', passes: [] };
        } else {
          this.logger.log('PDF requires OCR');
          const pdfImages = await this.pdfProcessor.convertPdfToImages(file);

          if (pdfImages === null) {
            this.logger.warn('PDF conversion failed, setting needsReview');
            ocrError = 'PDF conversion failed';
            extractedText = '';
            ocrMetadata = { method: 'pdf_failed', passes: [] };
          } else {
            const ocrResult = await this.ocr.recognizeTextMultiPass(
              file,
              mimeType,
            );
            extractedText = ocrResult.bestText;
            ocrMetadata = {
              method: 'multi_pass_ocr',
              chosenPass: ocrResult.chosenPass,
              chosenScore: ocrResult.chosenScore,
              chosenConfidence: ocrResult.chosenConfidence,
              passes: ocrResult.allPasses,
            };
          }
        }
      } else {
        this.logger.log('Processing image with enhanced multi-pass OCR');
        const ocrResult = await this.ocr.recognizeTextMultiPass(file, mimeType);
        extractedText = ocrResult.bestText;
        ocrMetadata = {
          method: 'multi_pass_ocr',
          chosenPass: ocrResult.chosenPass,
          chosenScore: ocrResult.chosenScore,
          chosenConfidence: ocrResult.chosenConfidence,
          passes: ocrResult.allPasses,
        };
      }
    } catch (error) {
      this.logger.error(`OCR/Text extraction failed: ${error.message}`);
      ocrError = error.message;
      extractedText = '';
      ocrMetadata = { method: 'error', error: error.message, passes: [] };
    }

    // Step 2.5: Deterministic parsing (extract candidates before LLM)
    let candidates: any = null;
    if (extractedText) {
      this.logger.log('[ExtractionService] Running deterministic parsing');
      const parsedCandidates =
        this.deterministicParser.extractCandidates(extractedText);
      candidates = {
        bestTotal:
          this.deterministicParser.getBestTotalAmount(parsedCandidates),
        bestCurrency:
          this.deterministicParser.getBestCurrency(parsedCandidates),
        bestDate: this.deterministicParser.getBestDate(parsedCandidates),
        vendorCandidates: parsedCandidates.vendorNames,
        allCandidates: parsedCandidates,
      };
      this.logger.debug(
        `[ExtractionService] Candidates: ${JSON.stringify(candidates)}`,
      );
    }

    // Step 3: LLM extraction with deterministic hints
    let extractedData: ExtractedInvoiceData;
    let llmError: string | null = null;

    if (extractedText) {
      try {
        this.logger.log(
          'Extracting structured data with LLM (with deterministic hints)',
        );
        extractedData = await this.llmService.extractFromText(
          extractedText,
          candidates,
        );

        // T067: Apply fallback total extraction if LLM total is null
        if (!extractedData.totalAmount && extractedText) {
          this.logger.warn(
            'LLM did not extract total, trying fallback extraction',
          );
          // Note: extractTotalFallback is not exposed from ollama service yet
          // This would require adding it as a public method
          extractedData.warnings.push(
            'Total amount extraction required manual fallback',
          );
        }

        // Apply fallback values for other critical null fields
        if (!extractedData.vendorName) {
          extractedData.vendorName = 'Unknown Vendor';
          extractedData.warnings.push('Vendor name not found, using fallback');
        }
        if (!extractedData.totalAmount) {
          extractedData.totalAmount = null;
          extractedData.warnings.push('Total amount not found');
        }
        if (!extractedData.currency) {
          extractedData.currency = 'ILS';
          extractedData.warnings.push('Currency not found, assumed ILS');
        }
        if (!extractedData.invoiceDate) {
          extractedData.invoiceDate = new Date().toISOString().split('T')[0];
          extractedData.warnings.push('Invoice date not found, using today');
        }

        extractedData.needsReview = true;
      } catch (error) {
        this.logger.error(`LLM extraction failed: ${error.message}`);
        llmError = error.message;
        extractedData = this.getDefaultExtractedData();
        extractedData.warnings.push(`LLM extraction failed: ${error.message}`);
      }
    } else {
      this.logger.warn('Empty OCR text, using fallback extraction data');
      extractedData = this.getDefaultExtractedData();
      extractedData.warnings.push('OCR returned empty text');
    }

    // Step 4: Validate extracted data
    const validationResult = this.validateExtractedData(extractedData);
    if (ocrError) validationResult.warnings.push(`OCR error: ${ocrError}`);
    if (llmError) validationResult.warnings.push(`LLM error: ${llmError}`);

    // Step 5: NEVER auto-create vendor (v2.0 - user assigns via post-upload modal)
    // Store extracted vendor name as candidate for frontend to use
    const extractedVendorNameCandidate =
      extractedData.vendorName || 'Unknown Vendor';

    this.logger.log(
      `Extracted vendor name candidate: "${extractedVendorNameCandidate}" (will NOT auto-create)`,
    );

    // Mark as needs review since no vendor assigned
    validationResult.needsReview = true;
    validationResult.warnings.push(
      `Vendor extraction: "${extractedVendorNameCandidate}" - user must assign business manually`,
    );

    // Step 6: Convert currency
    let normalizedAmount: number | null = null;
    let fxRate: number | null = null;
    let fxDate: Date | null = null;

    if (
      extractedData.totalAmount &&
      extractedData.totalAmount > 0 &&
      extractedData.currency
    ) {
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
        this.logger.warn(
          `Invalid date format: ${extractedData.invoiceDate}, using today's date`,
        );
        invoiceDate = new Date();
        validationResult.warnings.push(
          "Invalid date format, using today's date",
        );
        validationResult.needsReview = true;
      }
    } else {
      this.logger.warn("No invoice date found, using today's date");
      invoiceDate = new Date();
      validationResult.warnings.push('No invoice date found');
      validationResult.needsReview = true;
    }

    // Step 8: Create invoice record (allow null amounts if needsReview)
    const processingTimeMs = Date.now() - startTime;

    const dbStartTime = Date.now();
    const shouldReview =
      validationResult.needsReview ||
      ocrError !== null ||
      llmError !== null ||
      !extractedData.totalAmount;

    // Determine if we should use items total
    const hasItems =
      extractedData.lineItems && extractedData.lineItems.length > 0;
    const useItemsTotal = hasItems;

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        vendorId: null, // ❗ v2.0: Never auto-assign, user assigns via post-upload modal
        name: extractedData.invoiceNumber || null,
        originalAmount: extractedData.totalAmount || 0,
        originalCurrency: extractedData.currency || 'ILS',
        normalizedAmount,
        invoiceDate,
        invoiceNumber: extractedData.invoiceNumber || null,
        fxRate,
        fxDate,
        fileHash: fileHash || null,
        useItemsTotal,
        needsReview: true, // ❗ v2.0: Always true when vendorId is null
        fileUrl,
      },
    });

    // Create invoice items if extracted
    if (hasItems) {
      await Promise.all(
        extractedData.lineItems!.map((item, index) =>
          this.prisma.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              tenantId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.amount || 0,
              currency: extractedData.currency,
              displayOrder: index,
            },
          }),
        ),
      );
    }

    // Create extraction run record
    await this.prisma.extractionRun.create({
      data: {
        tenantId,
        invoiceId: invoice.id,
        status: llmError
          ? 'ERROR'
          : validationResult.needsReview
            ? 'VALIDATION_FAILED'
            : 'SUCCESS',
        ocrText: extractedText || null,
        llmResponse: extractedData as any,
        errorMessage: ocrError || llmError || null,
        processingTimeMs,
      },
    });

    const dbDuration = Date.now() - dbStartTime;
    this.logger.log(`[ExtractionService] DB save took ${dbDuration}ms`);

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
      extractedVendorNameCandidate, // v2.0: For prefilling in post-upload modal
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
      invoiceDate: null,
      totalAmount: null,
      currency: 'ILS', // Default to ILS for Israeli invoices
      invoiceNumber: null,
      vatAmount: null,
      subtotalAmount: null,
      lineItems: [],
      confidence: {
        vendorName: 0,
        invoiceDate: 0,
        totalAmount: 0,
        currency: 0,
      },
      warnings: ['Could not extract invoice data'],
      needsReview: true,
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
