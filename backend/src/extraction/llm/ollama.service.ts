import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  ExtractedInvoiceData,
  EXTRACTION_SCHEMA,
} from './extraction-schema';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly client: AxiosInstance;
  private readonly maxRetries = 2;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    const baseURL = this.configService.get<string>('llm.ollamaUrl') || 'http://localhost:11434';
    this.model = this.configService.get<string>('llm.ollamaModel') || 'llama3.2:3b';
    
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
  async extractFromText(ocrText: string): Promise<ExtractedInvoiceData> {
    const prompt = this.buildExtractionPrompt(ocrText);

    let lastError: Error | null = null;

    // Retry logic for connection failures
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
    this.logger.error(`Ollama extraction failed after ${this.maxRetries + 1} attempts`);
    throw new Error(
      `Failed to extract invoice data: ${lastError?.message || 'Unknown error'}`,
    );
  }

  private selectRelevantText(ocrText: string): string {
    const lines = ocrText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
  
    const keywordRegex =
      /(סה["״']?כ|לתשלום|יתרה לתשלום|סכום|מע["״']?מ|VAT|TOTAL|AMOUNT\s+DUE|Invoice|חשבונית|קבלה|מס['״]?|תאריך|Date|קופה)/i;
  
    const head = lines.slice(0, 40);
    const tail = lines.slice(Math.max(0, lines.length - 40));
    const keywordLines = lines.filter(l => keywordRegex.test(l)).slice(0, 80);
  
    const seen = new Set<string>();
    return [...head, ...keywordLines, ...tail]
      .filter(l => {
        const k = l.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .join('\n');
  }
  

  /**
   * Build the extraction prompt for Ollama
   */
  private buildExtractionPrompt(ocrText: string): string {
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
    const required = ['vendorName', 'invoiceDate', 'totalAmount', 'currency', 'confidence', 'warnings'];
  
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
    const confidenceFields = ['vendorName', 'invoiceDate', 'totalAmount', 'currency'];
    for (const field of confidenceFields) {
      if (!(field in data.confidence)) {
        data.confidence[field] = 0.5;
      }
    }
  
    // ✅ Change 4: Sanity checks
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
          this.logger.log(`Generate retry attempt ${attempt}/${this.maxRetries}`);
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

    this.logger.error(`Ollama generate failed after ${this.maxRetries + 1} attempts`);
    throw new Error(
      `Failed to generate response: ${lastError?.message || 'Unknown error'}`,
    );
  }
}
