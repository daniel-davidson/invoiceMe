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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightResponse = exports.GenerateInsightsDto = exports.InsightType = void 0;
const class_validator_1 = require("class-validator");
var InsightType;
(function (InsightType) {
    InsightType["MONTHLY_NARRATIVE"] = "MONTHLY_NARRATIVE";
    InsightType["RECURRING_CHARGES"] = "RECURRING_CHARGES";
    InsightType["ANOMALIES"] = "ANOMALIES";
})(InsightType || (exports.InsightType = InsightType = {}));
class GenerateInsightsDto {
    types;
}
exports.GenerateInsightsDto = GenerateInsightsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(InsightType, { each: true }),
    __metadata("design:type", Array)
], GenerateInsightsDto.prototype, "types", void 0);
class InsightResponse {
    id;
    insightType;
    title;
    content;
    relatedMetrics;
    generatedAt;
    createdAt;
}
exports.InsightResponse = InsightResponse;
//# sourceMappingURL=insight.dto.js.map