import { ConfigService } from '@nestjs/config';
import { ExtractedInvoiceData } from './extraction-schema';
export declare class LlmService {
    private readonly configService;
    private readonly logger;
    private readonly provider;
    private readonly model;
    private readonly apiKey;
    private readonly ollamaUrl;
    private readonly maxRetries;
    constructor(configService: ConfigService);
    extractFromText(ocrText: string, candidates?: any): Promise<ExtractedInvoiceData>;
    private generateWithMessages;
    generate(prompt: string): Promise<string>;
    private generateGroq;
    private generateOllama;
    private generateTogether;
    private generateOpenRouter;
    private selectRelevantText;
    private buildSystemPrompt;
    private buildExtractionPrompt;
    private buildExtractionPrompt_old;
    private parseResponse;
    private validateExtractedData;
    private getFallbackExtraction;
    private normalizeDate;
    private isRetryableError;
    private sleep;
}
