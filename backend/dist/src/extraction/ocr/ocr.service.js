"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OcrService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const sharp_1 = __importDefault(require("sharp"));
let OcrService = OcrService_1 = class OcrService {
    configService;
    logger = new common_1.Logger(OcrService_1.name);
    worker = null;
    debugMode;
    PSM_MODES = [
        { psm: 6, name: 'block_of_text' },
        { psm: 4, name: 'single_column' },
        { psm: 11, name: 'sparse_text' },
        { psm: 3, name: 'auto_page' },
        { psm: 12, name: 'sparse_osd' },
    ];
    constructor(configService) {
        this.configService = configService;
        this.debugMode = process.env.OCR_DEBUG === 'true' || process.env.NODE_ENV === 'development';
    }
    async onModuleInit() {
        try {
            this.logger.log('Initializing Tesseract worker with heb+eng languages');
            this.worker = await tesseract_js_1.default.createWorker(['heb', 'eng'], 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text' && this.debugMode) {
                        this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
            });
            await this.worker.setParameters({
                preserve_interword_spaces: '1',
                tessedit_char_whitelist: '',
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
    async preprocessImage(buffer) {
        try {
            const image = (0, sharp_1.default)(buffer);
            const metadata = await image.metadata();
            this.logger.debug(`Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
            const minDimension = 1500;
            let resizeWidth;
            let resizeHeight;
            if (metadata.width && metadata.height) {
                const maxDim = Math.max(metadata.width, metadata.height);
                if (maxDim < minDimension) {
                    const scale = minDimension / maxDim;
                    resizeWidth = Math.round(metadata.width * scale);
                    resizeHeight = Math.round(metadata.height * scale);
                }
            }
            let processed = image
                .rotate()
                .grayscale()
                .normalize();
            if (resizeWidth && resizeHeight) {
                this.logger.debug(`Scaling up to ${resizeWidth}x${resizeHeight}`);
                processed = processed.resize(resizeWidth, resizeHeight, {
                    kernel: sharp_1.default.kernel.lanczos3,
                    fit: 'fill',
                });
            }
            const preprocessed = await processed
                .linear(1.2, -(128 * 0.2))
                .sharpen({ sigma: 0.5 })
                .threshold(128)
                .png()
                .toBuffer();
            this.logger.debug('Image preprocessing completed');
            return preprocessed;
        }
        catch (error) {
            this.logger.warn(`Image preprocessing failed: ${error.message}, using original`);
            return buffer;
        }
    }
    scoreOcrText(text) {
        let score = 0;
        const moneyKeywords = [
            /סה["״']?כ/gi,
            /לתשלום/gi,
            /יתרה\s*לתשלום/gi,
            /מע["״']?מ/gi,
            /חשבונית/gi,
            /קבלה/gi,
            /\btotal\b/gi,
            /\bamount\s+due\b/gi,
            /\binvoice\b/gi,
            /\breceipt\b/gi,
            /\bVAT\b/g,
        ];
        moneyKeywords.forEach(regex => {
            const matches = text.match(regex);
            if (matches) {
                score += matches.length * 10;
            }
        });
        const moneyPattern = /[₪$€£]?\s*\d{1,10}[.,]\d{2}\b/g;
        const moneyMatches = text.match(moneyPattern);
        if (moneyMatches) {
            score += moneyMatches.length * 5;
        }
        const datePatterns = [
            /\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b/g,
            /\b\d{4}-\d{2}-\d{2}\b/g,
            /\b\d{1,2}\s+[א-ת]{3,10}\s+\d{4}\b/g,
        ];
        datePatterns.forEach(regex => {
            const matches = text.match(regex);
            if (matches) {
                score += matches.length * 3;
            }
        });
        score += Math.min(text.length / 100, 20);
        const specialChars = text.match(/[^\w\s\u0590-\u05FF.,!?@#$%&*()₪€£]/g);
        if (specialChars && specialChars.length > text.length * 0.1) {
            score -= 10;
        }
        return Math.max(0, score);
    }
    async runOcrWithPSM(buffer, psm, modeName) {
        if (!this.worker) {
            throw new Error('Tesseract worker not initialized');
        }
        const startTime = Date.now();
        await this.worker.setParameters({
            tessedit_pageseg_mode: psm,
        });
        const result = await this.worker.recognize(buffer);
        const text = result.data.text.trim();
        const confidence = result.data.confidence;
        const score = this.scoreOcrText(text);
        const duration = Date.now() - startTime;
        if (this.debugMode) {
            this.logger.debug(`PSM ${psm} (${modeName}): ${duration}ms, ${text.length} chars, score=${score.toFixed(1)}, conf=${confidence.toFixed(1)}%`);
        }
        return { text, psm, score, confidence };
    }
    async recognizeText(buffer, mimeType) {
        if (!this.worker) {
            throw new Error('Tesseract worker not initialized');
        }
        try {
            this.logger.log(`Starting enhanced multi-pass OCR for ${mimeType}`);
            const totalStartTime = Date.now();
            const preprocessed = await this.preprocessImage(buffer);
            const results = [];
            for (const { psm, name } of this.PSM_MODES) {
                try {
                    const result = await this.runOcrWithPSM(preprocessed, psm, name);
                    results.push(result);
                }
                catch (error) {
                    this.logger.warn(`PSM ${psm} (${name}) failed: ${error.message}`);
                }
            }
            if (results.length === 0) {
                throw new Error('All PSM modes failed');
            }
            const bestResult = results.reduce((best, current) => current.score > best.score ? current : best);
            const totalDuration = Date.now() - totalStartTime;
            this.logger.log(`Multi-pass OCR completed in ${totalDuration}ms: ` +
                `Best PSM=${bestResult.psm}, score=${bestResult.score.toFixed(1)}, ` +
                `conf=${bestResult.confidence.toFixed(1)}%, ${bestResult.text.length} chars`);
            if (this.debugMode) {
                const preview = this.getTextPreview(bestResult.text);
                this.logger.debug(`OCR Preview:\n${preview}`);
                const scoreTable = results
                    .sort((a, b) => b.score - a.score)
                    .map(r => `  PSM ${r.psm}: score=${r.score.toFixed(1)}, conf=${r.confidence.toFixed(1)}%, chars=${r.text.length}`)
                    .join('\n');
                this.logger.debug(`All PSM scores:\n${scoreTable}`);
            }
            return bestResult.text;
        }
        catch (error) {
            this.logger.error(`Enhanced OCR failed: ${error.message}`);
            throw new Error(`OCR processing failed: ${error.message}`);
        }
    }
    getTextPreview(text) {
        if (text.length <= 800) {
            return text;
        }
        const head = text.substring(0, 400);
        const tail = text.substring(text.length - 400);
        return `${head}\n\n[... ${text.length - 800} chars omitted ...]\n\n${tail}`;
    }
    async recognizeMultiple(buffers) {
        const texts = [];
        for (let i = 0; i < buffers.length; i++) {
            this.logger.log(`Processing page ${i + 1}/${buffers.length}`);
            const text = await this.recognizeText(buffers[i], 'image/png');
            texts.push(text);
        }
        return texts.join('\n\n--- PAGE BREAK ---\n\n');
    }
};
exports.OcrService = OcrService;
exports.OcrService = OcrService = OcrService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OcrService);
//# sourceMappingURL=ocr.service.js.map