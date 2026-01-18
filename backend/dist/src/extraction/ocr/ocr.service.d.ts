export declare class OcrService {
    private readonly logger;
    private worker;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    recognizeText(buffer: Buffer, mimeType: string): Promise<string>;
    recognizeMultiple(buffers: Buffer[]): Promise<string>;
}
