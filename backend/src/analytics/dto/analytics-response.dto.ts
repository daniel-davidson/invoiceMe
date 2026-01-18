export class VendorKPIs {
  currentMonthSpend: number;
  monthlyLimit: number | null;
  monthlyAverage: number;
  yearlyAverage: number;
  limitUtilization: number | null;
}

export class OverallKPIs {
  totalSpend: number;
  totalLimits: number;
  remainingBalance: number;
  vendorCount: number;
  invoiceCount: number;
}

export class PieChartSegment {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export class PieChartData {
  title: string;
  segments: PieChartSegment[];
  otherTotal: number;
}

export class LineChartDataset {
  label: string;
  data: number[];
  color: string;
}

export class LineChartData {
  title: string;
  labels: string[];
  datasets: LineChartDataset[];
}

export class VendorAnalyticsResponse {
  vendorId: string;
  vendorName: string;
  kpis: VendorKPIs;
  pieChart: PieChartData;
  lineChart: LineChartData;
}

export class OverallAnalyticsResponse {
  kpis: OverallKPIs;
  pieChart: PieChartData;
  lineChart: LineChartData;
}
