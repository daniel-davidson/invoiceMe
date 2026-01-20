"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverallAnalyticsDto = exports.OverallKpisDto = exports.VendorAnalyticsDto = exports.PieChartDto = exports.PieChartSegmentDto = exports.LineChartDto = exports.ChartDatasetDto = exports.KpisDto = void 0;
class KpisDto {
    currentMonthSpend;
    monthlyLimit;
    monthlyAverage;
    yearlyAverage;
    limitUtilization;
}
exports.KpisDto = KpisDto;
class ChartDatasetDto {
    label;
    data;
    color;
}
exports.ChartDatasetDto = ChartDatasetDto;
class LineChartDto {
    title;
    labels;
    datasets;
}
exports.LineChartDto = LineChartDto;
class PieChartSegmentDto {
    label;
    value;
    percentage;
    color;
}
exports.PieChartSegmentDto = PieChartSegmentDto;
class PieChartDto {
    title;
    segments;
    otherTotal;
}
exports.PieChartDto = PieChartDto;
class VendorAnalyticsDto {
    vendorId;
    vendorName;
    kpis;
    pieChart;
    lineChart;
}
exports.VendorAnalyticsDto = VendorAnalyticsDto;
class OverallKpisDto {
    totalSpend;
    totalLimits;
    remainingBalance;
    vendorCount;
    invoiceCount;
}
exports.OverallKpisDto = OverallKpisDto;
class OverallAnalyticsDto {
    kpis;
    pieChart;
    lineChart;
}
exports.OverallAnalyticsDto = OverallAnalyticsDto;
//# sourceMappingURL=analytics-response.dto.js.map