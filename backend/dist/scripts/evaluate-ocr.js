"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const ocr_service_1 = require("../src/extraction/ocr/ocr.service");
const deterministic_parser_service_1 = require("../src/extraction/ocr/deterministic-parser.service");
const ollama_service_1 = require("../src/extraction/llm/ollama.service");
const pdf_processor_service_1 = require("../src/extraction/ocr/pdf-processor.service");
async function evaluateFile(filepath, filename, ocrService, pdfService, parserService, ollamaService) {
    const startTime = Date.now();
    const result = {
        filename,
        type: filename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
        ocrMethod: 'unknown',
        textLength: 0,
        deterministicCandidates: { dates: 0, amounts: 0, currencies: 0, vendors: 0 },
        extractedData: {
            vendorName: null,
            invoiceDate: null,
            totalAmount: null,
            currency: null,
            warnings: [],
        },
        processingTime: 0,
        success: false,
    };
    try {
        const buffer = fs.readFileSync(filepath);
        const mimeType = result.type === 'pdf' ? 'application/pdf' : 'image/jpeg';
        let ocrText = '';
        if (result.type === 'pdf') {
            const hasText = await pdfService.hasSelectableText(buffer);
            if (hasText) {
                result.ocrMethod = 'pdf_text_extraction';
                ocrText = (await pdfService.extractTextFromPdf(buffer)) || '';
            }
            else {
                result.ocrMethod = 'multi_pass_ocr';
                const ocrResult = await ocrService.recognizeTextMultiPass(buffer, mimeType);
                ocrText = ocrResult.bestText;
                result.chosenPass = ocrResult.chosenPass;
                result.chosenScore = ocrResult.chosenScore;
                result.chosenConfidence = ocrResult.chosenConfidence;
            }
        }
        else {
            result.ocrMethod = 'multi_pass_ocr';
            const ocrResult = await ocrService.recognizeTextMultiPass(buffer, mimeType);
            ocrText = ocrResult.bestText;
            result.chosenPass = ocrResult.chosenPass;
            result.chosenScore = ocrResult.chosenScore;
            result.chosenConfidence = ocrResult.chosenConfidence;
        }
        result.textLength = ocrText.length;
        const candidates = parserService.extractCandidates(ocrText);
        result.deterministicCandidates = {
            dates: candidates.dates.length,
            amounts: candidates.amounts.length,
            currencies: candidates.currencies.length,
            vendors: candidates.vendorNames.length,
        };
        const deterministicHints = {
            bestTotal: parserService.getBestTotalAmount(candidates),
            bestCurrency: parserService.getBestCurrency(candidates),
            bestDate: parserService.getBestDate(candidates),
            vendorCandidates: candidates.vendorNames,
        };
        const extracted = await ollamaService.extractFromText(ocrText, deterministicHints);
        result.extractedData = {
            vendorName: extracted.vendorName,
            invoiceDate: extracted.invoiceDate,
            totalAmount: extracted.totalAmount,
            currency: extracted.currency,
            warnings: extracted.warnings,
        };
        result.success = true;
    }
    catch (error) {
        result.error = error.message;
        result.success = false;
    }
    result.processingTime = Date.now() - startTime;
    return result;
}
async function main() {
    console.log('='.repeat(80));
    console.log('OCR PIPELINE EVALUATION');
    console.log('='.repeat(80));
    console.log();
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn'],
    });
    const ocrService = app.get(ocr_service_1.OcrService);
    const pdfService = app.get(pdf_processor_service_1.PdfProcessorService);
    const parserService = app.get(deterministic_parser_service_1.DeterministicParserService);
    const ollamaService = app.get(ollama_service_1.OllamaService);
    const goldenSetDir = path.join(__dirname, '../test-data/golden-set');
    if (!fs.existsSync(goldenSetDir)) {
        console.log(`⚠️  Golden set directory not found: ${goldenSetDir}`);
        console.log(`Please create it and add test invoices.`);
        console.log();
        console.log(`Recommended structure:`);
        console.log(`  test-data/golden-set/`);
        console.log(`    hebrew-invoices/    (10 Hebrew invoices with tables)`);
        console.log(`    receipts/           (10 receipt photos)`);
        console.log(`    english-invoices/   (5 English invoices)`);
        console.log(`    pdfs-text/          (5 PDFs with selectable text)`);
        console.log(`    pdfs-scanned/       (5 scanned PDFs)`);
        await app.close();
        return;
    }
    const files = [];
    const findFiles = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                findFiles(fullPath);
            }
            else if (entry.isFile() && /\.(pdf|jpe?g|png)$/i.test(entry.name)) {
                files.push(fullPath);
            }
        }
    };
    findFiles(goldenSetDir);
    if (files.length === 0) {
        console.log(`⚠️  No test files found in ${goldenSetDir}`);
        await app.close();
        return;
    }
    console.log(`Found ${files.length} test file(s)\n`);
    const results = [];
    for (let i = 0; i < files.length; i++) {
        const filepath = files[i];
        const filename = path.basename(filepath);
        const relPath = path.relative(goldenSetDir, filepath);
        console.log(`[${i + 1}/${files.length}] Processing: ${relPath}`);
        const result = await evaluateFile(filepath, relPath, ocrService, pdfService, parserService, ollamaService);
        results.push(result);
        if (result.success) {
            console.log(`  ✓ Success (${result.processingTime}ms)`);
            console.log(`    Method: ${result.ocrMethod}`);
            if (result.chosenPass) {
                console.log(`    Chosen Pass: ${result.chosenPass} (score: ${result.chosenScore?.toFixed(1)}, conf: ${result.chosenConfidence?.toFixed(1)}%)`);
            }
            console.log(`    OCR Text: ${result.textLength} chars`);
            console.log(`    Deterministic: ${result.deterministicCandidates.dates} dates, ${result.deterministicCandidates.amounts} amounts, ${result.deterministicCandidates.currencies} currencies, ${result.deterministicCandidates.vendors} vendors`);
            console.log(`    Extracted:`);
            console.log(`      Vendor: ${result.extractedData.vendorName || '(null)'}`);
            console.log(`      Date: ${result.extractedData.invoiceDate || '(null)'}`);
            console.log(`      Total: ${result.extractedData.totalAmount || '(null)'} ${result.extractedData.currency || ''}`);
            if (result.extractedData.warnings.length > 0) {
                console.log(`      Warnings: ${result.extractedData.warnings.join(', ')}`);
            }
        }
        else {
            console.log(`  ✗ Failed: ${result.error}`);
        }
        console.log();
    }
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log();
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const avgTime = successful.reduce((sum, r) => sum + r.processingTime, 0) / (successful.length || 1);
    console.log(`Total files: ${results.length}`);
    console.log(`Successful: ${successful.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${failed.length}`);
    console.log(`Average processing time: ${avgTime.toFixed(0)}ms`);
    console.log();
    const withVendor = successful.filter(r => r.extractedData.vendorName).length;
    const withTotal = successful.filter(r => r.extractedData.totalAmount).length;
    const withDate = successful.filter(r => r.extractedData.invoiceDate).length;
    const withCurrency = successful.filter(r => r.extractedData.currency).length;
    console.log(`Extraction completeness (of successful):`);
    console.log(`  Vendor name: ${withVendor}/${successful.length} (${((withVendor / (successful.length || 1)) * 100).toFixed(1)}%)`);
    console.log(`  Total amount: ${withTotal}/${successful.length} (${((withTotal / (successful.length || 1)) * 100).toFixed(1)}%)`);
    console.log(`  Invoice date: ${withDate}/${successful.length} (${((withDate / (successful.length || 1)) * 100).toFixed(1)}%)`);
    console.log(`  Currency: ${withCurrency}/${successful.length} (${((withCurrency / (successful.length || 1)) * 100).toFixed(1)}%)`);
    console.log();
    const byMethod = successful.reduce((acc, r) => {
        acc[r.ocrMethod] = (acc[r.ocrMethod] || 0) + 1;
        return acc;
    }, {});
    console.log(`OCR method breakdown:`);
    for (const [method, count] of Object.entries(byMethod)) {
        console.log(`  ${method}: ${count}`);
    }
    console.log();
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=evaluate-ocr.js.map