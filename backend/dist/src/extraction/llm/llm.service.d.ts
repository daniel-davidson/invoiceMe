import { ConfigService } from '@nestjs/config';
import { ExtractedInvoiceData } from './extraction-schema';
export declare class LlmService {
    private readonly configService;
    private readonly logger;
    private readonly provider;
    private readonly model;
    private readonly apiKey;
    private readonly ollamaUrl;
    constructor(configService: ConfigService);
    extractFromText(ocrText: string): Promise<ExtractedInvoiceData>;
    generate(prompt: string): Promise<string>;
    private generateOllama;
    private generateGroq;
    private generateTogether;
    private generateOpenRouter;
    private buildExtractionPrompt;
    private parseResponse;
    private getFallbackExtraction;
    private normalizeDate;
}
