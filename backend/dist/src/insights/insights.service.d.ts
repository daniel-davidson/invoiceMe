import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from '../extraction/llm/ollama.service';
import { InsightType } from './dto/insight.dto';
export declare class InsightsService {
    private prisma;
    private ollamaService;
    constructor(prisma: PrismaService, ollamaService: OllamaService);
    private toNumber;
    findAll(tenantId: string, type?: InsightType, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        insightType: import("@prisma/client").$Enums.InsightType;
        title: string;
        content: string;
        relatedMetrics: import("@prisma/client/runtime/library").JsonValue;
        generatedAt: Date;
    }[]>;
    findOne(tenantId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        insightType: import("@prisma/client").$Enums.InsightType;
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
