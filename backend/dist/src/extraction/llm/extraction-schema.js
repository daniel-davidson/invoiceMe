"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXTRACTION_SCHEMA = void 0;
exports.EXTRACTION_SCHEMA = {
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
//# sourceMappingURL=extraction-schema.js.map