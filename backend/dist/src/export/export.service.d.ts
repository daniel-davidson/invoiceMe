import { PrismaService } from '../prisma/prisma.service';
export declare class ExportService {
    private prisma;
    constructor(prisma: PrismaService);
    exportInvoices(tenantId: string, vendorId?: string, startDate?: string, endDate?: string): Promise<string>;
    exportAnalytics(tenantId: string, vendorId?: string, year?: number): Promise<string>;
}
