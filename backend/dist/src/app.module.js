"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const invoices_module_1 = require("./invoices/invoices.module");
const vendors_module_1 = require("./vendors/vendors.module");
const analytics_module_1 = require("./analytics/analytics.module");
const insights_module_1 = require("./insights/insights.module");
const export_module_1 = require("./export/export.module");
const storage_module_1 = require("./storage/storage.module");
const extraction_module_1 = require("./extraction/extraction.module");
const currency_module_1 = require("./currency/currency.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const configuration_1 = __importDefault(require("./config/configuration"));
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            invoices_module_1.InvoicesModule,
            vendors_module_1.VendorsModule,
            analytics_module_1.AnalyticsModule,
            insights_module_1.InsightsModule,
            export_module_1.ExportModule,
            storage_module_1.StorageModule,
            extraction_module_1.ExtractionModule,
            currency_module_1.CurrencyModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_FILTER,
                useClass: http_exception_filter_1.HttpExceptionFilter,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map