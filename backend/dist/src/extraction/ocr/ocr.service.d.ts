import { ConfigService } from '@nestjs/config';
export declare class OcrService {
    private configService;
    private readonly logger;
    private worker;
    private readonly debugMode;
    private readonly PSM_MODES;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private preprocessImage;
    private scoreOcrText;
    private runOcrWithPSM;
    recognizeText(buffer: Buffer, mimeType: string): Promise<string>;
    private getTextPreview;
    recognizeMultiple(buffers: Buffer[]): Promise<string>;
}
