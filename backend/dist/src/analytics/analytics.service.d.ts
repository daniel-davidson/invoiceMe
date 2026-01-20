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
    getVendorAnalytics(tenantId: string, vendorId: string): Promise<VendorAnalyticsDto>;
    getOverallAnalytics(tenantId: string): Promise<OverallAnalyticsDto>;
    updateVendorLimit(tenantId: string, vendorId: string, monthlyLimit: number | null): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        tenantId: string;
        displayOrder: number;
        monthlyLimit: Decimal | null;
    }>;
    exportVendorCsv(tenantId: string, vendorId: string): Promise<string>;
    exportOverallCsv(tenantId: string): Promise<string>;
}
