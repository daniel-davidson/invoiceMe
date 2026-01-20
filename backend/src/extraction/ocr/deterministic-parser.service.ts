/**
 * Deterministic Parser Service
 *
 * Extracts invoice fields using regex patterns before LLM processing.
 * This provides fallback values and hints for the LLM.
 */
import { Injectable, Logger } from '@nestjs/common';

export interface ParsedCandidates {
  dates: string[];
  invoiceNumbers: string[];
  amounts: Array<{ value: number; keyword: string; context: string }>;
  currencies: string[];
  vendorNames: string[];
}

@Injectable()
export class DeterministicParserService {
  private readonly logger = new Logger(DeterministicParserService.name);

  /**
   * Extract all candidate values from OCR text using regex
   */
  extractCandidates(ocrText: string): ParsedCandidates {
    const startTime = Date.now();

    const candidates: ParsedCandidates = {
      dates: this.extractDates(ocrText),
      invoiceNumbers: this.extractInvoiceNumbers(ocrText),
      amounts: this.extractAmounts(ocrText),
      currencies: this.extractCurrencies(ocrText),
      vendorNames: this.extractVendorCandidates(ocrText),
    };

    const duration = Date.now() - startTime;
    this.logger.debug(
      `[DeterministicParser] Extracted candidates in ${duration}ms: ` +
        `${candidates.dates.length} dates, ${candidates.amounts.length} amounts, ` +
        `${candidates.currencies.length} currencies, ${candidates.vendorNames.length} vendors`,
    );

    return candidates;
  }

