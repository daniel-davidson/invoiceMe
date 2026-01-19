/**
 * Docs Verified: LLM Provider Integrations
 * - Ollama: https://github.com/ollama/ollama/blob/main/docs/api.md
 * - Groq: https://console.groq.com/docs/api-reference
 * - Together AI: https://docs.together.ai/reference/chat-completions
 * - OpenRouter: https://openrouter.ai/docs/api-reference
 * - Verified on: 2026-01-19
 * - SDK: Native fetch API (no external SDK)
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EXTRACTION_SCHEMA, ExtractedInvoiceData } from './extraction-schema';

/**
 * Unified LLM Service that supports multiple providers:
 * - Ollama (local/self-hosted)
 * - Groq (cloud, fast, free tier)
 * - Together AI (cloud)
 * - OpenRouter (cloud, multiple models)
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly provider: string;
  private readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly ollamaUrl: string;

  constructor(private readonly configService: ConfigService) {
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

  /**
   * Extract invoice data from OCR text
   */
  async extractFromText(ocrText: string): Promise<ExtractedInvoiceData> {
    const prompt = this.buildExtractionPrompt(ocrText);

    let response: string;
    try {
      response = await this.generate(prompt);
    } catch (error) {
      this.logger.error(`LLM extraction failed: ${error}`);
      return this.getFallbackExtraction(ocrText);
    }

    try {
      return this.parseResponse(response);
    } catch (error) {
      this.logger.warn(`Failed to parse LLM response, using fallback`);
      return this.getFallbackExtraction(ocrText);
    }
  }

  /**
   * Generate text from prompt using configured provider
   */
  async generate(prompt: string): Promise<string> {
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

  private async generateOllama(prompt: string): Promise<string> {
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

  private async generateGroq(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
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
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private async generateTogether(prompt: string): Promise<string> {
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

  private async generateOpenRouter(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
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
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private buildExtractionPrompt(ocrText: string): string {
    return `You are an invoice data extractor. Extract structured data from the following invoice text.

OUTPUT FORMAT (JSON only, no other text):
${JSON.stringify(EXTRACTION_SCHEMA, null, 2)}

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

  private parseResponse(response: string): ExtractedInvoiceData {
    // Try to extract JSON from response
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

  private getFallbackExtraction(ocrText: string): ExtractedInvoiceData {
    // Try to extract basic info with regex
    const amountMatch = ocrText.match(/[\$€£₪]?\s*([\d,]+\.?\d*)/);
    const dateMatch = ocrText.match(
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
    );

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

  private normalizeDate(dateStr: string): string | null {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }
}
