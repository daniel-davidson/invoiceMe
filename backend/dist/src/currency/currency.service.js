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
var CurrencyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fx_cache_service_1 = require("./fx-cache.service");
let CurrencyService = CurrencyService_1 = class CurrencyService {
    configService;
    fxCache;
    logger = new common_1.Logger(CurrencyService_1.name);
    provider;
    apiUrl;
    apiKey;
    constructor(configService, fxCache) {
        this.configService = configService;
        this.fxCache = fxCache;
        this.provider = this.configService.get('fx.provider') || 'frankfurter';
        this.apiUrl =
            this.configService.get('fx.apiUrl') || 'https://api.frankfurter.app';
        this.apiKey = this.configService.get('fx.apiKey');
    }
    async convert(amount, fromCurrency, toCurrency) {
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
        }
        catch (error) {
            this.logger.error(`Currency conversion failed: ${error}`);
            return {
                normalizedAmount: amount,
                fxRate: 1,
                fxDate: new Date().toISOString().split('T')[0],
            };
        }
    }
    async getRate(from, to) {
        const cachedRates = this.fxCache.get(from);
        if (cachedRates && cachedRates[to]) {
            return cachedRates[to];
        }
        let rate;
        let allRates = {};
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
        this.fxCache.set(from, allRates);
        return rate;
    }
    async fetchFrankfurterRates(from) {
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
    async fetchOpenExchangeRate(from, to) {
        if (!this.apiKey) {
            throw new Error('OXR API key not configured');
        }
        const url = `https://openexchangerates.org/api/latest.json?app_id=${this.apiKey}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`OXR API error: ${response.status}`);
        }
        const data = await response.json();
        const rates = data.rates;
        const fromRate = from === 'USD' ? 1 : rates[from];
        const toRate = to === 'USD' ? 1 : rates[to];
        if (!fromRate || !toRate) {
            throw new Error(`Rate not found for ${from} or ${to}`);
        }
        return toRate / fromRate;
    }
    async fetchExchangeRateApiRate(from, to) {
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
    async getSupportedCurrencies() {
        if (this.provider === 'frankfurter') {
            const response = await fetch('https://api.frankfurter.app/currencies');
            const data = await response.json();
            return Object.keys(data);
        }
        return [
            'USD',
            'EUR',
            'GBP',
            'ILS',
            'JPY',
            'CAD',
            'AUD',
            'CHF',
            'CNY',
            'INR',
            'MXN',
            'BRL',
            'KRW',
            'SGD',
            'HKD',
            'NOK',
            'SEK',
            'DKK',
            'NZD',
            'ZAR',
            'RUB',
            'TRY',
            'PLN',
            'THB',
        ];
    }
};
exports.CurrencyService = CurrencyService;
exports.CurrencyService = CurrencyService = CurrencyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        fx_cache_service_1.FxCacheService])
], CurrencyService);
//# sourceMappingURL=currency.service.js.map