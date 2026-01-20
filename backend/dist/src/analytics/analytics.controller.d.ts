import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { VendorAnalyticsDto, OverallAnalyticsDto } from './dto/analytics-response.dto';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getVendorAnalytics(tenantId: string, vendorId: string, year?: number, month?: number): Promise<VendorAnalyticsDto>;
    getAvailablePeriods(tenantId: string, vendorId: string): Promise<{
        periods: never[];
        latestPeriod: null;
    } | {
        periods: {
            year: number;
            month: number;
        }[];
        latestPeriod: {
            year: number;
            month: number;
        };
    }>;
    getOverallAnalytics(tenantId: string, year?: number): Promise<OverallAnalyticsDto>;
    updateVendorLimit(tenantId: string, vendorId: string, body: {
        monthlyLimit: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        tenantId: string;
        displayOrder: number;
        monthlyLimit: import("@prisma/client/runtime/library").Decimal;
    }>;
    exportVendorCsv(tenantId: string, vendorId: string, res: Response): Promise<string>;
    exportOverallCsv(tenantId: string, res: Response): Promise<string>;
}
