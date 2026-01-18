import { PrismaService } from '../prisma/prisma.service';
export declare class VendorMatcherService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    normalizeVendorName(name: string): string;
    private levenshteinDistance;
    matchVendor(vendorName: string, tenantId: string): Promise<{
        id: string;
        name: string;
        isNew: boolean;
    }>;
}
