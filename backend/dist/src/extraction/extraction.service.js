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
const deterministic_parser_service_1 = require("./ocr/deterministic-parser.service");
let ExtractionService = ExtractionService_1 = class ExtractionService {
    prisma;
    storage;
    pdfProcessor;
    ocr;
    ollama;
    vendorMatcher;
    currency;
    deterministicParser;
    logger = new common_1.Logger(ExtractionService_1.name);
    constructor(prisma, storage, pdfProcessor, ocr, ollama, vendorMatcher, currency, deterministicParser) {
        this.prisma = prisma;
        this.storage = storage;
        this.pdfProcessor = pdfProcessor;
        this.ocr = ocr;
        this.ollama = ollama;
        this.vendorMatcher = vendorMatcher;
        this.currency = currency;
        this.deterministicParser = deterministicParser;
    }
    toNumber(value) {
        return value ? Number(value) : null;
    }
    async processInvoice(file, originalName, mimeType, tenantId, userSystemCurrency, fileHash) {
        const startTime = Date.now();
        this.logger.log(`Saving file: ${originalName}`);
        const fileUrl = await this.storage.saveFileBuffer(tenantId, file, originalName);
        let extractedText = '';
        let ocrError = null;
        let ocrMetadata = null;
        try {
            if (mimeType === 'application/pdf') {
                const hasText = await this.pdfProcessor.hasSelectableText(file);
                if (hasText) {
                    this.logger.log('PDF has selectable text, extracting directly');
                    extractedText = (await this.pdfProcessor.extractTextFromPdf(file)) || '';
                    ocrMetadata = { method: 'pdf_text', passes: [] };
                }
                else {
                    this.logger.log('PDF requires OCR');
                    const pdfImages = await this.pdfProcessor.convertPdfToImages(file);
                    if (pdfImages === null) {
                        this.logger.warn('PDF conversion failed, setting needsReview');
                        ocrError = 'PDF conversion failed';
                        extractedText = '';
                        ocrMetadata = { method: 'pdf_failed', passes: [] };
                    }
                    else {
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
                }
            }
            else {
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
        }
        catch (error) {
            this.logger.error(`OCR/Text extraction failed: ${error.message}`);
            ocrError = error.message;
            extractedText = '';
            ocrMetadata = { method: 'error', error: error.message, passes: [] };
        }
        let candidates = null;
        if (extractedText) {
            this.logger.log('[ExtractionService] Running deterministic parsing');
            const parsedCandidates = this.deterministicParser.extractCandidates(extractedText);
            candidates = {
                bestTotal: this.deterministicParser.getBestTotalAmount(parsedCandidates),
                bestCurrency: this.deterministicParser.getBestCurrency(parsedCandidates),
                bestDate: this.deterministicParser.getBestDate(parsedCandidates),
                vendorCandidates: parsedCandidates.vendorNames,
                allCandidates: parsedCandidates,
            };
            this.logger.debug(`[ExtractionService] Candidates: ${JSON.stringify(candidates)}`);
        }
        let extractedData;
        let llmError = null;
        if (extractedText) {
            try {
                this.logger.log('Extracting structured data with LLM (with deterministic hints)');
                extractedData = await this.ollama.extractFromText(extractedText, candidates);
                if (!extractedData.totalAmount && extractedText) {
                    this.logger.warn('LLM did not extract total, trying fallback extraction');
                    extractedData.warnings.push('Total amount extraction required manual fallback');
                }
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
            }
            catch (error) {
                this.logger.error(`LLM extraction failed: ${error.message}`);
                llmError = error.message;
                extractedData = this.getDefaultExtractedData();
                extractedData.warnings.push(`LLM extraction failed: ${error.message}`);
            }
        }
        else {
            this.logger.warn('Empty OCR text, using fallback extraction data');
            extractedData = this.getDefaultExtractedData();
            extractedData.warnings.push('OCR returned empty text');
        }
        const validationResult = this.validateExtractedData(extractedData);
        if (ocrError)
            validationResult.warnings.push(`OCR error: ${ocrError}`);
        if (llmError)
            validationResult.warnings.push(`LLM error: ${llmError}`);
        const extractedVendorNameCandidate = extractedData.vendorName || 'Unknown Vendor';
        this.logger.log(`Extracted vendor name candidate: "${extractedVendorNameCandidate}" (will NOT auto-create)`);
        validationResult.needsReview = true;
        validationResult.warnings.push(`Vendor extraction: "${extractedVendorNameCandidate}" - user must assign business manually`);
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
        let invoiceDate;
        if (extractedData.invoiceDate) {
            const parsedDate = new Date(extractedData.invoiceDate);
            if (!isNaN(parsedDate.getTime())) {
                invoiceDate = parsedDate;
            }
            else {
                this.logger.warn(`Invalid date format: ${extractedData.invoiceDate}, using today's date`);
                invoiceDate = new Date();
                validationResult.warnings.push('Invalid date format, using today\'s date');
                validationResult.needsReview = true;
            }
        }
        else {
            this.logger.warn('No invoice date found, using today\'s date');
            invoiceDate = new Date();
            validationResult.warnings.push('No invoice date found');
            validationResult.needsReview = true;
        }
        const processingTimeMs = Date.now() - startTime;
        const dbStartTime = Date.now();
        const shouldReview = validationResult.needsReview || ocrError !== null || llmError !== null || !extractedData.totalAmount;
        const hasItems = extractedData.lineItems && extractedData.lineItems.length > 0;
        const useItemsTotal = hasItems;
        const invoice = await this.prisma.invoice.create({
            data: {
                tenantId,
                vendorId: null,
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
                needsReview: true,
                fileUrl,
            },
        });
        if (hasItems) {
            await Promise.all(extractedData.lineItems.map((item, index) => this.prisma.invoiceItem.create({
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
            })));
        }
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
        const dbDuration = Date.now() - dbStartTime;
        this.logger.log(`[ExtractionService] DB save took ${dbDuration}ms`);
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
            extractedVendorNameCandidate,
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
            invoiceDate: null,
            totalAmount: null,
            currency: 'ILS',
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
        currency_service_1.CurrencyService,
        deterministic_parser_service_1.DeterministicParserService])
], ExtractionService);
//# sourceMappingURL=extraction.service.js.map