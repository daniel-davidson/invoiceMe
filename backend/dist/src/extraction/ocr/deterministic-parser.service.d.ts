export interface ParsedCandidates {
    dates: string[];
    invoiceNumbers: string[];
    amounts: Array<{
        value: number;
        keyword: string;
        context: string;
    }>;
    currencies: string[];
    vendorNames: string[];
}
export declare class DeterministicParserService {
    private readonly logger;
    extractCandidates(ocrText: string): ParsedCandidates;
    private extractDates;
    private extractInvoiceNumbers;
    private extractAmounts;
    private extractCurrencies;
    private extractVendorCandidates;
    getBestTotalAmount(candidates: ParsedCandidates): number | null;
    getBestCurrency(candidates: ParsedCandidates): string | null;
    getBestDate(candidates: ParsedCandidates): string | null;
}
