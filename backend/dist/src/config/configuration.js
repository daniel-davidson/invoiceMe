"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    port: parseInt(process.env.PORT || '3000', 10),
    environment: process.env.NODE_ENV || 'development',
    database: {
        url: process.env.DATABASE_URL,
    },
    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        jwtSecret: process.env.JWT_SECRET,
    },
    llm: {
        provider: process.env.LLM_PROVIDER || 'ollama',
        ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
        apiKey: process.env.LLM_API_KEY,
        model: process.env.LLM_MODEL,
    },
    ocr: {
        provider: process.env.OCR_PROVIDER || 'tesseract',
        tesseractLangs: process.env.TESSERACT_LANGS || 'eng+heb',
        tesseractPath: process.env.TESSERACT_PATH,
        apiKey: process.env.OCR_API_KEY,
        googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
    fx: {
        provider: process.env.FX_PROVIDER || 'frankfurter',
        apiUrl: process.env.FX_API_URL || 'https://api.frankfurter.app',
        apiKey: process.env.FX_API_KEY,
        cacheTtlMs: parseInt(process.env.FX_CACHE_TTL_MS || '43200000', 10),
    },
    storage: {
        dir: process.env.STORAGE_DIR || './uploads',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    },
    cors: {
        origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8080').split(','),
    },
});
//# sourceMappingURL=configuration.js.map