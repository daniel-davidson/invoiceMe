export interface PreprocessingResult {
    standard: Buffer;
    noLines: Buffer;
    metadata: {
        originalSize: {
            width: number;
            height: number;
        };
        processedSize: {
            width: number;
            height: number;
        };
        rotated: boolean;
        deskewed: boolean;
    };
}
export declare class ImagePreprocessorService {
    private readonly logger;
    private readonly targetDPI;
    private readonly minDimension;
    preprocess(buffer: Buffer): Promise<PreprocessingResult>;
    private scaleIfNeeded;
    private removeTableLines;
    preprocessMultiple(buffers: Buffer[]): Promise<PreprocessingResult[]>;
    needsPreprocessing(buffer: Buffer): Promise<boolean>;
}
