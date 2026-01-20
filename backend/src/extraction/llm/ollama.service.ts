import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { ExtractedInvoiceData, EXTRACTION_SCHEMA } from './extraction-schema';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly client: AxiosInstance;
  private readonly maxRetries = 2;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    const baseURL =
      this.configService.get<string>('llm.ollamaUrl') ||
      'http://localhost:11434';
    this.model =
      this.configService.get<string>('llm.ollamaModel') || 'llama3.2:3b';

    this.client = axios.create({
      baseURL,
      timeout: 60000, // 60 seconds for LLM processing
    });

    this.logger.log(`Ollama configured: ${baseURL}, model: ${this.model}`);
  }

  /**
   * Extract structured invoice data from OCR text using Ollama
   * @param ocrText - Raw text extracted from invoice
   * @returns Structured invoice data
   */
  async extractFromText(
    ocrText: string,
    candidates?: any,
  ): Promise<ExtractedInvoiceData> {
    const totalStartTime = Date.now();

    // Debug logging: Show what text is being sent to LLM
    this.logger.debug(
      `[OllamaService] ========== OCR TEXT FOR LLM (${ocrText.length} chars) ==========`,
    );
    this.logger.debug(
      `[OllamaService] First 600 chars:\n${ocrText.substring(0, 600)}`,
    );
    if (ocrText.length > 600) {
      this.logger.debug(
        `[OllamaService] Last 400 chars:\n${ocrText.substring(Math.max(0, ocrText.length - 400))}`,
      );
    }
    if (candidates) {
      this.logger.debug(
        `[OllamaService] Deterministic candidates: ${JSON.stringify(candidates)}`,
      );
    }
    this.logger.debug(
      `[OllamaService] ========================================`,
    );

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildExtractionPrompt(ocrText, candidates);

    let lastError: Error | null = null;

    // Retry logic for connection failures
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.log(`Retry attempt ${attempt}/${this.maxRetries}`);
        }

        const llmStartTime = Date.now();
        // Use /api/chat instead of /api/generate (per OCR Quality Rules)
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
            temperature: 0, // Zero temperature for deterministic extraction
            num_predict: 2048,
          },
        });
        const llmDuration = Date.now() - llmStartTime;

        // Parse response from chat API (response.data.message.content)
        const responseText =
          response.data.message?.content || response.data.response || '';
        const extractedData = this.parseResponse(responseText);
        this.validateExtractedData(extractedData);

        const totalDuration = Date.now() - totalStartTime;
        this.logger.log(
          `[OllamaService] LLM extraction took ${totalDuration}ms (LLM: ${llmDuration}ms, parsing/validation: ${totalDuration - llmDuration}ms)`,
        );

        // Debug logging: Show extracted vendor name
        this.logger.debug(
          `[OllamaService] Extracted vendor: "${extractedData.vendorName}"`,
        );

        return extractedData;
      } catch (error) {
        lastError = error;

        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            this.logger.warn(
              `Ollama connection failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${error.message}`,
            );

            if (attempt < this.maxRetries) {
              // Wait before retry (exponential backoff)
              await this.sleep(1000 * Math.pow(2, attempt));
              continue;
            }
          }
        }

        // Non-retryable error or max retries reached
        break;
      }
    }

    // All retries failed
    const totalDuration = Date.now() - totalStartTime;
    this.logger.error(
      `[OllamaService] Ollama extraction failed after ${this.maxRetries + 1} attempts (${totalDuration}ms)`,
    );
    throw new Error(
      `Failed to extract invoice data: ${lastError?.message || 'Unknown error'}`,
    );
  }

  /**
   * T064: Select relevant OCR text chunks to prevent LLM context overflow
   * Limits to 4000 chars max (top 1500 + bottom 1500 + keyword lines)
   */
  private selectRelevantText(ocrText: string): string {
    const MAX_CHARS = 4000;

    // If text is short enough, return as is
    if (ocrText.length <= MAX_CHARS) {
      return ocrText;
    }

    const lines = ocrText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const keywordRegex =
      /(סה["״']?כ|לתשלום|יתרה לתשלום|סכום|מע["״']?מ|VAT|TOTAL|AMOUNT\s+DUE|Invoice|חשבונית|קבלה|מס['״]?|תאריך|Date|קופה)/i;

    // Take top 1500 chars
    let topText = '';
    let topChars = 0;
    for (const line of lines) {
      if (topChars + line.length > 1500) break;
      topText += line + '\n';
      topChars += line.length + 1;
    }

    // Take bottom 1500 chars
    let bottomText = '';
    let bottomChars = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (bottomChars + lines[i].length > 1500) break;
      bottomText = lines[i] + '\n' + bottomText;
      bottomChars += lines[i].length + 1;
    }

    // Take keyword lines (max remaining space)
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
   * T065: Extract total fallback using regex patterns
   * Searches for money patterns near keywords like "total", "סה\"כ"
   */
  private extractTotalFallback(ocrText: string): number | null {
    const lines = ocrText.split(/\r?\n/).map((l) => l.trim());

    // Look for lines containing total keywords
    const totalKeywords = [
      /סה["״']?כ\s*לתשלום/i,
      /לתשלום/i,
      /יתרה\s*לתשלום/i,
      /\btotal\b/i,
      /amount\s+due/i,
    ];

    const moneyPattern = /(\d{1,10}[.,]\d{2})\b/g;

    for (const line of lines) {
      // Check if line contains a total keyword
      const hasKeyword = totalKeywords.some((regex) => regex.test(line));
      if (!hasKeyword) continue;

      // Extract all money-like numbers from this line
      const matches = Array.from(line.matchAll(moneyPattern));
      if (matches.length > 0) {
        // Return the largest number (likely the total)
        const amounts = matches.map((m) => parseFloat(m[1].replace(',', '.')));
        const maxAmount = Math.max(...amounts);
        if (maxAmount > 0) {
          this.logger.log(
            `[OllamaService] Fallback total extraction found: ${maxAmount}`,
          );
          return maxAmount;
        }
      }
    }

    this.logger.warn('[OllamaService] Fallback total extraction failed');
    return null;
  }

  /**
   * Build system prompt for chat API
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
   * Build extraction prompt with OCR text and optional deterministic candidates
   */
  private buildExtractionPrompt(ocrText: string, candidates?: any): string {
    const relevantText = this.selectRelevantText(ocrText);

    let prompt = `Extract invoice data from the following OCR text:\n\n`;

    // Include deterministic candidates if provided
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

      prompt += `\n**Important:** These hints may help, but ALWAYS verify against the OCR text below. If the OCR text contradicts a hint, trust the OCR text.\n\n`;
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
    // Only confidence and warnings are truly required now
    const required = ['confidence', 'warnings'];

    for (const field of required) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Ensure warnings is an array
    if (!Array.isArray(data.warnings)) {
      data.warnings = [];
    }

    // Validate confidence object has required fields
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

    // Sanity checks (allow null values but validate when present)
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
      data.totalAmount = null; // Set to null if invalid
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
   * Generate a response from Ollama for generic prompts (used by insights)
   * @param prompt - The prompt to send to Ollama
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

        const response = await this.client.post('/api/generate', {
          model: this.model,
          prompt,
          stream: false,
        });

        return response.data.response || '';
      } catch (error) {
        lastError = error;

        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            this.logger.warn(
              `Ollama connection failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${error.message}`,
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
      `Ollama generate failed after ${this.maxRetries + 1} attempts`,
    );
    throw new Error(
      `Failed to generate response: ${lastError?.message || 'Unknown error'}`,
    );
  }
}
