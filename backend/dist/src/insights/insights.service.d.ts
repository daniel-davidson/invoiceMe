import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../extraction/llm/llm.service';
import { InsightType } from './dto/insight.dto';
export declare class InsightsService {
    private prisma;
    private llmService;
    constructor(prisma: PrismaService, llmService: LlmService);
    private toNumber;
    findAll(tenantId: string, type?: InsightType, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        insightType: import(".prisma/client").$Enums.InsightType;
        title: string;
        content: string;
        relatedMetrics: import("@prisma/client/runtime/library").JsonValue;
        generatedAt: Date;
    }[]>;
    findOne(tenantId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        insightType: import(".prisma/client").$Enums.InsightType;
        title: string;
        content: string;
        relatedMetrics: import("@prisma/client/runtime/library").JsonValue;
        generatedAt: Date;
    }>;
    remove(tenantId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    generate(tenantId: string, types?: InsightType[]): Promise<{
        generated: any[];
        processingTimeMs: number;
    }>;
    private generateInsight;
    private computeMonthlyNarrativeMetrics;
    private findTopVendorChange;
    private computeRecurringChargesMetrics;
    private computeAnomaliesMetrics;
    private generateNarrative;
    private getFallbackNarrative;
}
