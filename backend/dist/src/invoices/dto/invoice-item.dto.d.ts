export declare class InvoiceItemDto {
    id?: string;
    description: string;
    quantity?: number;
    unitPrice?: number;
    total: number;
    currency?: string;
}
export declare class InvoiceItemResponseDto {
    id: string;
    description: string;
    quantity: number | null;
    unitPrice: number | null;
    total: number;
    currency: string | null;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
