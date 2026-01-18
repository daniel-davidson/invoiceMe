export declare class FxCacheService {
    private readonly logger;
    private readonly cache;
    private readonly TTL_MS;
    get(baseCurrency: string): Record<string, number> | null;
    set(baseCurrency: string, rates: Record<string, number>): void;
    clear(): void;
    getStats(): {
        size: number;
        entries: Array<{
            currency: string;
            age: number;
        }>;
    };
}
