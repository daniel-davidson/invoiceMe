/**
 * DTOs for Analytics API Responses
 * All numeric fields are strictly typed as number for type safety
 */

export class KpisDto {
  currentMonthSpend: number;
  monthlyLimit: number | null;
  monthlyAverage: number;
  yearlyAverage: number;
  limitUtilization: number | null;
}

export class ChartDatasetDto {
  label: string;
  data: number[];
  color: string;
}

export class LineChartDto {
  title: string;
  labels: string[];
  datasets: ChartDatasetDto[];
}

export class PieChartSegmentDto {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export class PieChartDto {
  title: string;
  segments: PieChartSegmentDto[];
  otherTotal: number;
}

export class SelectedPeriodDto {
  year: number;
  month: number; // 1-12
}

export class VendorAnalyticsDto {
  vendorId: string;
  vendorName: string;
  selectedPeriod: SelectedPeriodDto;
  kpis: KpisDto;
  pieChart: PieChartDto;
  lineChart: LineChartDto;
}

export class OverallKpisDto {
  totalSpend: number;
  totalLimits: number;
  remainingBalance: number;
  vendorCount: number;
  invoiceCount: number;
}

export class OverallAnalyticsDto {
  kpis: OverallKpisDto;
  pieChart: PieChartDto;
  lineChart: LineChartDto;
}
