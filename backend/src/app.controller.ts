import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('environment'),
    };
  }

  /**
   * Public config endpoint for frontend
   * Returns ONLY public/safe configuration values
   * NO secrets are exposed here
   */
  @Get('api/config')
  getConfig() {
    // Get the appropriate client key (new publishable or legacy anon)
    const supabaseClientKey =
      this.configService.get('supabase.publishableKey') ||
      this.configService.get('supabase.anonKey');

    return {
      // API URL (frontend can use this or infer from current request)
      apiVersion: 'v1',

      // Supabase public config
      // Note: publishable key and anon key are both safe for frontend
      supabaseUrl: this.configService.get('supabase.url'),
      supabaseAnonKey: supabaseClientKey,

      // Feature flags
      features: {
        aiInsights: true,
        currencyConversion: true,
        exportCsv: true,
      },

      // File upload constraints
      upload: {
        maxFileSizeMb:
          this.configService.get('storage.maxFileSize') / (1024 * 1024),
        allowedTypes: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/jpg',
        ],
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      },
    };
  }
}
