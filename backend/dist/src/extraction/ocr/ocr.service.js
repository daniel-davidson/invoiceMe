"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OcrService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const common_1 = require("@nestjs/common");
const tesseract_js_1 = __importDefault(require("tesseract.js"));
let OcrService = OcrService_1 = class OcrService {
    logger = new common_1.Logger(OcrService_1.name);
    worker = null;
    async onModuleInit() {
        try {
            this.logger.log('Initializing Tesseract worker with heb+eng languages');
            this.worker = await tesseract_js_1.default.createWorker(['heb', 'eng'], 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
            });
            this.logger.log('Tesseract worker initialized successfully');
        }
        catch (error) {
            this.logger.error(`Failed to initialize Tesseract worker: ${error.message}`);
        }
    }
    async onModuleDestroy() {
        if (this.worker) {
            await this.worker.terminate();
            this.logger.log('Tesseract worker terminated');
        }
    }
    async recognizeText(buffer, mimeType) {
        if (!this.worker) {
            throw new Error('Tesseract worker not initialized');
        }
        try {
            this.logger.log(`Starting OCR for ${mimeType}`);
            const startTime = Date.now();
            const result = await this.worker.recognize(buffer);
            const duration = Date.now() - startTime;
            const text = result.data.text.trim();
            this.logger.log(`OCR completed in ${duration}ms, extracted ${text.length} characters`);
            return text;
        }
        catch (error) {
            this.logger.error(`OCR failed: ${error.message}`);
            throw new Error(`OCR processing failed: ${error.message}`);
        }
    }
    async recognizeMultiple(buffers) {
        const texts = [];
        for (let i = 0; i < buffers.length; i++) {
            this.logger.log(`Processing page ${i + 1}/${buffers.length}`);
            const text = await this.recognizeText(buffers[i], 'image/png');
            texts.push(text);
        }
        return texts.join('\n\n');
    }
};
exports.OcrService = OcrService;
exports.OcrService = OcrService = OcrService_1 = __decorate([
    (0, common_1.Injectable)()
], OcrService);
//# sourceMappingURL=ocr.service.js.map