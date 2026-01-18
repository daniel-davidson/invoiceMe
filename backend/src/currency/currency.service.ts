import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FxCacheService } from './fx-cache.service';

interface ConversionResult {
  normalizedAmount: number;
  fxRate: number;
  fxDate: string;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly provider: string;
  private readonly apiUrl: string;
  private readonly apiKey: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly fxCache: FxCacheService,
  ) {
    this.provider = this.configService.get('fx.provider') || 'frankfurter';
    this.apiUrl = this.configService.get('fx.apiUrl') || 'https://api.frankfurter.app';
    this.apiKey = this.configService.get('fx.apiKey');
  }

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ConversionResult> {
    // Same currency - no conversion needed
    if (fromCurrency === toCurrency) {
      return {
        normalizedAmount: amount,
        fxRate: 1,
        fxDate: new Date().toISOString().split('T')[0],
      };
    }

    try {
      const rate = await this.getRate(fromCurrency, toCurrency);
      return {
        normalizedAmount: Math.round(amount * rate * 100) / 100,
        fxRate: rate,
        fxDate: new Date().toISOString().split('T')[0],
      };
    } catch (error) {
      this.logger.error(`Currency conversion failed: ${error}`);
      // Fallback: return original amount with rate 1
      return {
        normalizedAmount: amount,
        fxRate: 1,
        fxDate: new Date().toISOString().split('T')[0],
      };
    }
  }

  private async getRate(from: string, to: string): Promise<number> {
    // Check cache for this base currency
    const cachedRates = this.fxCache.get(from);
    if (cachedRates && cachedRates[to]) {
      return cachedRates[to];
    }

    let rate: number;
    let allRates: Record<string, number> = {};

    switch (this.provider) {
      case 'frankfurter':
        const result = await this.fetchFrankfurterRates(from);
        rate = result.rates[to] || 1;
        allRates = result.rates;
        break;
      case 'openexchangerates':
        rate = await this.fetchOpenExchangeRate(from, to);
        allRates = { [to]: rate };
        break;
      case 'exchangerateapi':
        rate = await this.fetchExchangeRateApiRate(from, to);
        allRates = { [to]: rate };
        break;
      default:
        const defaultResult = await this.fetchFrankfurterRates(from);
        rate = defaultResult.rates[to] || 1;
        allRates = defaultResult.rates;
    }

    // Cache all rates for this base currency
    this.fxCache.set(from, allRates);
    return rate;
  }

  /**
   * Frankfurter API - FREE, no API key required
   * https://www.frankfurter.app/docs/
   * Returns all rates for the base currency
   */
  private async fetchFrankfurterRates(from: string): Promise<{ rates: Record<string, number> }> {
    const url = `https://api.frankfurter.app/latest?from=${from}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.rates) {
      throw new Error(`No rates found for ${from}`);
    }

    return { rates: data.rates };
  }

  /**
   * Open Exchange Rates - requires API key
   * Free tier: USD base only, 1000 req/month
   */
  private async fetchOpenExchangeRate(from: string, to: string): Promise<number> {
    if (!this.apiKey) {
      throw new Error('OXR API key not configured');
    }

    // OXR free tier only allows USD as base
    const url = `https://openexchangerates.org/api/latest.json?app_id=${this.apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OXR API error: ${response.status}`);
    }

    const data = await response.json();
    const rates = data.rates;

    // Convert through USD if needed
    const fromRate = from === 'USD' ? 1 : rates[from];
    const toRate = to === 'USD' ? 1 : rates[to];

    if (!fromRate || !toRate) {
      throw new Error(`Rate not found for ${from} or ${to}`);
    }

    return toRate / fromRate;
  }

  /**
   * ExchangeRate-API - requires API key
   * Free tier: 1500 req/month
   */
  private async fetchExchangeRateApiRate(from: string, to: string): Promise<number> {
    if (!this.apiKey) {
      throw new Error('ExchangeRate-API key not configured');
    }

    const url = `https://v6.exchangerate-api.com/v6/${this.apiKey}/pair/${from}/${to}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ExchangeRate-API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result !== 'success') {
      throw new Error(`ExchangeRate-API error: ${data['error-type']}`);
    }

    return data.conversion_rate;
  }

  /**
   * Get list of supported currencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    if (this.provider === 'frankfurter') {
      const response = await fetch('https://api.frankfurter.app/currencies');
      const data = await response.json();
      return Object.keys(data);
    }

    // Default list
    return [
      'USD', 'EUR', 'GBP', 'ILS', 'JPY', 'CAD', 'AUD', 'CHF', 
      'CNY', 'INR', 'MXN', 'BRL', 'KRW', 'SGD', 'HKD', 'NOK',
      'SEK', 'DKK', 'NZD', 'ZAR', 'RUB', 'TRY', 'PLN', 'THB',
    ];
  }
}
