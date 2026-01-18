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
var ExtractionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const pdf_processor_service_1 = require("./ocr/pdf-processor.service");
const ocr_service_1 = require("./ocr/ocr.service");
const ollama_service_1 = require("./llm/ollama.service");
const vendor_matcher_service_1 = require("./vendor-matcher.service");
const currency_service_1 = require("../currency/currency.service");
let ExtractionService = ExtractionService_1 = class ExtractionService {
    prisma;
    storage;
    pdfProcessor;
    ocr;
    ollama;
    vendorMatcher;
    currency;
    logger = new common_1.Logger(ExtractionService_1.name);
    constructor(prisma, storage, pdfProcessor, ocr, ollama, vendorMatcher, currency) {
        this.prisma = prisma;
        this.storage = storage;
        this.pdfProcessor = pdfProcessor;
        this.ocr = ocr;
        this.ollama = ollama;
        this.vendorMatcher = vendorMatcher;
        this.currency = currency;
    }
    toNumber(value) {
        return value ? Number(value) : null;
    }
    async processInvoice(file, originalName, mimeType, tenantId, userSystemCurrency) {
        const startTime = Date.now();
        this.logger.log(`Saving file: ${originalName}`);
        const fileUrl = await this.storage.saveFileBuffer(tenantId, file, originalName);
        let extractedText = '';
        let ocrError = null;
        try {
            if (mimeType === 'application/pdf') {
                const hasText = await this.pdfProcessor.hasSelectableText(file);
                if (hasText) {
                    this.logger.log('PDF has selectable text, extracting directly');
                    extractedText = (await this.pdfProcessor.extractTextFromPdf(file)) || '';
                }
                else {
                    this.logger.log('PDF requires OCR');
                    extractedText = await this.ocr.recognizeText(file, mimeType);
                }
            }
            else {
                this.logger.log('Processing image with OCR');
                extractedText = await this.ocr.recognizeText(file, mimeType);
            }
        }
        catch (error) {
            this.logger.error(`OCR/Text extraction failed: ${error.message}`);
            ocrError = error.message;
            extractedText = '';
        }
        let extractedData;
        let llmError = null;
        if (extractedText) {
            try {
                this.logger.log('Extracting structured data with LLM');
                extractedData = await this.ollama.extractFromText(extractedText);
            }
            catch (error) {
                this.logger.error(`LLM extraction failed: ${error.message}`);
                llmError = error.message;
                extractedData = this.getDefaultExtractedData();
            }
        }
        else {
            extractedData = this.getDefaultExtractedData();
        }
        const validationResult = this.validateExtractedData(extractedData);
        if (ocrError)
            validationResult.warnings.push(`OCR error: ${ocrError}`);
        if (llmError)
            validationResult.warnings.push(`LLM error: ${llmError}`);
        this.logger.log('Matching vendor');
        const vendor = await this.vendorMatcher.matchVendor(extractedData.vendorName || 'Unknown Vendor', tenantId);
        let normalizedAmount = null;
        let fxRate = null;
        let fxDate = null;
        if (extractedData.totalAmount && extractedData.totalAmount > 0 && extractedData.currency) {
            try {
                this.logger.log(`Converting ${extractedData.totalAmount} ${extractedData.currency} to ${userSystemCurrency}`);
                const conversionResult = await this.currency.convert(extractedData.totalAmount, extractedData.currency, userSystemCurrency);
                if (conversionResult) {
                    normalizedAmount = conversionResult.normalizedAmount;
                    fxRate = conversionResult.fxRate;
                    fxDate = new Date(conversionResult.fxDate);
                }
            }
            catch (error) {
                validationResult.warnings.push('Currency conversion failed');
                validationResult.needsReview = true;
            }
        }
        const invoiceDate = extractedData.invoiceDate
            ? new Date(extractedData.invoiceDate)
            : new Date();
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
        await this.prisma.extractionRun.create({
            data: {
                tenantId,
                invoiceId: invoice.id,
                status: llmError ? 'ERROR' : validationResult.needsReview ? 'VALIDATION_FAILED' : 'SUCCESS',
                ocrText: extractedText || null,
                llmResponse: extractedData,
                errorMessage: ocrError || llmError || null,
                processingTimeMs,
            },
        });
        this.logger.log(`Invoice processed successfully in ${processingTimeMs}ms (ID: ${invoice.id})`);
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
    getDefaultExtractedData() {
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
    validateExtractedData(data) {
        const warnings = [...(data.warnings || [])];
        let needsReview = false;
        if (!data.totalAmount || data.totalAmount <= 0) {
            warnings.push('Invalid total amount (must be positive)');
            needsReview = true;
        }
        if (data.invoiceDate) {
            const date = new Date(data.invoiceDate);
            const now = new Date();
            if (isNaN(date.getTime())) {
                warnings.push('Invalid invoice date format');
                needsReview = true;
            }
            else if (date > now) {
                warnings.push('Invoice date is in the future');
                needsReview = true;
            }
        }
        const validCurrencyPattern = /^[A-Z]{3}$/;
        if (!data.currency || !validCurrencyPattern.test(data.currency)) {
            warnings.push('Invalid currency code format');
            needsReview = true;
        }
        const confidenceThreshold = 0.7;
        const lowConfidenceFields = [];
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
};
exports.ExtractionService = ExtractionService;
exports.ExtractionService = ExtractionService = ExtractionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService,
        pdf_processor_service_1.PdfProcessorService,
        ocr_service_1.OcrService,
        ollama_service_1.OllamaService,
        vendor_matcher_service_1.VendorMatcherService,
        currency_service_1.CurrencyService])
], ExtractionService);
//# sourceMappingURL=extraction.service.js.map