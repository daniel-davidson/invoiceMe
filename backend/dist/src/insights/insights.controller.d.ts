import { InsightsService } from './insights.service';
import { InsightType, GenerateInsightsDto } from './dto/insight.dto';
export declare class InsightsController {
    private readonly insightsService;
    constructor(insightsService: InsightsService);
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
    generate(tenantId: string, dto: GenerateInsightsDto): Promise<{
        generated: any[];
        processingTimeMs: number;
    }>;
    remove(tenantId: string, id: string): Promise<{
        deleted: boolean;
    }>;
}
