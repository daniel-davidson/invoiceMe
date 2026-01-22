import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    private readonly configService;
    constructor(appService: AppService, configService: ConfigService);
    getHello(): string;
    getHealth(): {
        status: string;
        timestamp: string;
        environment: any;
    };
    getConfig(): {
        apiVersion: string;
        supabaseUrl: any;
        supabaseAnonKey: any;
        features: {
            aiInsights: boolean;
            currencyConversion: boolean;
            exportCsv: boolean;
        };
        upload: {
            maxFileSizeMb: number;
            allowedTypes: string[];
            allowedExtensions: string[];
        };
    };
}
