"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DeterministicParserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeterministicParserService = void 0;
const common_1 = require("@nestjs/common");
let DeterministicParserService = DeterministicParserService_1 = class DeterministicParserService {
    logger = new common_1.Logger(DeterministicParserService_1.name);
    extractCandidates(ocrText) {
        const startTime = Date.now();
        const candidates = {
            dates: this.extractDates(ocrText),
            invoiceNumbers: this.extractInvoiceNumbers(ocrText),
            amounts: this.extractAmounts(ocrText),
            currencies: this.extractCurrencies(ocrText),
            vendorNames: this.extractVendorCandidates(ocrText),
        };
        const duration = Date.now() - startTime;
        this.logger.debug(`[DeterministicParser] Extracted candidates in ${duration}ms: ` +
            `${candidates.dates.length} dates, ${candidates.amounts.length} amounts, ` +
            `${candidates.currencies.length} currencies, ${candidates.vendorNames.length} vendors`);
        return candidates;
    }
    extractDates(text) {
        const dates = new Set();
        const dmyPattern = /\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})\b/g;
        let match;
        while ((match = dmyPattern.exec(text)) !== null) {
            dates.add(match[0]);
        }
        const isoPattern = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
        while ((match = isoPattern.exec(text)) !== null) {
            dates.add(match[0]);
        }
        const hebrewMonths = [
            'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
            'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
        ];
        const monthPattern = new RegExp(`\\b(\\d{1,2})\\s+(${hebrewMonths.join('|')})\\s+(\\d{4})\\b`, 'g');
        while ((match = monthPattern.exec(text)) !== null) {
            dates.add(match[0]);
        }
        return Array.from(dates);
    }
    extractInvoiceNumbers(text) {
        const numbers = new Set();
        const hebrewPatterns = [
            /חשבונית\s*מס[׳']?\s*[:#]?\s*(\d+[-\/]?\d*)/gi,
            /מס[׳']?\s*חשבונית\s*[:#]?\s*(\d+[-\/]?\d*)/gi,
            /קבלה\s*מס[׳']?\s*[:#]?\s*(\d+[-\/]?\d*)/gi,
            /מספר\s*[:#]?\s*(\d+[-\/]?\d*)/gi,
        ];
        const englishPatterns = [
            /invoice\s*#?\s*[:#]?\s*(\d+[-\/]?\d*)/gi,
            /receipt\s*#?\s*[:#]?\s*(\d+[-\/]?\d*)/gi,
            /inv\.\s*#?\s*[:#]?\s*(\d+[-\/]?\d*)/gi,
        ];
        const allPatterns = [...hebrewPatterns, ...englishPatterns];
        for (const pattern of allPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (match[1]) {
                    numbers.add(match[1].trim());
                }
            }
        }
        return Array.from(numbers);
    }
    extractAmounts(text) {
        const amounts = [];
        const hebrewKeywords = [
            { pattern: /סה["״']?כ\s*לתשלום\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi, keyword: 'total_to_pay_he' },
            { pattern: /לתשלום\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi, keyword: 'to_pay_he' },
            { pattern: /יתרה\s*לתשלום\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi, keyword: 'balance_due_he' },
            { pattern: /סה["״']?כ\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi, keyword: 'total_he' },
            { pattern: /סכום\s*כולל\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi, keyword: 'total_amount_he' },
        ];
        const englishKeywords = [
            { pattern: /total\s*amount\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi, keyword: 'total_amount_en' },
            { pattern: /amount\s*due\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi, keyword: 'amount_due_en' },
            { pattern: /grand\s*total\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi, keyword: 'grand_total_en' },
            { pattern: /total\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi, keyword: 'total_en' },
            { pattern: /balance\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi, keyword: 'balance_en' },
        ];
        const allKeywords = [...hebrewKeywords, ...englishKeywords];
        for (const { pattern, keyword } of allKeywords) {
            let match;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(text)) !== null) {
                const amountStr = match[1].replace(/[₪$€£,\s]/g, '');
                const amount = parseFloat(amountStr);
                if (!isNaN(amount) && amount > 0) {
                    const matchStart = match.index;
                    const contextStart = Math.max(0, matchStart - 50);
                    const contextEnd = Math.min(text.length, matchStart + match[0].length + 50);
                    const context = text.substring(contextStart, contextEnd).replace(/\s+/g, ' ');
                    amounts.push({ value: amount, keyword, context });
                }
            }
        }
        amounts.sort((a, b) => {
            const priority = {
                'total_to_pay_he': 1,
                'amount_due_en': 1,
                'to_pay_he': 2,
                'grand_total_en': 2,
                'balance_due_he': 3,
                'total_he': 4,
                'total_en': 4,
            };
            return (priority[a.keyword] || 10) - (priority[b.keyword] || 10);
        });
        return amounts;
    }
    extractCurrencies(text) {
        const currencies = new Set();
        if (/₪/.test(text))
            currencies.add('ILS');
        if (/\$/.test(text))
            currencies.add('USD');
        if (/€/.test(text))
            currencies.add('EUR');
        if (/£/.test(text))
            currencies.add('GBP');
        const codes = text.match(/\b(ILS|NIS|USD|EUR|GBP)\b/gi);
        if (codes) {
            codes.forEach(code => {
                const normalized = code.toUpperCase();
                if (normalized === 'NIS') {
                    currencies.add('ILS');
                }
                else {
                    currencies.add(normalized);
                }
            });
        }
        return Array.from(currencies);
    }
    extractVendorCandidates(text) {
        const vendors = new Set();
        const topText = text.substring(0, 500);
        const lines = topText.split('\n').filter(line => line.trim().length > 0);
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i].trim();
            if (line.length < 3 || line.length > 80)
                continue;
            const alphaRatio = (line.match(/[a-zA-Z\u0590-\u05FF]/g) || []).length / line.length;
            if (alphaRatio < 0.5)
                continue;
            const skipKeywords = ['חשבונית', 'קבלה', 'invoice', 'receipt', 'tel:', 'phone:', 'email:'];
            if (skipKeywords.some(kw => line.toLowerCase().includes(kw)))
                continue;
            vendors.add(line);
        }
        return Array.from(vendors);
    }
    getBestTotalAmount(candidates) {
        if (candidates.amounts.length === 0)
            return null;
        return candidates.amounts[0].value;
    }
    getBestCurrency(candidates) {
        if (candidates.currencies.length === 0)
            return null;
        if (candidates.currencies.length === 1) {
            return candidates.currencies[0];
        }
        if (candidates.currencies.includes('ILS'))
            return 'ILS';
        return candidates.currencies[0];
    }
    getBestDate(candidates) {
        if (candidates.dates.length === 0)
            return null;
        return candidates.dates[0];
    }
};
exports.DeterministicParserService = DeterministicParserService;
exports.DeterministicParserService = DeterministicParserService = DeterministicParserService_1 = __decorate([
    (0, common_1.Injectable)()
], DeterministicParserService);
//# sourceMappingURL=deterministic-parser.service.js.map