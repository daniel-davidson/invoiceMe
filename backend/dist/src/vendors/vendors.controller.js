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
exports.VendorsController = void 0;
const common_1 = require("@nestjs/common");
const vendors_service_1 = require("./vendors.service");
const tenant_decorator_1 = require("../common/decorators/tenant.decorator");
const create_vendor_dto_1 = require("./dto/create-vendor.dto");
const update_vendor_dto_1 = require("./dto/update-vendor.dto");
const reorder_vendors_dto_1 = require("./dto/reorder-vendors.dto");
let VendorsController = class VendorsController {
    vendorsService;
    constructor(vendorsService) {
        this.vendorsService = vendorsService;
    }
    async findAll(tenantId, includeInvoiceCount) {
        return this.vendorsService.findAll(tenantId, includeInvoiceCount === 'true');
    }
    async findOne(tenantId, id) {
        return this.vendorsService.findOne(tenantId, id);
    }
    async create(tenantId, dto) {
        return this.vendorsService.create(tenantId, dto);
    }
    async update(tenantId, id, dto) {
        return this.vendorsService.update(tenantId, id, dto);
    }
    async remove(tenantId, id) {
        return this.vendorsService.remove(tenantId, id);
    }
    async reorder(tenantId, dto) {
        return this.vendorsService.reorder(tenantId, dto.vendorIds);
    }
};
exports.VendorsController = VendorsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Query)('includeInvoiceCount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_vendor_dto_1.CreateVendorDto]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_vendor_dto_1.UpdateVendorDto]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('reorder'),
    __param(0, (0, tenant_decorator_1.Tenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reorder_vendors_dto_1.ReorderVendorsDto]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "reorder", null);
exports.VendorsController = VendorsController = __decorate([
    (0, common_1.Controller)('vendors'),
    __metadata("design:paramtypes", [vendors_service_1.VendorsService])
], VendorsController);
//# sourceMappingURL=vendors.controller.js.map