"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FxCacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FxCacheService = void 0;
const common_1 = require("@nestjs/common");
let FxCacheService = FxCacheService_1 = class FxCacheService {
    logger = new common_1.Logger(FxCacheService_1.name);
    cache = new Map();
    TTL_MS = 12 * 60 * 60 * 1000;
    get(baseCurrency) {
        const entry = this.cache.get(baseCurrency);
        if (!entry) {
            return null;
        }
        const age = Date.now() - entry.timestamp;
        if (age > this.TTL_MS) {
            this.logger.log(`Cache expired for ${baseCurrency} (age: ${Math.round(age / 1000 / 60)} minutes)`);
            this.cache.delete(baseCurrency);
            return null;
        }
        this.logger.log(`Cache hit for ${baseCurrency} (age: ${Math.round(age / 1000 / 60)} minutes)`);
        return entry.rates;
    }
    set(baseCurrency, rates) {
        this.cache.set(baseCurrency, {
            rates,
            timestamp: Date.now(),
        });
        this.logger.log(`Cached rates for ${baseCurrency}`);
    }
    clear() {
        this.cache.clear();
        this.logger.log('Cache cleared');
    }
    getStats() {
        const entries = Array.from(this.cache.entries()).map(([currency, entry]) => ({
            currency,
            age: Date.now() - entry.timestamp,
        }));
        return {
            size: this.cache.size,
            entries,
        };
    }
};
exports.FxCacheService = FxCacheService;
exports.FxCacheService = FxCacheService = FxCacheService_1 = __decorate([
    (0, common_1.Injectable)()
], FxCacheService);
//# sourceMappingURL=fx-cache.service.js.map