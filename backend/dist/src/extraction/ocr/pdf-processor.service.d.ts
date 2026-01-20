export declare class PdfProcessorService {
    private readonly logger;
    extractTextFromPdf(buffer: Buffer): Promise<string | null>;
    convertPdfToImages(buffer: Buffer): Promise<Buffer[]>;
    hasSelectableText(buffer: Buffer): Promise<boolean>;
}
