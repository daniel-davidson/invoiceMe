import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { ExtractedInvoiceData } from './extraction-schema';

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly client: AxiosInstance;
  private readonly maxRetries = 2;
  private readonly model: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>('llm.groqApiKey') ||
      this.configService.get<string>('GROQ_API_KEY') ||
      '';
    this.model =
      this.configService.get<string>('llm.groqModel') ||
      this.configService.get<string>('GROQ_MODEL') ||
      'mixtral-8x7b-32768';

    if (!this.apiKey) {
      this.logger.warn('GROQ_API_KEY not set. Groq service will not work.');
    }

    this.client = axios.create({
      baseURL: 'https://api.groq.com/openai/v1',
      timeout: 60000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`Groq configured with model: ${this.model}`);
  }

  /**
   * Extract structured invoice data from OCR text using Groq
   * @param ocrText - Raw text extracted from invoice
   * @param candidates - Optional deterministic candidates
   * @returns Structured invoice data
   */
  async extractFromText(
    ocrText: string,
    candidates?: any,
  ): Promise<ExtractedInvoiceData> {
    const totalStartTime = Date.now();

    this.logger.debug(
      `[GroqService] Processing OCR text (${ocrText.length} chars)`,
    );

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildExtractionPrompt(ocrText, candidates);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.log(`Retry attempt ${attempt}/${this.maxRetries}`);
        }

        const llmStartTime = Date.now();
        const response = await this.client.post('/chat/completions', {
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
          temperature: 0,
          response_format: { type: 'json_object' },
          max_tokens: 2048,
        });

        const llmDuration = Date.now() - llmStartTime;

        const responseText = response.data.choices[0]?.message?.content || '';
        const extractedData = this.parseResponse(responseText);
        this.validateExtractedData(extractedData);

        const totalDuration = Date.now() - totalStartTime;
        this.logger.log(
          `[GroqService] Extraction completed in ${totalDuration}ms (LLM: ${llmDuration}ms)`,
        );

        return extractedData;
      } catch (error) {
        lastError = error;

        if (axios.isAxiosError(error)) {
          if (
            error.code === 'ECONNREFUSED' ||
            error.code === 'ETIMEDOUT' ||
            error.response?.status === 429 ||
            error.response?.status >= 500
          ) {
            this.logger.warn(
              `Groq API error (attempt ${attempt + 1}/${this.maxRetries + 1}): ${error.message}`,
            );

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
    this.logger.error(
      `[GroqService] Extraction failed after ${this.maxRetries + 1} attempts (${totalDuration}ms)`,
    );
    throw new Error(
      `Failed to extract invoice data: ${lastError?.message || 'Unknown error'}`,
    );
  }

  /**
   * Select relevant OCR text chunks to prevent context overflow
   */
  private selectRelevantText(ocrText: string): string {
    const MAX_CHARS = 4000;

    if (ocrText.length <= MAX_CHARS) {
      return ocrText;
    }

    const lines = ocrText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const keywordRegex =
      /(סה["״']?כ|לתשלום|יתרה לתשלום|סכום|מע["״']?מ|VAT|TOTAL|AMOUNT\s+DUE|Invoice|חשבונית|קבלה|מס['״]?|תאריך|Date|קופה)/i;

    let topText = '';
    let topChars = 0;
    for (const line of lines) {
      if (topChars + line.length > 1500) break;
      topText += line + '\n';
      topChars += line.length + 1;
    }

    let bottomText = '';
    let bottomChars = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (bottomChars + lines[i].length > 1500) break;
      bottomText = lines[i] + '\n' + bottomText;
      bottomChars += lines[i].length + 1;
    }

    const keywordLines = lines.filter((l) => keywordRegex.test(l));
    let keywordText = '';
    let keywordChars = 0;
    const remainingSpace = MAX_CHARS - topChars - bottomChars;

    for (const line of keywordLines) {
      if (keywordChars + line.length > remainingSpace) break;
      keywordText += line + '\n';
      keywordChars += line.length + 1;
    }

    return (
      topText +
      '\n--- KEYWORD LINES ---\n' +
      keywordText +
      '\n--- END ---\n' +
      bottomText
    );
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(): string {
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

  /**
   * Build extraction prompt with OCR text and optional candidates
   */
  private buildExtractionPrompt(ocrText: string, candidates?: any): string {
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
      if (
        candidates.vendorCandidates &&
        candidates.vendorCandidates.length > 0
      ) {
        prompt += `- Vendor candidates from top of document: ${candidates.vendorCandidates.slice(0, 3).join(', ')}\n`;
      }

      prompt += `\n**Important:** These hints may help, but ALWAYS verify against the OCR text below.\n\n`;
    }

    prompt += `OCR TEXT:\n${relevantText}`;

    return prompt;
  }

  /**
   * Parse the LLM response into structured data
   */
  private parseResponse(responseText: string): ExtractedInvoiceData {
    try {
      const start = responseText.indexOf('{');
      const end = responseText.lastIndexOf('}');

      if (start === -1 || end === -1 || end <= start) {
        throw new Error('No JSON found in response');
      }

      const jsonText = responseText.slice(start, end + 1);
      const parsed = JSON.parse(jsonText);
      return parsed as ExtractedInvoiceData;
    } catch (error) {
      this.logger.error(`Failed to parse LLM response: ${error.message}`);
      throw new Error('Invalid JSON response from LLM');
    }
  }

  /**
   * Validate extracted data has required fields
   */
  private validateExtractedData(data: ExtractedInvoiceData): void {
    const required = ['confidence', 'warnings'];

    for (const field of required) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(data.warnings)) {
      data.warnings = [];
    }

    const confidenceFields = [
      'vendorName',
      'invoiceDate',
      'totalAmount',
      'currency',
    ];
    for (const field of confidenceFields) {
      if (!(field in data.confidence)) {
        data.confidence[field] = 0.5;
      }
    }

    if (
      data.totalAmount !== null &&
      (typeof data.totalAmount !== 'number' ||
        !Number.isFinite(data.totalAmount) ||
        data.totalAmount <= 0)
    ) {
      data.warnings.push('Invalid totalAmount extracted');
      data.confidence.totalAmount = Math.min(
        data.confidence.totalAmount ?? 0.5,
        0.3,
      );
      data.totalAmount = null;
    }

    if (data.totalAmount === null) {
      data.warnings.push('Total amount not found');
      data.confidence.totalAmount = 0;
    }

    const allowedCurrencies = new Set(['ILS', 'USD', 'EUR']);
    if (
      data.currency !== null &&
      (typeof data.currency !== 'string' ||
        !allowedCurrencies.has(data.currency))
    ) {
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

  /**
   * Sleep helper for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate a response from Groq for generic prompts (used by insights)
   * @param prompt - The prompt to send
   * @returns The generated text response
   */
  async generate(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.log(
            `Generate retry attempt ${attempt}/${this.maxRetries}`,
          );
        }

        const response = await this.client.post('/chat/completions', {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        });

        return response.data.choices[0]?.message?.content || '';
      } catch (error) {
        lastError = error;

        if (axios.isAxiosError(error)) {
          if (
            error.code === 'ECONNREFUSED' ||
            error.code === 'ETIMEDOUT' ||
            error.response?.status === 429 ||
            error.response?.status >= 500
          ) {
            this.logger.warn(
              `Groq API error (attempt ${attempt + 1}/${this.maxRetries + 1}): ${error.message}`,
            );

            if (attempt < this.maxRetries) {
              await this.sleep(1000 * Math.pow(2, attempt));
              continue;
            }
          }
        }

        break;
      }
    }

    this.logger.error(
      `Groq generate failed after ${this.maxRetries + 1} attempts`,
    );
    throw new Error(
      `Failed to generate response: ${lastError?.message || 'Unknown error'}`,
    );
  }
}
