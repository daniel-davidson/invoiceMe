import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    private toNumber;
    private getMonthLabels;
    private getMonthRanges;
    getVendorAnalytics(tenantId: string, vendorId: string): Promise<{
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
    getOverallAnalytics(tenantId: string): Promise<{
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
    updateVendorLimit(tenantId: string, vendorId: string, monthlyLimit: number | null): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        tenantId: string;
        displayOrder: number;
        monthlyLimit: Decimal | null;
    }>;
}
