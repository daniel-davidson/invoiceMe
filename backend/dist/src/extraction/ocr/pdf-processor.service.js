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
var PdfProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfProcessorService = void 0;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const common_1 = require("@nestjs/common");
let PdfProcessorService = PdfProcessorService_1 = class PdfProcessorService {
    logger = new common_1.Logger(PdfProcessorService_1.name);
    async extractTextFromPdf(buffer) {
        try {
            const data = await (0, pdf_parse_1.default)(buffer);
            const text = data.text?.trim() || '';
            if (text.length > 50) {
                this.logger.log(`Extracted ${text.length} characters of text from PDF`);
                return text;
            }
            this.logger.log('PDF has insufficient selectable text, will need OCR');
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to extract text from PDF: ${error.message}`);
            return null;
        }
    }
    async convertPdfToImages(buffer) {
        this.logger.log('PDF will be processed directly by Tesseract.js');
        return [buffer];
    }
    async hasSelectableText(buffer) {
        const text = await this.extractTextFromPdf(buffer);
        return text !== null && text.length > 50;
    }
};
exports.PdfProcessorService = PdfProcessorService;
exports.PdfProcessorService = PdfProcessorService = PdfProcessorService_1 = __decorate([
    (0, common_1.Injectable)()
], PdfProcessorService);
//# sourceMappingURL=pdf-processor.service.js.map