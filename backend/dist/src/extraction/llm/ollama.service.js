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
const axios_1 = __importDefault(require("axios"));
const extraction_schema_1 = require("./extraction-schema");
let OllamaService = OllamaService_1 = class OllamaService {
    logger = new common_1.Logger(OllamaService_1.name);
    client;
    maxRetries = 2;
    constructor() {
        this.client = axios_1.default.create({
            baseURL: 'http://localhost:11434',
            timeout: 60000,
        });
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
                    model: 'llama2',
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
    buildExtractionPrompt(ocrText) {
        return `You are an invoice data extraction assistant. Extract structured information from the following invoice text.

IMPORTANT INSTRUCTIONS:
1. Extract the vendor/supplier name (the business that issued the invoice)
2. Extract the total amount and currency code (ISO 4217, e.g., USD, EUR, ILS)
3. Extract the invoice date in YYYY-MM-DD format
4. Extract the invoice number if available
5. For each field, provide a confidence score between 0 and 1
6. List any warnings or uncertainties in the "warnings" array
7. Return ONLY valid JSON matching the schema below

SCHEMA:
${JSON.stringify(extraction_schema_1.EXTRACTION_SCHEMA, null, 2)}

INVOICE TEXT:
${ocrText}

Extract the invoice data as JSON:`;
    }
    parseResponse(responseText) {
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed;
        }
        catch (error) {
            this.logger.error(`Failed to parse LLM response: ${error.message}`);
            throw new Error('Invalid JSON response from LLM');
        }
    }
    validateExtractedData(data) {
        const required = ['vendorName', 'totalAmount', 'currency', 'confidence', 'warnings'];
        for (const field of required) {
            if (!(field in data)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        const confidenceFields = ['vendorName', 'invoiceDate', 'totalAmount', 'currency'];
        for (const field of confidenceFields) {
            if (!(field in data.confidence)) {
                data.confidence[field] = 0.5;
            }
        }
        if (!Array.isArray(data.warnings)) {
            data.warnings = [];
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
                    model: 'llama2',
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
    __metadata("design:paramtypes", [])
], OllamaService);
//# sourceMappingURL=ollama.service.js.map