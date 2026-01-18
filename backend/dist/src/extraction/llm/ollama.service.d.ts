import { ExtractedInvoiceData } from './extraction-schema';
export declare class OllamaService {
    private readonly logger;
    private readonly client;
    private readonly maxRetries;
    constructor();
    extractFromText(ocrText: string): Promise<ExtractedInvoiceData>;
    private buildExtractionPrompt;
    private parseResponse;
    private validateExtractedData;
    private sleep;
    generate(prompt: string): Promise<string>;
}
