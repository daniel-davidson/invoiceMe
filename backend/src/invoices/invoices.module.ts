import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { ExtractionModule } from '../extraction/extraction.module';
import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    MulterModule.register({
      storage: require('multer').memoryStorage(),
    }),
    PrismaModule,
    ExtractionModule,
    StorageModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
