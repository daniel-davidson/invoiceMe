import { ConfigService } from '@nestjs/config';
import { FxCacheService } from './fx-cache.service';
interface ConversionResult {
    normalizedAmount: number;
    fxRate: number;
    fxDate: string;
}
export declare class CurrencyService {
    private readonly configService;
    private readonly fxCache;
    private readonly logger;
    private readonly provider;
    private readonly apiUrl;
    private readonly apiKey;
    constructor(configService: ConfigService, fxCache: FxCacheService);
    convert(amount: number, fromCurrency: string, toCurrency: string): Promise<ConversionResult>;
    private getRate;
    private fetchFrankfurterRates;
    private fetchOpenExchangeRate;
    private fetchExchangeRateApiRate;
    getSupportedCurrencies(): Promise<string[]>;
}
export {};
