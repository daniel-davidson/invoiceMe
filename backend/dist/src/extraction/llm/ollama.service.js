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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OllamaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let OllamaService = OllamaService_1 = class OllamaService {
    configService;
    logger = new common_1.Logger(OllamaService_1.name);
    client;
    maxRetries = 2;
    model;
    constructor(configService) {
        this.configService = configService;
        const baseURL = this.configService.get('llm.ollamaUrl') || 'http://localhost:11434';
        this.model = this.configService.get('llm.ollamaModel') || 'llama3.2:3b';
        this.client = axios_1.default.create({
            baseURL,
            timeout: 60000,
        });
        this.logger.log(`Ollama configured: ${baseURL}, model: ${this.model}`);
    }
    async extractFromText(ocrText) {
        const prompt = this.buildExtractionPrompt(ocrText);
        let lastError = null;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    this.logger.log(`Retry attempt ${attempt}/${this.maxRetries}`);
                }
                const response = await this.client.post('/api/generate', {
                    model: this.model,
                    prompt,
                    stream: false,
                    format: 'json',
                });
                const extractedData = this.parseResponse(response.data.response);
                this.validateExtractedData(extractedData);
                return extractedData;
            }
            catch (error) {
                lastError = error;
                if (axios_1.default.isAxiosError(error)) {
                    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                        this.logger.warn(`Ollama connection failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${error.message}`);
                        if (attempt < this.maxRetries) {
                            await this.sleep(1000 * Math.pow(2, attempt));
                            continue;
                        }
                    }
                }
                break;
            }
        }
        this.logger.error(`Ollama extraction failed after ${this.maxRetries + 1} attempts`);
        throw new Error(`Failed to extract invoice data: ${lastError?.message || 'Unknown error'}`);
    }
    selectRelevantText(ocrText) {
        const lines = ocrText
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean);
        const keywordRegex = /(סה["״']?כ|לתשלום|יתרה לתשלום|סכום|מע["״']?מ|VAT|TOTAL|AMOUNT\s+DUE|Invoice|חשבונית|קבלה|מס['״]?|תאריך|Date|קופה)/i;
        const head = lines.slice(0, 40);
        const tail = lines.slice(Math.max(0, lines.length - 40));
        const keywordLines = lines.filter(l => keywordRegex.test(l)).slice(0, 80);
        const seen = new Set();
        return [...head, ...keywordLines, ...tail]
            .filter(l => {
            const k = l.toLowerCase();
            if (seen.has(k))
                return false;
            seen.add(k);
            return true;
        })
            .join('\n');
    }
    buildExtractionPrompt(ocrText) {
        const relevantText = this.selectRelevantText(ocrText);
        return `You are a strict invoice/receipt extraction engine.
    You receive OCR text from Hebrew (עברית) or English documents.
    
    Return ONLY a valid JSON object (no markdown, no explanations, no extra text).
    
    The JSON MUST match this schema exactly:
    {
      "vendorName": string | null,
      "invoiceDate": string | null,   // YYYY-MM-DD
      "totalAmount": number | null,
      "currency": "ILS" | "USD" | "EUR" | null,
      "invoiceNumber": string | null,
      "vatAmount": number | null,      // VAT/tax amount
      "subtotalAmount": number | null, // Subtotal before tax
      "lineItems": [                   // Items purchased (if available)
        {
          "description": string,
          "quantity": number | null,
          "unitPrice": number | null,
          "amount": number | null
        }
      ],
      "confidence": { "vendorName": number, "invoiceDate": number, "totalAmount": number, "currency": number },
      "warnings": string[]
    }
    
    Rules:
    - vendorName: the supplier/store name. Often appears at the very top header, sometimes with phone/address.
    - invoiceDate: extract from "תאריך" or "Date". Convert to YYYY-MM-DD.
    - totalAmount: final amount paid/due. Prefer lines near:
      Hebrew: "סה\"כ לתשלום", "לתשלום", "יתרה לתשלום", "סכום"
      English: "Total", "Amount Due"
    - currency: ₪ => ILS, $ => USD, € => EUR.
      If currency is not explicit but the invoice is Hebrew/Israel, set "ILS" and add warning "Currency assumed ILS".
    - invoiceNumber: extract if present ("מס'", "חשבונית", "קבלה", "Invoice #"). If missing, null.
    - vatAmount: extract VAT/tax if shown ("מע\"מ", "VAT", "Tax")
    - subtotalAmount: extract subtotal before tax if shown
    - lineItems: extract individual items if present in the invoice. Each item should have:
      * description: item/product name
      * quantity: how many units
      * unitPrice: price per unit (if shown)
      * amount: total for this line item
      If no itemized list is found, return empty array [].
    - If the OCR text contains MULTIPLE receipts/invoices (multiple totals / multiple 'קופה' blocks):
      Extract the LAST receipt/invoice and add warning "Multiple documents detected; extracted last one".
    - confidence values are 0..1.
    - If any field is unclear, set it to null, reduce confidence, and add a warning.
    
    OCR TEXT:
    ${relevantText}`;
        ;
    }
    parseResponse(responseText) {
        try {
            const start = responseText.indexOf('{');
            const end = responseText.lastIndexOf('}');
            if (start === -1 || end === -1 || end <= start) {
                throw new Error('No JSON found in response');
            }
            const jsonText = responseText.slice(start, end + 1);
            const parsed = JSON.parse(jsonText);
            return parsed;
        }
        catch (error) {
            this.logger.error(`Failed to parse LLM response: ${error.message}`);
            throw new Error('Invalid JSON response from LLM');
        }
    }
    validateExtractedData(data) {
        const required = ['vendorName', 'invoiceDate', 'totalAmount', 'currency', 'confidence', 'warnings'];
        for (const field of required) {
            if (!(field in data)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        if (!Array.isArray(data.warnings)) {
            data.warnings = [];
        }
        const confidenceFields = ['vendorName', 'invoiceDate', 'totalAmount', 'currency'];
        for (const field of confidenceFields) {
            if (!(field in data.confidence)) {
                data.confidence[field] = 0.5;
            }
        }
        if (typeof data.totalAmount !== 'number' || !Number.isFinite(data.totalAmount) || data.totalAmount <= 0) {
            data.warnings.push('Invalid totalAmount extracted');
            data.confidence.totalAmount = Math.min(data.confidence.totalAmount ?? 0.5, 0.3);
        }
        const allowedCurrencies = new Set(['ILS', 'USD', 'EUR']);
        if (typeof data.currency !== 'string' || !allowedCurrencies.has(data.currency)) {
            data.warnings.push('Unrecognized currency; defaulted to ILS');
            data.currency = 'ILS';
            data.confidence.currency = Math.min(data.confidence.currency ?? 0.5, 0.4);
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async generate(prompt) {
        let lastError = null;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    this.logger.log(`Generate retry attempt ${attempt}/${this.maxRetries}`);
                }
                const response = await this.client.post('/api/generate', {
                    model: this.model,
                    prompt,
                    stream: false,
                });
                return response.data.response || '';
            }
            catch (error) {
                lastError = error;
                if (axios_1.default.isAxiosError(error)) {
                    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                        this.logger.warn(`Ollama connection failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${error.message}`);
                        if (attempt < this.maxRetries) {
                            await this.sleep(1000 * Math.pow(2, attempt));
                            continue;
                        }
                    }
                }
                break;
            }
        }
        this.logger.error(`Ollama generate failed after ${this.maxRetries + 1} attempts`);
        throw new Error(`Failed to generate response: ${lastError?.message || 'Unknown error'}`);
    }
};
exports.OllamaService = OllamaService;
exports.OllamaService = OllamaService = OllamaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OllamaService);
//# sourceMappingURL=ollama.service.js.map