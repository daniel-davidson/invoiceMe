import { InvoiceItemDto } from './invoice-item.dto';
export declare class UpdateInvoiceDto {
    name?: string;
    invoiceNumber?: string;
    originalAmount?: number;
    originalCurrency?: string;
    invoiceDate?: string;
    vendorId?: string;
    useItemsTotal?: boolean;
    needsReview?: boolean;
    items?: InvoiceItemDto[];
}
