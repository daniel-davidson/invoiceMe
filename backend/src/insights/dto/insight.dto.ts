import { IsEnum, IsOptional, IsArray } from 'class-validator';

export enum InsightType {
  MONTHLY_NARRATIVE = 'MONTHLY_NARRATIVE',
  RECURRING_CHARGES = 'RECURRING_CHARGES',
  ANOMALIES = 'ANOMALIES',
}

export class GenerateInsightsDto {
  @IsOptional()
  @IsArray()
  @IsEnum(InsightType, { each: true })
  types?: InsightType[];
}

export class InsightResponse {
  id: string;
  insightType: InsightType;
  title: string;
  content: string;
  relatedMetrics: any;
  generatedAt: Date;
  createdAt: Date;
}
