import { ConfigService } from '@nestjs/config';
import { ExtractedInvoiceData } from './extraction-schema';
export declare class GroqService {
    private configService;
    private readonly logger;
    private readonly client;
    private readonly maxRetries;
    private readonly model;
    private readonly apiKey;
    constructor(configService: ConfigService);
    extractFromText(ocrText: string, candidates?: any): Promise<ExtractedInvoiceData>;
    private selectRelevantText;
    private buildSystemPrompt;
    private buildExtractionPrompt;
    private parseResponse;
    private validateExtractedData;
    private sleep;
    generate(prompt: string): Promise<string>;
}
