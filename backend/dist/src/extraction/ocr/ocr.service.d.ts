import { ConfigService } from '@nestjs/config';
import { ImagePreprocessorService } from './image-preprocessor.service';
export interface MultiPassOcrResult {
    bestText: string;
    chosenPass: string;
    chosenScore: number;
    chosenConfidence: number;
    allPasses: Array<{
        psm: number;
        variant: string;
        score: number;
        confidence: number;
        textLength: number;
    }>;
}
export declare class OcrService {
    private configService;
    private preprocessor;
    private readonly logger;
    private worker;
    private readonly debugMode;
    private readonly PSM_MODES;
    constructor(configService: ConfigService, preprocessor: ImagePreprocessorService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private scoreOcrText;
    private runOcrWithPSM;
    recognizeTextMultiPass(buffer: Buffer, mimeType: string): Promise<MultiPassOcrResult>;
    recognizeText(buffer: Buffer, mimeType: string): Promise<string>;
    private getTextPreview;
    recognizeMultiple(buffers: Buffer[]): Promise<string>;
}
