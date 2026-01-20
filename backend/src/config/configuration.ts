export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // Supabase Auth
  supabase: {
    url: process.env.SUPABASE_URL,
    // New key system (projects after May 2025)
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    secretKey: process.env.SUPABASE_SECRET_KEY,
    jwksUrl: process.env.SUPABASE_JWKS_URL,
    // Legacy key system (older projects)
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.JWT_SECRET,
    // Computed: which key to use for frontend config
    get clientKey() {
      return (
        process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
      );
    },
  },

  // LLM Configuration
  llm: {
    provider: process.env.LLM_PROVIDER || 'ollama', // ollama, groq, together, openrouter
    // Ollama
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
    // Cloud LLM
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL,
  },

  // OCR Configuration
  ocr: {
    provider: process.env.OCR_PROVIDER || 'tesseract', // tesseract, google, ocrspace, azure
    // Tesseract
    tesseractLangs: process.env.TESSERACT_LANGS || 'eng+heb',
    tesseractPath: process.env.TESSERACT_PATH,
    // Cloud OCR
    apiKey: process.env.OCR_API_KEY,
    googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },

  // Currency/FX Configuration
  fx: {
    provider: process.env.FX_PROVIDER || 'frankfurter', // frankfurter (free), openexchangerates, exchangerateapi
    apiUrl: process.env.FX_API_URL || 'https://api.frankfurter.app',
    apiKey: process.env.FX_API_KEY, // Not needed for frankfurter
    cacheTtlMs: parseInt(process.env.FX_CACHE_TTL_MS || '43200000', 10), // 12 hours
  },

  // Storage
  storage: {
    dir: process.env.STORAGE_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  },

  // CORS
  cors: {
    origins: (
      process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8080'
    ).split(','),
  },
});
