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
    async extractFromText(ocrText, candidates) {
        const totalStartTime = Date.now();
        this.logger.debug(`[OllamaService] ========== OCR TEXT FOR LLM (${ocrText.length} chars) ==========`);
        this.logger.debug(`[OllamaService] First 600 chars:\n${ocrText.substring(0, 600)}`);
        if (ocrText.length > 600) {
            this.logger.debug(`[OllamaService] Last 400 chars:\n${ocrText.substring(Math.max(0, ocrText.length - 400))}`);
        }
        if (candidates) {
            this.logger.debug(`[OllamaService] Deterministic candidates: ${JSON.stringify(candidates)}`);
        }
        this.logger.debug(`[OllamaService] ========================================`);
        const systemPrompt = this.buildSystemPrompt();
        const userPrompt = this.buildExtractionPrompt(ocrText, candidates);
        let lastError = null;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    this.logger.log(`Retry attempt ${attempt}/${this.maxRetries}`);
                }
                const llmStartTime = Date.now();
                const response = await this.client.post('/api/chat', {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt,
                        },
                        {
                            role: 'user',
                            content: userPrompt,
                        },
                    ],
                    stream: false,
                    format: 'json',
                    options: {
                        temperature: 0,
                        num_predict: 2048,
                    },
                });
                const llmDuration = Date.now() - llmStartTime;
                const responseText = response.data.message?.content || response.data.response || '';
                const extractedData = this.parseResponse(responseText);
                this.validateExtractedData(extractedData);
                const totalDuration = Date.now() - totalStartTime;
                this.logger.log(`[OllamaService] LLM extraction took ${totalDuration}ms (LLM: ${llmDuration}ms, parsing/validation: ${totalDuration - llmDuration}ms)`);
                this.logger.debug(`[OllamaService] Extracted vendor: "${extractedData.vendorName}"`);
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
        const totalDuration = Date.now() - totalStartTime;
        this.logger.error(`[OllamaService] Ollama extraction failed after ${this.maxRetries + 1} attempts (${totalDuration}ms)`);
        throw new Error(`Failed to extract invoice data: ${lastError?.message || 'Unknown error'}`);
    }
    selectRelevantText(ocrText) {
        const MAX_CHARS = 4000;
        if (ocrText.length <= MAX_CHARS) {
            return ocrText;
        }
        const lines = ocrText
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean);
        const keywordRegex = /(סה["״']?כ|לתשלום|יתרה לתשלום|סכום|מע["״']?מ|VAT|TOTAL|AMOUNT\s+DUE|Invoice|חשבונית|קבלה|מס['״]?|תאריך|Date|קופה)/i;
        let topText = '';
        let topChars = 0;
        for (const line of lines) {
            if (topChars + line.length > 1500)
                break;
            topText += line + '\n';
            topChars += line.length + 1;
        }
        let bottomText = '';
        let bottomChars = 0;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (bottomChars + lines[i].length > 1500)
                break;
            bottomText = lines[i] + '\n' + bottomText;
            bottomChars += lines[i].length + 1;
        }
        const keywordLines = lines.filter(l => keywordRegex.test(l));
        let keywordText = '';
        let keywordChars = 0;
        const remainingSpace = MAX_CHARS - topChars - bottomChars;
        for (const line of keywordLines) {
            if (keywordChars + line.length > remainingSpace)
                break;
            keywordText += line + '\n';
            keywordChars += line.length + 1;
        }
        return topText + '\n--- KEYWORD LINES ---\n' + keywordText + '\n--- END ---\n' + bottomText;
    }
    extractTotalFallback(ocrText) {
        const lines = ocrText.split(/\r?\n/).map(l => l.trim());
        const totalKeywords = [
            /סה["״']?כ\s*לתשלום/i,
            /לתשלום/i,
            /יתרה\s*לתשלום/i,
            /\btotal\b/i,
            /amount\s+due/i,
        ];
        const moneyPattern = /(\d{1,10}[.,]\d{2})\b/g;
        for (const line of lines) {
            const hasKeyword = totalKeywords.some(regex => regex.test(line));
            if (!hasKeyword)
                continue;
            const matches = Array.from(line.matchAll(moneyPattern));
            if (matches.length > 0) {
                const amounts = matches.map(m => parseFloat(m[1].replace(',', '.')));
                const maxAmount = Math.max(...amounts);
                if (maxAmount > 0) {
                    this.logger.log(`[OllamaService] Fallback total extraction found: ${maxAmount}`);
                    return maxAmount;
                }
            }
        }
        this.logger.warn('[OllamaService] Fallback total extraction failed');
        return null;
    }
    buildSystemPrompt() {
        return `You are a strict invoice/receipt extraction engine.
You extract structured data from Hebrew (עברית) or English documents.

**CRITICAL: Extract data ONLY from the current document. Never use information from previous conversations.**

Return ONLY a valid JSON object (no markdown, no explanations, no extra text).

JSON Schema:
{
  "vendorName": string | null,
  "invoiceDate": string | null,   // YYYY-MM-DD
  "totalAmount": number | null,
  "currency": "ILS" | "USD" | "EUR" | null,
  "invoiceNumber": string | null,
  "vatAmount": number | null,
  "subtotalAmount": number | null,
  "lineItems": [
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

- **vendorName**: Extract the EXACT business/company name from THIS document ONLY.
  * Located at the TOP (first 1-3 lines)
  * Hebrew: "בן בוטנרו ייעוץ תזונה", "קריאטיב סופטוור בע״מ"
  * English: "Apple Inc.", "Google LLC"
  * Include suffix if present (בע״מ, Ltd., Inc.)
  
- **totalAmount**: MOST CRITICAL. Extract the final amount paid/due.
  * Hebrew keywords: "סה״כ לתשלום", "לתשלום", "יתרה לתשלום", "סה״כ"
  * English keywords: "Total", "Amount Due", "Grand Total", "Balance"
  * Usually at bottom, largest number, near VAT
  
- **invoiceDate**: Extract from "תאריך"/"Date". Convert to YYYY-MM-DD.

- **currency**: ₪→ILS, $→USD, €→EUR. If unclear and Hebrew doc, assume ILS with warning.

- **invoiceNumber**: Extract from "מס׳"/"חשבונית"/"Invoice #".

- **lineItems**: Extract items if present, else [].

- **confidence**: 0-1 for each field. If unclear, set null + low confidence + warning.

Return ONLY valid JSON.`;
    }
    buildExtractionPrompt(ocrText, candidates) {
        const relevantText = this.selectRelevantText(ocrText);
        let prompt = `Extract invoice data from the following OCR text:\n\n`;
        if (candidates) {
            prompt += `**HINTS from deterministic parsing (use if confident):**\n`;
            if (candidates.bestTotal !== null && candidates.bestTotal !== undefined) {
                prompt += `- Detected total amount: ${candidates.bestTotal}\n`;
            }
            if (candidates.bestCurrency) {
                prompt += `- Detected currency: ${candidates.bestCurrency}\n`;
            }
            if (candidates.bestDate) {
                prompt += `- Detected date: ${candidates.bestDate}\n`;
            }
            if (candidates.vendorCandidates && candidates.vendorCandidates.length > 0) {
                prompt += `- Vendor candidates from top of document: ${candidates.vendorCandidates.slice(0, 3).join(', ')}\n`;
            }
            prompt += `\n**Important:** These hints may help, but ALWAYS verify against the OCR text below. If the OCR text contradicts a hint, trust the OCR text.\n\n`;
        }
        prompt += `OCR TEXT:\n${relevantText}`;
        return prompt;
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
        const required = ['confidence', 'warnings'];
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
        if (data.totalAmount !== null && (typeof data.totalAmount !== 'number' || !Number.isFinite(data.totalAmount) || data.totalAmount <= 0)) {
            data.warnings.push('Invalid totalAmount extracted');
            data.confidence.totalAmount = Math.min(data.confidence.totalAmount ?? 0.5, 0.3);
            data.totalAmount = null;
        }
        if (data.totalAmount === null) {
            data.warnings.push('Total amount not found');
            data.confidence.totalAmount = 0;
        }
        const allowedCurrencies = new Set(['ILS', 'USD', 'EUR']);
        if (data.currency !== null && (typeof data.currency !== 'string' || !allowedCurrencies.has(data.currency))) {
            data.warnings.push('Unrecognized currency; defaulted to ILS');
            data.currency = 'ILS';
            data.confidence.currency = Math.min(data.confidence.currency ?? 0.5, 0.4);
        }
        if (data.currency === null) {
            data.warnings.push('Currency not found, defaulted to ILS');
            data.currency = 'ILS';
            data.confidence.currency = 0;
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