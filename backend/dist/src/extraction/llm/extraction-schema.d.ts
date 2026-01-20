export declare const EXTRACTION_SCHEMA: {
    $schema: string;
    type: string;
    required: string[];
    properties: {
        vendorName: {
            type: string[];
            description: string;
        };
        invoiceDate: {
            type: string[];
            format: string;
            description: string;
        };
        totalAmount: {
            type: string[];
            description: string;
        };
        currency: {
            type: string[];
            pattern: string;
            description: string;
        };
        invoiceNumber: {
            type: string;
            description: string;
        };
        vatAmount: {
            type: string;
            description: string;
        };
        subtotalAmount: {
            type: string;
            description: string;
        };
        lineItems: {
            type: string;
            items: {
                type: string;
                properties: {
                    description: {
                        type: string;
                    };
                    quantity: {
                        type: string;
                    };
                    unitPrice: {
                        type: string;
                    };
                    amount: {
                        type: string;
                    };
                };
            };
            description: string;
        };
        confidence: {
            type: string;
            properties: {
                vendorName: {
                    type: string;
                    minimum: number;
                    maximum: number;
                };
                invoiceDate: {
                    type: string;
                    minimum: number;
                    maximum: number;
                };
                totalAmount: {
                    type: string;
                    minimum: number;
                    maximum: number;
                };
                currency: {
                    type: string;
                    minimum: number;
                    maximum: number;
                };
            };
            description: string;
        };
        warnings: {
            type: string;
            items: {
                type: string;
            };
            description: string;
        };
    };
};
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
