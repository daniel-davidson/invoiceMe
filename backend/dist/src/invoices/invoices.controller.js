"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const invoices_service_1 = require("./invoices.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const tenant_decorator_1 = require("../common/decorators/tenant.decorator");
const upload_invoice_dto_1 = require("./dto/upload-invoice.dto");
const update_invoice_dto_1 = require("./dto/update-invoice.dto");
const invoice_query_dto_1 = require("./dto/invoice-query.dto");
let InvoicesController = class InvoicesController {
    invoicesService;
    constructor(invoicesService) {
        this.invoicesService = invoicesService;
    }
    async upload(tenantId, file, dto) {
        return this.invoicesService.upload(tenantId, file, dto.vendorId);
    }
    async findAll(tenantId, query) {
        return this.invoicesService.findAll(tenantId, query);
    }
    async findOne(tenantId, id) {
        return this.invoicesService.findOne(tenantId, id);
    }
    async update(tenantId, id, dto) {
        return this.invoicesService.update(tenantId, id, dto);
    }
    async remove(tenantId, id) {
        return this.invoicesService.remove(tenantId, id);
    }
    async getFile(tenantId, id, res) {
        const { buffer, mimeType, fileName } = await this.invoicesService.getFile(tenantId, id);
        res.set({
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${fileName}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
};
exports.InvoicesController = InvoicesController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const allowedMimes = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'image/jpg',
            ];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new Error('Invalid file type. Only PDF, JPEG, PNG allowed.'), false);
            }
        },
    })),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, upload_invoice_dto_1.UploadInvoiceDto]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, invoice_query_dto_1.InvoiceQueryDto]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_invoice_dto_1.UpdateInvoiceDto]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/file'),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "getFile", null);
exports.InvoicesController = InvoicesController = __decorate([
    (0, common_1.Controller)('invoices'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [invoices_service_1.InvoicesService])
], InvoicesController);
//# sourceMappingURL=invoices.controller.js.map