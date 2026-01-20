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
exports.InsightsController = void 0;
const common_1 = require("@nestjs/common");
const insights_service_1 = require("./insights.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const tenant_decorator_1 = require("../common/decorators/tenant.decorator");
const insight_dto_1 = require("./dto/insight.dto");
let InsightsController = class InsightsController {
    insightsService;
    constructor(insightsService) {
        this.insightsService = insightsService;
    }
    async findAll(tenantId, type, limit) {
        return this.insightsService.findAll(tenantId, type, limit || 10);
    }
    async findOne(tenantId, id) {
        return this.insightsService.findOne(tenantId, id);
    }
    async generate(tenantId, dto) {
        return this.insightsService.generate(tenantId, dto.types);
    }
    async remove(tenantId, id) {
        return this.insightsService.remove(tenantId, id);
    }
};
exports.InsightsController = InsightsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", Promise)
], InsightsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InsightsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, insight_dto_1.GenerateInsightsDto]),
    __metadata("design:returntype", Promise)
], InsightsController.prototype, "generate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InsightsController.prototype, "remove", null);
exports.InsightsController = InsightsController = __decorate([
    (0, common_1.Controller)('insights'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [insights_service_1.InsightsService])
], InsightsController);
//# sourceMappingURL=insights.controller.js.map