/**
 * Docs Verified: LLM Provider Integrations
 * - Ollama: https://github.com/ollama/ollama/blob/main/docs/api.md
 * - Groq: https://console.groq.com/docs/api-reference (OpenAI-compatible)
 * - Together AI: https://docs.together.ai/reference/chat-completions
 * - OpenRouter: https://openrouter.ai/docs/api-reference
 * - Verified on: 2026-01-20
 * - SDK: Native fetch API (no external SDK)
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EXTRACTION_SCHEMA, ExtractedInvoiceData } from './extraction-schema';

/**
 * Unified LLM Service that supports multiple providers:
 * - Groq (cloud, fast, free tier) - RECOMMENDED for production
 * - Ollama (local/self-hosted) - For offline development
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
  private readonly maxRetries = 2;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get('llm.provider') || 'groq';

    // Default models per provider
    const defaultModels = {
      groq: 'llama-3.1-8b-instant', // Fast, active model with JSON support
      ollama: 'llama3.2:3b',
      together: 'meta-llama/Llama-3.2-3B-Instruct-Turbo',
      openrouter: 'meta-llama/llama-3.2-3b-instruct:free',
    };

    this.model =
      this.configService.get('llm.model') ||
      this.configService.get('llm.ollamaModel') ||
      defaultModels[this.provider] ||
      defaultModels.groq;

    this.apiKey = this.configService.get('llm.apiKey');
    this.ollamaUrl =
      this.configService.get('llm.ollamaUrl') || 'http://localhost:11434';

    this.logger.log(`LLM Provider: ${this.provider}, Model: ${this.model}`);

    // Warn if API key missing for cloud providers
    if (
      ['groq', 'together', 'openrouter'].includes(this.provider) &&
      !this.apiKey
    ) {
      this.logger.warn(
        `${this.provider} provider requires LLM_API_KEY but it's not set`,
      );
    }
  }

  /**
   * Extract invoice data from OCR text with deterministic candidates
   * @param ocrText - Raw OCR text from invoice
   * @param candidates - Optional deterministic parsing results (hints for LLM)
   */
  async extractFromText(
    ocrText: string,
    candidates?: any,
  ): Promise<ExtractedInvoiceData> {
    const totalStartTime = Date.now();

    // Smart OCR text selection (preserve important sections)
    const relevantText = this.selectRelevantText(ocrText);

    this.logger.debug(
      `[LlmService] OCR text: ${ocrText.length} chars → ${relevantText.length} chars after smart truncation`,
    );

    if (candidates) {
      this.logger.debug(
        `[LlmService] Deterministic candidates: ${JSON.stringify(candidates)}`,
      );
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildExtractionPrompt(relevantText, candidates);

    let lastError: Error | null = null;

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.log(`Retry attempt ${attempt}/${this.maxRetries}`);
          await this.sleep(1000 * Math.pow(2, attempt - 1));
        }

        const llmStartTime = Date.now();
        const response = await this.generateWithMessages([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ]);
        const llmDuration = Date.now() - llmStartTime;

        const extractedData = this.parseResponse(response);
        this.validateExtractedData(extractedData);

        const totalDuration = Date.now() - totalStartTime;
        this.logger.log(
          `[LlmService] Extraction took ${totalDuration}ms (LLM: ${llmDuration}ms, parsing: ${totalDuration - llmDuration}ms)`,
        );

        return extractedData;
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || attempt === this.maxRetries) {
          break; // Non-retryable or max retries reached
        }

        this.logger.warn(
          `LLM call failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${error.message}`,
        );
      }
    }

    // All retries failed - use fallback
    const totalDuration = Date.now() - totalStartTime;
    this.logger.error(
      `[LlmService] Extraction failed after ${this.maxRetries + 1} attempts (${totalDuration}ms): ${lastError?.message}`,
    );

    return this.getFallbackExtraction(ocrText, candidates);
  }

  /**
   * Generate text using chat messages (supports system + user prompts)
   */
  private async generateWithMessages(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    switch (this.provider) {
      case 'groq':
        return this.generateGroq(messages);
      case 'ollama':
        return this.generateOllama(messages);
      case 'together':
        return this.generateTogether(messages);
      case 'openrouter':
        return this.generateOpenRouter(messages);
      default:
        // Default to Groq
        return this.generateGroq(messages);
    }
  }

  /**
   * Generate text from simple prompt (legacy method for insights)
   */
  async generate(prompt: string): Promise<string> {
    return this.generateWithMessages([{ role: 'user', content: prompt }]);
  }

  private async generateGroq(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured (LLM_API_KEY required)');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: 0, // Deterministic extraction
            max_tokens: 2048,
            response_format: { type: 'json_object' }, // CRITICAL: Force JSON output like Ollama
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      // Log token usage if available
      if (data.usage) {
        this.logger.debug(
          `[Groq] Tokens: ${data.usage.prompt_tokens} prompt + ${data.usage.completion_tokens} completion = ${data.usage.total_tokens} total`,
        );
      }

      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Groq API request timeout (60s)');
      }
      throw error;
    }
  }

  private async generateOllama(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          format: 'json',
          options: {
            temperature: 0,
            num_predict: 2048,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      const data = await response.json();
      return data.message?.content || data.response || '';
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Ollama request timeout (60s)');
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          'Cannot connect to Ollama (is it running at ' + this.ollamaUrl + '?)',
        );
      }
      throw error;
    }
  }

  private async generateTogether(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Together API key not configured');
    }

    const response = await fetch(
      'https://api.together.xyz/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0,
          max_tokens: 2048,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Together error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private async generateOpenRouter(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
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
          model: this.model,
          messages,
          temperature: 0,
          max_tokens: 2048,
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

  /**
   * Smart OCR text selection: preserves important sections, truncates middle
   * Strategy: Keep header (vendor), footer (totals), and keyword lines
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

    // Keywords that indicate important lines
    const keywordRegex =
      /(סה["״']?כ|לתשלום|יתרה\s*לתשלום|מע["״']?מ|VAT|TOTAL|AMOUNT\s+DUE|Invoice|חשבונית|קבלה|תאריך|Date|מס['״]?|עוסק|ח\.?פ|ספק|Vendor|Supplier|Tax\s+ID)/i;

    // Take top 30 lines (header - vendor info)
    const headerLines = lines.slice(0, 30);
    const headerText = headerLines.join('\n');

    // Take bottom 30 lines (footer - totals)
    const footerLines = lines.slice(-30);
    const footerText = footerLines.join('\n');

    // Extract keyword lines from middle
    const middleLines = lines.slice(30, -30);
    const keywordLines = middleLines.filter((l) => keywordRegex.test(l));
    const keywordText = keywordLines.slice(0, 20).join('\n'); // Max 20 keyword lines

    // Calculate remaining space
    const usedChars =
      headerText.length + footerText.length + keywordText.length;
    const remainingSpace = MAX_CHARS - usedChars - 200; // Reserve space for separators

    // If still have space, add some middle content (line items)
    let middleText = '';
    if (remainingSpace > 100 && middleLines.length > 0) {
      const middleChunk = middleLines
        .slice(0, Math.floor(middleLines.length / 2))
        .join('\n')
        .substring(0, remainingSpace);
      middleText = `\n--- MIDDLE CONTENT (SAMPLE) ---\n${middleChunk}\n`;
    }

    const result =
      `--- HEADER (TOP 30 LINES) ---\n${headerText}\n` +
      (keywordText
        ? `\n--- KEYWORD LINES (TOTALS/DATES) ---\n${keywordText}\n`
        : '') +
      middleText +
      `\n--- FOOTER (BOTTOM 30 LINES) ---\n${footerText}`;

    this.logger.debug(
      `[LlmService] Truncated ${ocrText.length} → ${result.length} chars`,
    );

    return result;
  }

  /**
   * Build system prompt for extraction (defines rules and output format)
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

**Field Extraction Rules**:

- **vendorName**: Extract the EXACT business/company name from THIS document ONLY.
  * Located at the TOP (first 1-3 lines)
  * Hebrew: "בן בוטנרו ייעוץ תזונה", "קריאטיב סופטוור בע״מ"
  * English: "Apple Inc.", "Google LLC"
  * Include suffix if present (בע״מ, Ltd., Inc.)
  
- **totalAmount**: MOST CRITICAL. Extract the final amount paid/due.
  * Hebrew keywords: "סה״כ לתשלום", "לתשלום", "יתרה לתשלום", "סה״כ"
  * English keywords: "Total", "Amount Due", "Grand Total", "Balance"
  * Usually at bottom, largest number, near VAT
  * MUST be a positive number (not 0 or negative)
  
- **invoiceDate**: Extract from "תאריך"/"Date". Convert to YYYY-MM-DD.
  * Common formats: DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD

- **currency**: ₪→ILS, $→USD, €→EUR. If unclear and Hebrew doc, assume ILS with warning.

- **invoiceNumber**: Extract from "מס׳"/"חשבונית"/"Invoice #".

- **vatAmount**: Extract VAT/Tax amount if present (near "מע״מ"/"VAT").

- **subtotalAmount**: Extract subtotal before tax if present.

- **lineItems**: Extract itemized lines if visible. If no clear items, return [].

- **confidence**: Set 0-1 for each field based on extraction certainty:
  * 0.9-1.0: Very confident (clear, unambiguous)
  * 0.7-0.8: Confident (likely correct)
  * 0.5-0.6: Uncertain (multiple candidates or unclear)
  * 0.0-0.4: Not confident (guessing or fallback)

- **warnings**: List any issues:
  * "Total amount unclear - multiple candidates"
  * "Date format ambiguous"
  * "Currency not found, assumed ILS"
  * "Vendor name extracted from unclear text"

**Important**: If a field cannot be reliably extracted, set it to null, set confidence to 0, and add a warning.

Return ONLY valid JSON.`;
  }

  /**
   * Build user prompt with OCR text and optional hints from deterministic parsing
   */
  private buildExtractionPrompt(ocrText: string, candidates?: any): string {
    let prompt = `Extract invoice data from the following OCR text:\n\n`;

    // Include deterministic candidates as hints
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

      prompt += `\n**Important**: These hints may help, but ALWAYS verify against the OCR text below. If the OCR text contradicts a hint, trust the OCR text.\n\n`;
    }

    prompt += `OCR TEXT:\n${ocrText}\n\nJSON OUTPUT:`;

    return prompt;
  }

  private buildExtractionPrompt_old(ocrText: string): string {
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
    // Try to extract JSON from response (handle markdown code blocks)
    let jsonText = response;

    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Find JSON object
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No JSON found in LLM response');
    }

    jsonText = jsonText.slice(start, end + 1);

    try {
      const data = JSON.parse(jsonText);

      return {
        vendorName: data.vendorName || null,
        invoiceDate: data.invoiceDate || null,
        totalAmount: data.totalAmount ? Number(data.totalAmount) : null,
        currency: data.currency || null,
        invoiceNumber: data.invoiceNumber || null,
        vatAmount: data.vatAmount ? Number(data.vatAmount) : null,
        subtotalAmount: data.subtotalAmount
          ? Number(data.subtotalAmount)
          : null,
        lineItems: data.lineItems || [],
        confidence: data.confidence || {
          vendorName: 0.5,
          invoiceDate: 0.5,
          totalAmount: 0.5,
          currency: 0.5,
        },
        warnings: data.warnings || [],
      };
    } catch (error) {
      this.logger.error(`Failed to parse LLM JSON: ${error.message}`);
      this.logger.debug(`JSON text: ${jsonText.substring(0, 500)}`);
      throw new Error('Invalid JSON response from LLM');
    }
  }

  /**
   * Validate extracted data structure and values
   */
  private validateExtractedData(data: ExtractedInvoiceData): void {
    // Ensure warnings is an array
    if (!Array.isArray(data.warnings)) {
      data.warnings = [];
    }

    // Validate confidence object
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

    // Validate totalAmount (must be positive if present)
    if (
      data.totalAmount !== null &&
      (typeof data.totalAmount !== 'number' ||
        !Number.isFinite(data.totalAmount) ||
        data.totalAmount <= 0)
    ) {
      data.warnings.push('Invalid totalAmount extracted (must be positive)');
      data.confidence.totalAmount = Math.min(
        data.confidence.totalAmount ?? 0.5,
        0.3,
      );
      data.totalAmount = null;
    }

    // Validate currency
    const allowedCurrencies = new Set(['ILS', 'USD', 'EUR', 'GBP']);
    if (
      data.currency !== null &&
      (typeof data.currency !== 'string' ||
        !allowedCurrencies.has(data.currency))
    ) {
      data.warnings.push(
        `Unrecognized currency "${data.currency}", defaulted to ILS`,
      );
      data.currency = 'ILS';
      data.confidence.currency = Math.min(data.confidence.currency ?? 0.5, 0.4);
    }

    // Warn if critical fields are null
    if (data.totalAmount === null) {
      data.warnings.push('Total amount not found');
      data.confidence.totalAmount = 0;
    }

    if (data.currency === null) {
      data.warnings.push('Currency not found, defaulted to ILS');
      data.currency = 'ILS';
      data.confidence.currency = 0;
    }
  }

  /**
   * Fallback extraction when LLM fails
   * Uses regex + deterministic hints
   */
  private getFallbackExtraction(
    ocrText: string,
    candidates?: any,
  ): ExtractedInvoiceData {
    const warnings = ['LLM extraction failed, using regex fallback'];

    // Try to use deterministic candidates if provided
    let totalAmount: number | null = null;
    let currency: string | null = null;
    let invoiceDate: string | null = null;
    let vendorName: string | null = null;

    if (candidates) {
      totalAmount = candidates.bestTotal ?? null;
      currency = candidates.bestCurrency ?? null;
      invoiceDate = candidates.bestDate ?? null;

      if (
        candidates.vendorCandidates &&
        candidates.vendorCandidates.length > 0
      ) {
        vendorName = candidates.vendorCandidates[0];
      }

      if (totalAmount) {
        warnings.push('Total amount from deterministic parsing');
      }
    }

    // Regex fallback for total amount if not found
    if (!totalAmount) {
      const amountMatch = ocrText.match(/[\$€£₪]?\s*([\d,]+\.?\d*)/);
      if (amountMatch) {
        totalAmount = parseFloat(amountMatch[1].replace(',', ''));
        warnings.push('Total amount from regex (low confidence)');
      }
    }

    // Regex fallback for date if not found
    if (!invoiceDate) {
      const dateMatch = ocrText.match(
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
      );
      if (dateMatch) {
        invoiceDate = this.normalizeDate(dateMatch[1]);
        warnings.push('Invoice date from regex (low confidence)');
      }
    }

    // Currency fallback
    if (!currency) {
      if (ocrText.includes('₪') || ocrText.includes('ILS')) {
        currency = 'ILS';
      } else if (ocrText.includes('$') || ocrText.includes('USD')) {
        currency = 'USD';
      } else if (ocrText.includes('€') || ocrText.includes('EUR')) {
        currency = 'EUR';
      } else {
        currency = 'ILS'; // Default
        warnings.push('Currency not found, assumed ILS');
      }
    }

    return {
      vendorName: vendorName || null,
      invoiceDate,
      totalAmount,
      currency,
      invoiceNumber: null,
      vatAmount: null,
      subtotalAmount: null,
      lineItems: [],
      confidence: {
        vendorName: vendorName ? 0.3 : 0,
        invoiceDate: invoiceDate ? 0.3 : 0,
        totalAmount: totalAmount ? 0.3 : 0,
        currency: currency ? 0.3 : 0,
      },
      warnings,
    };
  }

  /**
   * Normalize date string to YYYY-MM-DD format
   */
  private normalizeDate(dateStr: string): string | null {
    try {
      // Try parsing common formats
      const formats = [
        // DD/MM/YYYY
        /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
        // YYYY-MM-DD
        /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,
        // DD/MM/YY
        /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/,
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          if (format === formats[0] || format === formats[2]) {
            // DD/MM/YYYY or DD/MM/YY
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            let year = parseInt(match[3], 10);

            if (format === formats[2] && year < 100) {
              year += 2000; // Assume 2000s
            }

            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } else {
            // YYYY-MM-DD
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const day = parseInt(match[3], 10);
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          }
        }
      }

      // Fallback: try Date constructor
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if error is retryable (network/timeout errors)
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const retryableMessages = [
      'timeout',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'network',
      '429', // Rate limit
      '500', // Server error
      '502', // Bad gateway
      '503', // Service unavailable
      '504', // Gateway timeout
    ];

    const errorStr = error.message?.toLowerCase() || '';
    return retryableMessages.some((msg) =>
      errorStr.includes(msg.toLowerCase()),
    );
  }

  /**
   * Sleep helper for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
