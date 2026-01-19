import { ConfigService } from '@nestjs/config';
import { ExtractedInvoiceData } from './extraction-schema';
export declare class OllamaService {
    private configService;
    private readonly logger;
    private readonly client;
    private readonly maxRetries;
    private readonly model;
    constructor(configService: ConfigService);
    extractFromText(ocrText: string): Promise<ExtractedInvoiceData>;
    private selectRelevantText;
    private buildExtractionPrompt;
    private parseResponse;
    private validateExtractedData;
    private sleep;
    generate(prompt: string): Promise<string>;
}
