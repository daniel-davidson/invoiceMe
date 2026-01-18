import { Module } from '@nestjs/common';
import { ExtractionService } from './extraction.service';
import { PdfProcessorService } from './ocr/pdf-processor.service';
import { OcrService } from './ocr/ocr.service';
import { OllamaService } from './llm/ollama.service';
import { LlmService } from './llm/llm.service';
import { VendorMatcherService } from './vendor-matcher.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [PrismaModule, StorageModule, CurrencyModule],
  providers: [
    ExtractionService,
    PdfProcessorService,
    OcrService,
    OllamaService,
    LlmService,
    VendorMatcherService,
  ],
  exports: [ExtractionService, OllamaService, LlmService],
})
export class ExtractionModule {}
