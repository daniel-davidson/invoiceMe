import { Module } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { FxCacheService } from './fx-cache.service';

@Module({
  providers: [CurrencyService, FxCacheService],
  exports: [CurrencyService],
})
export class CurrencyModule { }
