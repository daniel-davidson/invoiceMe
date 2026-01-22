"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const invoices_controller_1 = require("./invoices.controller");
const invoices_service_1 = require("./invoices.service");
const extraction_module_1 = require("../extraction/extraction.module");
const storage_module_1 = require("../storage/storage.module");
const prisma_module_1 = require("../prisma/prisma.module");
let InvoicesModule = class InvoicesModule {
};
exports.InvoicesModule = InvoicesModule;
exports.InvoicesModule = InvoicesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            platform_express_1.MulterModule.register({
                storage: require('multer').memoryStorage(),
            }),
            prisma_module_1.PrismaModule,
            extraction_module_1.ExtractionModule,
            storage_module_1.StorageModule,
        ],
        controllers: [invoices_controller_1.InvoicesController],
        providers: [invoices_service_1.InvoicesService],
        exports: [invoices_service_1.InvoicesService],
    })
], InvoicesModule);
//# sourceMappingURL=invoices.module.js.map