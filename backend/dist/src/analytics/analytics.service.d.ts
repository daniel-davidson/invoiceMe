import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { VendorAnalyticsDto, OverallAnalyticsDto } from './dto/analytics-response.dto';
export declare class AnalyticsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private toNumber;
    private getMonthLabels;
    private getMonthRanges;
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
    getVendorAnalytics(tenantId: string, vendorId: string, year?: number, month?: number): Promise<VendorAnalyticsDto>;
    getOverallAnalytics(tenantId: string): Promise<OverallAnalyticsDto>;
    updateVendorLimit(tenantId: string, vendorId: string, monthlyLimit: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        tenantId: string;
        displayOrder: number;
        monthlyLimit: Decimal;
    }>;
    exportVendorCsv(tenantId: string, vendorId: string): Promise<string>;
    exportOverallCsv(tenantId: string): Promise<string>;
}
