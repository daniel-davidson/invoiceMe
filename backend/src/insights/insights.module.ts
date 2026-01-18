import { Module } from '@nestjs/common';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ExtractionModule } from '../extraction/extraction.module';

@Module({
  imports: [PrismaModule, ExtractionModule],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}
