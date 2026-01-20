import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getVendorAnalytics(tenantId: string, vendorId: string, year?: number): Promise<{
        vendorId: string;
        vendorName: string;
        kpis: {
            currentMonthSpend: number;
            monthlyLimit: number | null;
            monthlyAverage: number;
            yearlyAverage: number;
            limitUtilization: number | null;
        };
        pieChart: {
            title: string;
            segments: never[];
            otherTotal: number;
        };
        lineChart: {
            title: string;
            labels: string[];
            datasets: {
                label: string;
                data: number[];
                color: string;
            }[];
        };
    }>;
    getOverallAnalytics(tenantId: string, year?: number): Promise<{
        kpis: {
            totalSpend: number;
            totalLimits: number;
            remainingBalance: number;
            vendorCount: number;
            invoiceCount: number;
        };
        pieChart: {
            title: string;
            segments: {
                label: string;
                value: number;
                percentage: number;
                color: string;
            }[];
            otherTotal: number;
        };
        lineChart: {
            title: string;
            labels: string[];
            datasets: {
                label: string;
                data: number[];
                color: string;
            }[];
        };
    }>;
    updateVendorLimit(tenantId: string, vendorId: string, body: {
        monthlyLimit: number | null;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        tenantId: string;
        displayOrder: number;
        monthlyLimit: import("@prisma/client/runtime/library").Decimal | null;
    }>;
}
