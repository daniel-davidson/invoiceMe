"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverallAnalyticsResponse = exports.VendorAnalyticsResponse = exports.LineChartData = exports.LineChartDataset = exports.PieChartData = exports.PieChartSegment = exports.OverallKPIs = exports.VendorKPIs = void 0;
class VendorKPIs {
    currentMonthSpend;
    monthlyLimit;
    monthlyAverage;
    yearlyAverage;
    limitUtilization;
}
exports.VendorKPIs = VendorKPIs;
class OverallKPIs {
    totalSpend;
    totalLimits;
    remainingBalance;
    vendorCount;
    invoiceCount;
}
exports.OverallKPIs = OverallKPIs;
class PieChartSegment {
    label;
    value;
    percentage;
    color;
}
exports.PieChartSegment = PieChartSegment;
class PieChartData {
    title;
    segments;
    otherTotal;
}
exports.PieChartData = PieChartData;
class LineChartDataset {
    label;
    data;
    color;
}
exports.LineChartDataset = LineChartDataset;
class LineChartData {
    title;
    labels;
    datasets;
}
exports.LineChartData = LineChartData;
class VendorAnalyticsResponse {
    vendorId;
    vendorName;
    kpis;
    pieChart;
    lineChart;
}
exports.VendorAnalyticsResponse = VendorAnalyticsResponse;
class OverallAnalyticsResponse {
    kpis;
    pieChart;
    lineChart;
}
exports.OverallAnalyticsResponse = OverallAnalyticsResponse;
//# sourceMappingURL=analytics-response.dto.js.map