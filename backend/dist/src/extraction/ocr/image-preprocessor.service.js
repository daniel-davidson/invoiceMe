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
var ImagePreprocessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImagePreprocessorService = void 0;
const common_1 = require("@nestjs/common");
const sharp_1 = __importDefault(require("sharp"));
let ImagePreprocessorService = ImagePreprocessorService_1 = class ImagePreprocessorService {
    logger = new common_1.Logger(ImagePreprocessorService_1.name);
    targetDPI = 350;
    minDimension = 1750;
    async preprocess(buffer) {
        const startTime = Date.now();
        try {
            const image = (0, sharp_1.default)(buffer);
            const metadata = await image.metadata();
            this.logger.debug(`[ImagePreprocessor] Original: ${metadata.width}x${metadata.height}, ` +
                `format: ${metadata.format}, space: ${metadata.space}`);
            let processed = image.rotate();
            processed = processed.grayscale();
            const scaledMetadata = await this.scaleIfNeeded(processed, metadata);
            processed = scaledMetadata.image;
            processed = processed.normalize();
            processed = processed.sharpen({ sigma: 0.7 });
            processed = processed.linear(1.3, -(128 * 0.3));
            const standardBuffer = await processed
                .threshold(128)
                .png()
                .toBuffer();
            const noLinesBuffer = await this.removeTableLines(processed);
            const duration = Date.now() - startTime;
            this.logger.log(`[ImagePreprocessor] Preprocessing completed in ${duration}ms ` +
                `(${scaledMetadata.width}x${scaledMetadata.height})`);
            return {
                standard: standardBuffer,
                noLines: noLinesBuffer,
                metadata: {
                    originalSize: {
                        width: metadata.width || 0,
                        height: metadata.height || 0,
                    },
                    processedSize: {
                        width: scaledMetadata.width,
                        height: scaledMetadata.height,
                    },
                    rotated: true,
                    deskewed: false,
                },
            };
        }
        catch (error) {
            this.logger.error(`Preprocessing failed: ${error.message}`);
            return {
                standard: buffer,
                noLines: buffer,
                metadata: {
                    originalSize: { width: 0, height: 0 },
                    processedSize: { width: 0, height: 0 },
                    rotated: false,
                    deskewed: false,
                },
            };
        }
    }
    async scaleIfNeeded(image, metadata) {
        if (!metadata.width || !metadata.height) {
            return { image, width: 0, height: 0 };
        }
        const maxDim = Math.max(metadata.width, metadata.height);
        if (maxDim < this.minDimension) {
            const scale = this.minDimension / maxDim;
            const newWidth = Math.round(metadata.width * scale);
            const newHeight = Math.round(metadata.height * scale);
            this.logger.debug(`[ImagePreprocessor] Scaling up to ${newWidth}x${newHeight} for better OCR`);
            return {
                image: image.resize(newWidth, newHeight, {
                    kernel: sharp_1.default.kernel.lanczos3,
                    fit: 'fill',
                }),
                width: newWidth,
                height: newHeight,
            };
        }
        return { image, width: metadata.width, height: metadata.height };
    }
    async removeTableLines(image) {
        try {
            const binarized = await image
                .threshold(128)
                .toBuffer();
            const withoutLines = await (0, sharp_1.default)(binarized)
                .blur(0.5)
                .threshold(140)
                .blur(0.3)
                .sharpen({ sigma: 0.8 })
                .png()
                .toBuffer();
            this.logger.debug('[ImagePreprocessor] Table line removal applied');
            return withoutLines;
        }
        catch (error) {
            this.logger.warn(`Line removal failed: ${error.message}, using standard version`);
            return await image.threshold(128).png().toBuffer();
        }
    }
    async preprocessMultiple(buffers) {
        const results = [];
        for (let i = 0; i < buffers.length; i++) {
            this.logger.log(`[ImagePreprocessor] Processing page ${i + 1}/${buffers.length}`);
            const result = await this.preprocess(buffers[i]);
            results.push(result);
        }
        return results;
    }
    async needsPreprocessing(buffer) {
        try {
            const metadata = await (0, sharp_1.default)(buffer).metadata();
            const isHighRes = metadata.width && metadata.width >= this.minDimension;
            return true;
        }
        catch {
            return true;
        }
    }
};
exports.ImagePreprocessorService = ImagePreprocessorService;
exports.ImagePreprocessorService = ImagePreprocessorService = ImagePreprocessorService_1 = __decorate([
    (0, common_1.Injectable)()
], ImagePreprocessorService);
//# sourceMappingURL=image-preprocessor.service.js.map