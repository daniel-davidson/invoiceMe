import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry {
  rates: Record<string, number>;
  timestamp: number;
}

@Injectable()
export class FxCacheService {
  private readonly logger = new Logger(FxCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

  /**
   * Get cached FX rates for a base currency
   * @param baseCurrency - Base currency code (e.g., 'USD')
   * @returns Cached rates or null if not found/expired
   */
  get(baseCurrency: string): Record<string, number> | null {
    const entry = this.cache.get(baseCurrency);

    if (!entry) {
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.TTL_MS) {
      this.logger.log(`Cache expired for ${baseCurrency} (age: ${Math.round(age / 1000 / 60)} minutes)`);
      this.cache.delete(baseCurrency);
      return null;
    }

    this.logger.log(`Cache hit for ${baseCurrency} (age: ${Math.round(age / 1000 / 60)} minutes)`);
    return entry.rates;
  }

  /**
   * Set FX rates in cache
   * @param baseCurrency - Base currency code
   * @param rates - Exchange rates object
   */
  set(baseCurrency: string, rates: Record<string, number>): void {
    this.cache.set(baseCurrency, {
      rates,
      timestamp: Date.now(),
    });
    this.logger.log(`Cached rates for ${baseCurrency}`);
  }

  /**
   * Clear all cached rates
   */
  clear(): void {
    this.cache.clear();
    this.logger.log('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: Array<{ currency: string; age: number }> } {
    const entries = Array.from(this.cache.entries()).map(([currency, entry]) => ({
      currency,
      age: Date.now() - entry.timestamp,
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }
}
