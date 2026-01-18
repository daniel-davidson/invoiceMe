import { Injectable, Logger } from '@nestjs/common';
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

  constructor() {
    this.client = axios.create({
      baseURL: 'http://localhost:11434',
      timeout: 60000, // 60 seconds for LLM processing
    });
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
          model: 'llama2', // Default model, can be configured
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

  /**
   * Build the extraction prompt for Ollama
   */
  private buildExtractionPrompt(ocrText: string): string {
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
${JSON.stringify(EXTRACTION_SCHEMA, null, 2)}

INVOICE TEXT:
${ocrText}

Extract the invoice data as JSON:`;
  }

  /**
   * Parse the LLM response into structured data
   */
  private parseResponse(responseText: string): ExtractedInvoiceData {
    try {
      // Try to extract JSON from response (LLM might add extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
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
    const required = ['vendorName', 'totalAmount', 'currency', 'confidence', 'warnings'];

    for (const field of required) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate confidence object has required fields
    const confidenceFields = ['vendorName', 'invoiceDate', 'totalAmount', 'currency'];
    for (const field of confidenceFields) {
      if (!(field in data.confidence)) {
        // Set default low confidence if missing
        data.confidence[field] = 0.5;
      }
    }

    // Ensure warnings is an array
    if (!Array.isArray(data.warnings)) {
      data.warnings = [];
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
          model: 'llama2',
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
