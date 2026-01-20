export declare enum InsightType {
    MONTHLY_NARRATIVE = "MONTHLY_NARRATIVE",
    RECURRING_CHARGES = "RECURRING_CHARGES",
    ANOMALIES = "ANOMALIES"
}
export declare class GenerateInsightsDto {
    types?: InsightType[];
}
export declare class InsightResponse {
    id: string;
    insightType: InsightType;
    title: string;
    content: string;
    relatedMetrics: any;
    generatedAt: Date;
    createdAt: Date;
}
