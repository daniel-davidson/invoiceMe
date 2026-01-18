import type { Response } from 'express';
import { ExportService } from './export.service';
export declare class ExportController {
    private readonly exportService;
    constructor(exportService: ExportService);
    exportInvoices(tenantId: string, vendorId?: string, startDate?: string, endDate?: string, res?: Response): Promise<void>;
    exportAnalytics(tenantId: string, vendorId?: string, year?: number, res?: Response): Promise<void>;
}