  /**
   * Extract date candidates in various formats
   */
  private extractDates(text: string): string[] {
    const dates = new Set<string>();

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyPattern = /\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})\b/g;
    let match;
    while ((match = dmyPattern.exec(text)) !== null) {
      dates.add(match[0]);
    }

    // YYYY-MM-DD (ISO format)
    const isoPattern = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
    while ((match = isoPattern.exec(text)) !== null) {
      dates.add(match[0]);
    }

    // Hebrew date formats with month names
    const hebrewMonths = [
      'ינואר',
      'פברואר',
      'מרץ',
      'אפריל',
      'מאי',
      'יוני',
      'יולי',
      'אוגוסט',
      'ספטמבר',
      'אוקטובר',
      'נובמבר',
      'דצמבר',
    ];
    const monthPattern = new RegExp(
      `\\b(\\d{1,2})\\s+(${hebrewMonths.join('|')})\\s+(\\d{4})\\b`,
      'g',
    );
    while ((match = monthPattern.exec(text)) !== null) {
      dates.add(match[0]);
    }

    return Array.from(dates);
  }

  /**
   * Extract invoice number candidates
   */
  private extractInvoiceNumbers(text: string): string[] {
    const numbers = new Set<string>();

    // Hebrew patterns
    const hebrewPatterns = [
      /חשבונית\s*מס[׳']?\s*[:#]?\s*(\d+[-\/]?\d*)/gi,
      /מס[׳']?\s*חשבונית\s*[:#]?\s*(\d+[-\/]?\d*)/gi,
      /קבלה\s*מס[׳']?\s*[:#]?\s*(\d+[-\/]?\d*)/gi,
      /מספר\s*[:#]?\s*(\d+[-\/]?\d*)/gi,
    ];

    // English patterns
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

  /**
   * Extract amount candidates with their context
   */
  private extractAmounts(
    text: string,
  ): Array<{ value: number; keyword: string; context: string }> {
    const amounts: Array<{ value: number; keyword: string; context: string }> =
      [];

    // Hebrew keywords for total/payment
    const hebrewKeywords = [
      {
        pattern: /סה["״']?כ\s*לתשלום\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi,
        keyword: 'total_to_pay_he',
      },
      {
        pattern: /לתשלום\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi,
        keyword: 'to_pay_he',
      },
      {
        pattern: /יתרה\s*לתשלום\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi,
        keyword: 'balance_due_he',
      },
      {
        pattern: /סה["״']?כ\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi,
        keyword: 'total_he',
      },
      {
        pattern: /סכום\s*כולל\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi,
        keyword: 'total_amount_he',
      },
    ];

    // English keywords
    const englishKeywords = [
      {
        pattern: /total\s*amount\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi,
        keyword: 'total_amount_en',
      },
      {
        pattern: /amount\s*due\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi,
        keyword: 'amount_due_en',
      },
      {
        pattern: /grand\s*total\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi,
        keyword: 'grand_total_en',
      },
      {
        pattern: /total\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi,
        keyword: 'total_en',
      },
      {
        pattern: /balance\s*[:\s]*([₪$€£]?\s*[\d,]+\.?\d*)/gi,
        keyword: 'balance_en',
      },
    ];

    const allKeywords = [...hebrewKeywords, ...englishKeywords];

    for (const { pattern, keyword } of allKeywords) {
      let match;
      pattern.lastIndex = 0; // Reset regex
      while ((match = pattern.exec(text)) !== null) {
        const amountStr = match[1].replace(/[₪$€£,\s]/g, '');
        const amount = parseFloat(amountStr);

        if (!isNaN(amount) && amount > 0) {
          // Get context (50 chars before and after)
          const matchStart = match.index;
          const contextStart = Math.max(0, matchStart - 50);
          const contextEnd = Math.min(
            text.length,
            matchStart + match[0].length + 50,
          );
          const context = text
            .substring(contextStart, contextEnd)
            .replace(/\s+/g, ' ');

          amounts.push({ value: amount, keyword, context });
        }
      }
    }

    // Sort by keyword priority (total_to_pay is most important)
    amounts.sort((a, b) => {
      const priority: Record<string, number> = {
        total_to_pay_he: 1,
        amount_due_en: 1,
        to_pay_he: 2,
        grand_total_en: 2,
        balance_due_he: 3,
        total_he: 4,
        total_en: 4,
      };
      return (priority[a.keyword] || 10) - (priority[b.keyword] || 10);
    });

    return amounts;
  }

  /**
   * Extract currency symbols and codes
   */
  private extractCurrencies(text: string): string[] {
    const currencies = new Set<string>();

    // Currency symbols
    if (/₪/.test(text)) currencies.add('ILS');
    if (/\$/.test(text)) currencies.add('USD');
    if (/€/.test(text)) currencies.add('EUR');
    if (/£/.test(text)) currencies.add('GBP');

    // Currency codes
    const codes = text.match(/\b(ILS|NIS|USD|EUR|GBP)\b/gi);
    if (codes) {
      codes.forEach((code) => {
        const normalized = code.toUpperCase();
        if (normalized === 'NIS') {
          currencies.add('ILS');
        } else {
          currencies.add(normalized);
        }
      });
    }

    return Array.from(currencies);
  }

  /**
   * Extract vendor/business name candidates from top of document
   */
  private extractVendorCandidates(text: string): string[] {
    const vendors = new Set<string>();

    // Take first 500 characters (vendor name usually at top)
    const topText = text.substring(0, 500);
    const lines = topText.split('\n').filter((line) => line.trim().length > 0);

    // First 5 lines often contain vendor name
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();

      // Skip very short lines (< 3 chars) or very long lines (> 80 chars)
      if (line.length < 3 || line.length > 80) continue;

      // Skip lines that are mostly numbers or symbols
      const alphaRatio =
        (line.match(/[a-zA-Z\u0590-\u05FF]/g) || []).length / line.length;
      if (alphaRatio < 0.5) continue;

      // Skip common header keywords
      const skipKeywords = [
        'חשבונית',
        'קבלה',
        'invoice',
        'receipt',
        'tel:',
        'phone:',
        'email:',
      ];
      if (skipKeywords.some((kw) => line.toLowerCase().includes(kw))) continue;

      vendors.add(line);
    }

    return Array.from(vendors);
  }

  /**
   * Get the most likely total amount from candidates
   */
  getBestTotalAmount(candidates: ParsedCandidates): number | null {
    if (candidates.amounts.length === 0) return null;

    // Return the first (highest priority) amount
    return candidates.amounts[0].value;
  }

  /**
   * Get the most likely currency
   */
  getBestCurrency(candidates: ParsedCandidates): string | null {
    if (candidates.currencies.length === 0) return null;

    // If multiple currencies, prefer ILS for Hebrew documents, USD otherwise
    if (candidates.currencies.length === 1) {
      return candidates.currencies[0];
    }

    // Prefer ILS if present (most Hebrew invoices)
    if (candidates.currencies.includes('ILS')) return 'ILS';

    // Otherwise return first
    return candidates.currencies[0];
  }

  /**
   * Get the most likely invoice date
   */
  getBestDate(candidates: ParsedCandidates): string | null {
    if (candidates.dates.length === 0) return null;

    // Return first date found (usually invoice date is prominent)
    return candidates.dates[0];
  }
}
