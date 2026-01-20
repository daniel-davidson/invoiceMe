export declare class StorageService {
    private readonly uploadDir;
    saveFile(tenantId: string, file: Express.Multer.File): Promise<string>;
    saveFileBuffer(tenantId: string, buffer: Buffer, originalName: string): Promise<string>;
    getFile(relativePath: string): Promise<{
        buffer: Buffer;
        mimeType: string;
        fileName: string;
    }>;
    deleteFile(relativePath: string): Promise<void>;
    getAbsolutePath(relativePath: string): string;
    fileExists(relativePath: string): Promise<boolean>;
}
