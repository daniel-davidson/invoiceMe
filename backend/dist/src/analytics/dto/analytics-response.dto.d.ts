export declare class KpisDto {
    currentMonthSpend: number;
    monthlyLimit: number | null;
    monthlyAverage: number;
    yearlyAverage: number;
    limitUtilization: number | null;
}
export declare class ChartDatasetDto {
    label: string;
    data: number[];
    color: string;
}
export declare class LineChartDto {
    title: string;
    labels: string[];
    datasets: ChartDatasetDto[];
}
export declare class PieChartSegmentDto {
    label: string;
    value: number;
    percentage: number;
    color: string;
}
export declare class PieChartDto {
    title: string;
    segments: PieChartSegmentDto[];
    otherTotal: number;
}
export declare class VendorAnalyticsDto {
    vendorId: string;
    vendorName: string;
    kpis: KpisDto;
    pieChart: PieChartDto;
    lineChart: LineChartDto;
}
export declare class OverallKpisDto {
    totalSpend: number;
    totalLimits: number;
    remainingBalance: number;
    vendorCount: number;
    invoiceCount: number;
}
export declare class OverallAnalyticsDto {
    kpis: OverallKpisDto;
    pieChart: PieChartDto;
    lineChart: LineChartDto;
}
