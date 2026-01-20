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
var VendorMatcherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorMatcherService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let VendorMatcherService = VendorMatcherService_1 = class VendorMatcherService {
    prisma;
    logger = new common_1.Logger(VendorMatcherService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalizeVendorName(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\u0590-\u05FFa-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, ' ');
    }
    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
    async matchVendor(vendorName, tenantId) {
        const normalizedName = this.normalizeVendorName(vendorName);
        const vendors = await this.prisma.vendor.findMany({
            where: { tenantId },
            select: { id: true, name: true },
        });
        for (const vendor of vendors) {
            if (this.normalizeVendorName(vendor.name) === normalizedName) {
                this.logger.log(`Exact match found for vendor: ${vendor.name}`);
                return { ...vendor, isNew: false };
            }
        }
        for (const vendor of vendors) {
            const distance = this.levenshteinDistance(normalizedName, this.normalizeVendorName(vendor.name));
            if (distance <= 2) {
                this.logger.log(`Fuzzy match found for vendor: ${vendor.name} (distance: ${distance})`);
                return { ...vendor, isNew: false };
            }
        }
        this.logger.log(`Creating new vendor: ${vendorName}`);
        const maxOrderVendor = await this.prisma.vendor.findFirst({
            where: { tenantId },
            orderBy: { displayOrder: 'desc' },
            select: { displayOrder: true },
        });
        const newVendor = await this.prisma.vendor.create({
            data: {
                name: vendorName,
                tenantId,
                displayOrder: (maxOrderVendor?.displayOrder ?? 0) + 1,
            },
            select: { id: true, name: true },
        });
        return { ...newVendor, isNew: true };
    }
};
exports.VendorMatcherService = VendorMatcherService;
exports.VendorMatcherService = VendorMatcherService = VendorMatcherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VendorMatcherService);
//# sourceMappingURL=vendor-matcher.service.js.map