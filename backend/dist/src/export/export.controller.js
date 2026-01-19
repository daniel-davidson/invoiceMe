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
exports.ExportController = void 0;
const common_1 = require("@nestjs/common");
const export_service_1 = require("./export.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const tenant_decorator_1 = require("../common/decorators/tenant.decorator");
let ExportController = class ExportController {
    exportService;
    constructor(exportService) {
        this.exportService = exportService;
    }
    async exportInvoices(tenantId, vendorId, startDate, endDate, res) {
        const csv = await this.exportService.exportInvoices(tenantId, vendorId, startDate, endDate);
        const filename = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
        if (res) {
            res.set({
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}"`,
            });
            res.send(csv);
        }
    }
    async exportAnalytics(tenantId, vendorId, year, res) {
        const csv = await this.exportService.exportAnalytics(tenantId, vendorId, year);
        const filename = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
        if (res) {
            res.set({
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}"`,
            });
            res.send(csv);
        }
    }
};
exports.ExportController = ExportController;
__decorate([
    (0, common_1.Get)('invoices'),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Query)('vendorId')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportInvoices", null);
__decorate([
    (0, common_1.Get)('analytics'),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Query)('vendorId')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportAnalytics", null);
exports.ExportController = ExportController = __decorate([
    (0, common_1.Controller)('export'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [export_service_1.ExportService])
], ExportController);
//# sourceMappingURL=export.controller.js.map