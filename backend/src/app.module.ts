import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InvoicesModule } from './invoices/invoices.module';
import { VendorsModule } from './vendors/vendors.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { InsightsModule } from './insights/insights.module';
import { ExportModule } from './export/export.module';
import { StorageModule } from './storage/storage.module';
import { ExtractionModule } from './extraction/extraction.module';
import { CurrencyModule } from './currency/currency.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    InvoicesModule,
    VendorsModule,
    AnalyticsModule,
    InsightsModule,
    ExportModule,
    StorageModule,
    ExtractionModule,
    CurrencyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Note: Global guards are commented out to allow public auth endpoints
    // Individual routes will use @UseGuards(JwtAuthGuard, TenantGuard) as needed
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: TenantGuard,
    // },
  ],
})
export class AppModule {}
