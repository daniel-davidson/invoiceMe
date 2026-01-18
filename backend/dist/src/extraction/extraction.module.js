"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractionModule = void 0;
const common_1 = require("@nestjs/common");
const extraction_service_1 = require("./extraction.service");
const pdf_processor_service_1 = require("./ocr/pdf-processor.service");
const ocr_service_1 = require("./ocr/ocr.service");
const ollama_service_1 = require("./llm/ollama.service");
const llm_service_1 = require("./llm/llm.service");
const vendor_matcher_service_1 = require("./vendor-matcher.service");
const prisma_module_1 = require("../prisma/prisma.module");
const storage_module_1 = require("../storage/storage.module");
const currency_module_1 = require("../currency/currency.module");
let ExtractionModule = class ExtractionModule {
};
exports.ExtractionModule = ExtractionModule;
exports.ExtractionModule = ExtractionModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, storage_module_1.StorageModule, currency_module_1.CurrencyModule],
        providers: [
            extraction_service_1.ExtractionService,
            pdf_processor_service_1.PdfProcessorService,
            ocr_service_1.OcrService,
            ollama_service_1.OllamaService,
            llm_service_1.LlmService,
            vendor_matcher_service_1.VendorMatcherService,
        ],
        exports: [extraction_service_1.ExtractionService, ollama_service_1.OllamaService, llm_service_1.LlmService],
    })
], ExtractionModule);
//# sourceMappingURL=extraction.module.js.map