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
var LlmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const extraction_schema_1 = require("./extraction-schema");
let LlmService = LlmService_1 = class LlmService {
    configService;
    logger = new common_1.Logger(LlmService_1.name);
    provider;
    model;
    apiKey;
    ollamaUrl;
    constructor(configService) {
        this.configService = configService;
        this.provider = this.configService.get('llm.provider') || 'ollama';
        this.model =
            this.configService.get('llm.model') ||
                this.configService.get('llm.ollamaModel') ||
                'llama3.2:3b';
        this.apiKey = this.configService.get('llm.apiKey');
        this.ollamaUrl =
            this.configService.get('llm.ollamaUrl') || 'http://localhost:11434';
        this.logger.log(`LLM Provider: ${this.provider}, Model: ${this.model}`);
    }
    async extractFromText(ocrText) {
        const prompt = this.buildExtractionPrompt(ocrText);
        let response;
        try {
            response = await this.generate(prompt);
        }
        catch (error) {
            this.logger.error(`LLM extraction failed: ${error}`);
            return this.getFallbackExtraction(ocrText);
        }
        try {
            return this.parseResponse(response);
        }
        catch (error) {
            this.logger.warn(`Failed to parse LLM response, using fallback`);
            return this.getFallbackExtraction(ocrText);
        }
    }
    async generate(prompt) {
        switch (this.provider) {
            case 'ollama':
                return this.generateOllama(prompt);
            case 'groq':
                return this.generateGroq(prompt);
            case 'together':
                return this.generateTogether(prompt);
            case 'openrouter':
                return this.generateOpenRouter(prompt);
            default:
                return this.generateOllama(prompt);
        }
    }
    async generateOllama(prompt) {
        const url = `${this.ollamaUrl}/api/generate`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                prompt,
                stream: false,
                options: {
                    temperature: 0.1,
                    num_predict: 1024,
                },
            }),
        });
        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }
        const data = await response.json();
        return data.response || '';
    }
    async generateGroq(prompt) {
        if (!this.apiKey) {
            throw new Error('Groq API key not configured');
        }
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model || 'llama-3.2-3b-preview',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 1024,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Groq error: ${response.status} - ${error}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }
    async generateTogether(prompt) {
        if (!this.apiKey) {
            throw new Error('Together API key not configured');
        }
        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model || 'meta-llama/Llama-3.2-3B-Instruct-Turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 1024,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Together error: ${response.status} - ${error}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }
    async generateOpenRouter(prompt) {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured');
        }
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://invoiceme.app',
            },
            body: JSON.stringify({
                model: this.model || 'meta-llama/llama-3.2-3b-instruct:free',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 1024,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenRouter error: ${response.status} - ${error}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }
    buildExtractionPrompt(ocrText) {
        return `You are an invoice data extractor. Extract structured data from the following invoice text.

OUTPUT FORMAT (JSON only, no other text):
${JSON.stringify(extraction_schema_1.EXTRACTION_SCHEMA, null, 2)}

RULES:
1. Extract vendorName (the business/company that issued the invoice)
2. Extract totalAmount as a number
3. Extract currency as 3-letter ISO code (USD, EUR, ILS, etc.)
4. Extract invoiceDate in YYYY-MM-DD format
5. Set confidence scores (0.0-1.0) for each field
6. Add any warnings about unclear or missing data
7. If a field cannot be extracted, use null and low confidence

INVOICE TEXT:
${ocrText}

JSON OUTPUT:`;
    }
    parseResponse(response) {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }
        const data = JSON.parse(jsonMatch[0]);
        return {
            vendorName: data.vendorName || undefined,
            invoiceDate: data.invoiceDate || undefined,
            totalAmount: data.totalAmount ? Number(data.totalAmount) : undefined,
            currency: data.currency || undefined,
            invoiceNumber: data.invoiceNumber || undefined,
            vatAmount: data.vatAmount ? Number(data.vatAmount) : undefined,
            subtotalAmount: data.subtotalAmount ? Number(data.subtotalAmount) : undefined,
            confidence: data.confidence || {
                vendorName: 0.5,
                invoiceDate: 0.5,
                totalAmount: 0.5,
                currency: 0.5,
            },
            warnings: data.warnings || [],
        };
    }
    getFallbackExtraction(ocrText) {
        const amountMatch = ocrText.match(/[\$€£₪]?\s*([\d,]+\.?\d*)/);
        const dateMatch = ocrText.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/);
        return {
            vendorName: undefined,
            invoiceDate: dateMatch ? this.normalizeDate(dateMatch[1]) ?? undefined : undefined,
            totalAmount: amountMatch
                ? parseFloat(amountMatch[1].replace(',', ''))
                : undefined,
            currency: undefined,
            invoiceNumber: undefined,
            vatAmount: undefined,
            subtotalAmount: undefined,
            confidence: {
                vendorName: 0,
                invoiceDate: dateMatch ? 0.3 : 0,
                totalAmount: amountMatch ? 0.3 : 0,
                currency: 0,
            },
            warnings: ['LLM extraction failed, using regex fallback'],
        };
    }
    normalizeDate(dateStr) {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime()))
                return null;
            return date.toISOString().split('T')[0];
        }
        catch {
            return null;
        }
    }
};
exports.LlmService = LlmService;
exports.LlmService = LlmService = LlmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LlmService);
//# sourceMappingURL=llm.service.js.map