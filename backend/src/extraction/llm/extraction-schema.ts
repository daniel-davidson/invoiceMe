/**
 * JSON Schema for invoice extraction from OCR text
 * Based on plan.md AI Extraction Contract
 */
export const EXTRACTION_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['confidence', 'warnings'],
  properties: {
    vendorName: {
      type: ['string', 'null'],
      description: 'Extracted vendor/supplier name from invoice (nullable)',
    },
    invoiceDate: {
      type: ['string', 'null'],
      format: 'date',
      description: 'Invoice date in ISO 8601 format (YYYY-MM-DD) (nullable)',
    },
    totalAmount: {
      type: ['number', 'null'],
      description: 'Total amount due on invoice (nullable)',
    },
    currency: {
      type: ['string', 'null'],
      pattern: '^[A-Z]{3}$',
      description: 'ISO 4217 currency code (e.g., USD, EUR, ILS) (nullable)',
    },
    invoiceNumber: {
      type: 'string',
      description: 'Optional: Invoice reference number',
    },
    vatAmount: {
      type: 'number',
      description: 'Optional: VAT/tax amount',
    },
    subtotalAmount: {
      type: 'number',
      description: 'Optional: Subtotal before tax',
    },
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          quantity: { type: 'number' },
          unitPrice: { type: 'number' },
          amount: { type: 'number' },
        },
      },
      description: 'Optional: Itemized line items',
    },
    confidence: {
      type: 'object',
      properties: {
        vendorName: { type: 'number', minimum: 0, maximum: 1 },
        invoiceDate: { type: 'number', minimum: 0, maximum: 1 },
        totalAmount: { type: 'number', minimum: 0, maximum: 1 },
        currency: { type: 'number', minimum: 0, maximum: 1 },
      },
      description: 'Confidence score (0-1) for each extracted field',
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
      description: 'Any issues or uncertainties during extraction',
    },
  },
};

/**
 * TypeScript interface for extracted invoice data
 * Fields marked with ? may be undefined when extraction fails
 */
export interface ExtractedInvoiceData {
  vendorName: string | null;
  invoiceDate: string | null;
  totalAmount: number | null;
  currency: string | null;
  invoiceNumber?: string | null;
  vatAmount?: number | null;
  subtotalAmount?: number | null;
  lineItems?: Array<{
    description: string;
    quantity?: number | null;
    unitPrice?: number | null;
    amount?: number | null;
  }>;
  confidence: {
    vendorName: number;
    invoiceDate: number;
    totalAmount: number;
    currency: number;
  };
  warnings: string[];
  needsReview?: boolean;
}
