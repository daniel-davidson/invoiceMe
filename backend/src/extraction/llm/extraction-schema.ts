/**
 * JSON Schema for invoice extraction from OCR text
 * Based on plan.md AI Extraction Contract
 */
export const EXTRACTION_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['vendorName', 'totalAmount', 'currency', 'confidence', 'warnings'],
  properties: {
    vendorName: {
      type: 'string',
      description: 'Extracted vendor/supplier name from invoice',
    },
    invoiceDate: {
      type: 'string',
      format: 'date',
      description: 'Invoice date in ISO 8601 format (YYYY-MM-DD)',
    },
    totalAmount: {
      type: 'number',
      description: 'Total amount due on invoice',
    },
    currency: {
      type: 'string',
      pattern: '^[A-Z]{3}$',
      description: 'ISO 4217 currency code (e.g., USD, EUR, ILS)',
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
  vendorName?: string;
  invoiceDate?: string;
  totalAmount?: number;
  currency?: string;
  invoiceNumber?: string;
  vatAmount?: number;
  subtotalAmount?: number;
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
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
