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
        publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
        secretKey: process.env.SUPABASE_SECRET_KEY,
        jwksUrl: process.env.SUPABASE_JWKS_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        jwtSecret: process.env.JWT_SECRET,
        get clientKey() {
            return (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY);
        },
    },
    llm: {
        provider: process.env.LLM_PROVIDER || 'groq',
        apiKey: process.env.LLM_API_KEY || process.env.GROQ_API_KEY,
        model: process.env.LLM_MODEL ||
            process.env.GROQ_MODEL ||
            'qwen-3-32b',
        ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
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