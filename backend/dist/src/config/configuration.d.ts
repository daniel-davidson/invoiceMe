declare const _default: () => {
    port: number;
    environment: string;
    database: {
        url: string | undefined;
    };
    supabase: {
        url: string | undefined;
        anonKey: string | undefined;
        serviceRoleKey: string | undefined;
        jwtSecret: string | undefined;
    };
    llm: {
        provider: string;
        ollamaUrl: string;
        ollamaModel: string;
        apiKey: string | undefined;
        model: string | undefined;
    };
    ocr: {
        provider: string;
        tesseractLangs: string;
        tesseractPath: string | undefined;
        apiKey: string | undefined;
        googleCredentials: string | undefined;
    };
    fx: {
        provider: string;
        apiUrl: string;
        apiKey: string | undefined;
        cacheTtlMs: number;
    };
    storage: {
        dir: string;
        maxFileSize: number;
    };
    cors: {
        origins: string[];
    };
};
export default _default;
