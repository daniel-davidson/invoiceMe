export declare class VendorKPIs {
    currentMonthSpend: number;
    monthlyLimit: number | null;
    monthlyAverage: number;
    yearlyAverage: number;
    limitUtilization: number | null;
}
export declare class OverallKPIs {
    totalSpend: number;
    totalLimits: number;
    remainingBalance: number;
    vendorCount: number;
    invoiceCount: number;
}
export declare class PieChartSegment {
    label: string;
    value: number;
    percentage: number;
    color: string;
}
export declare class PieChartData {
    title: string;
    segments: PieChartSegment[];
    otherTotal: number;
}
export declare class LineChartDataset {
    label: string;
    data: number[];
    color: string;
}
export declare class LineChartData {
    title: string;
    labels: string[];
    datasets: LineChartDataset[];
}
export declare class VendorAnalyticsResponse {
    vendorId: string;
    vendorName: string;
    kpis: VendorKPIs;
    pieChart: PieChartData;
    lineChart: LineChartData;
}
export declare class OverallAnalyticsResponse {
    kpis: OverallKPIs;
    pieChart: PieChartData;
    lineChart: LineChartData;
}
