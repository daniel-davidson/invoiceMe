import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';
import 'package:frontend/features/vendors/presentation/providers/vendor_analytics_provider.dart';
import 'package:frontend/core/utils/export_utils.dart';
import 'package:frontend/features/invoices/presentation/providers/invoices_provider.dart';

class OverallKpis {
  final double totalSpend;
  final double totalLimits;
  final double remainingBalance;
  final int vendorCount;
  final int invoiceCount;

  OverallKpis({
    required this.totalSpend,
    required this.totalLimits,
    required this.remainingBalance,
    required this.vendorCount,
    required this.invoiceCount,
  });

  factory OverallKpis.fromJson(Map<String, dynamic> json) {
    return OverallKpis(
      totalSpend: _parseDouble(json['totalSpend']),
      totalLimits: _parseDouble(json['totalLimits']),
      remainingBalance: _parseDouble(json['remainingBalance']),
      vendorCount: json['vendorCount'] as int,
      invoiceCount: json['invoiceCount'] as int,
    );
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }
}

class PieChartSegment {
  final String label;
  final double value;
  final double percentage;
  final String color;

  PieChartSegment({
    required this.label,
    required this.value,
    required this.percentage,
    required this.color,
  });

  factory PieChartSegment.fromJson(Map<String, dynamic> json) {
    return PieChartSegment(
      label: json['label'] as String,
      value: _parseDoubleStatic(json['value']),
      percentage: _parseDoubleStatic(json['percentage']),
      color: json['color'] as String,
    );
  }

  static double _parseDoubleStatic(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }
}

class PieChartModel {
  final String title;
  final List<PieChartSegment> segments;

  PieChartModel({
    required this.title,
    required this.segments,
  });

  factory PieChartModel.fromJson(Map<String, dynamic> json) {
    return PieChartModel(
      title: json['title'] as String,
      segments: (json['segments'] as List<dynamic>)
          .map((e) => PieChartSegment.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class OverallAnalytics {
  final OverallKpis kpis;
  final PieChartModel pieChart;
  final LineChartModel lineChart;

  OverallAnalytics({
    required this.kpis,
    required this.pieChart,
    required this.lineChart,
  });

  factory OverallAnalytics.fromJson(Map<String, dynamic> json) {
    return OverallAnalytics(
      kpis: OverallKpis.fromJson(json['kpis'] as Map<String, dynamic>),
      pieChart: PieChartModel.fromJson(json['pieChart'] as Map<String, dynamic>),
      lineChart: LineChartModel.fromJson(json['lineChart'] as Map<String, dynamic>),
    );
  }
}

final overallAnalyticsProvider = StateNotifierProvider<OverallAnalyticsNotifier,
    AsyncValue<OverallAnalytics?>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return OverallAnalyticsNotifier(apiClient);
});

class OverallAnalyticsNotifier
    extends StateNotifier<AsyncValue<OverallAnalytics?>> {
  final ApiClient _apiClient;

  OverallAnalyticsNotifier(this._apiClient) : super(const AsyncValue.loading()) {
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    try {
      final response = await _apiClient.get('/analytics/overall');
      final analytics =
          OverallAnalytics.fromJson(response.data as Map<String, dynamic>);
      state = AsyncValue.data(analytics);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<String> exportCsv() async {
    try {
      // Fetch all invoices
      final response = await _apiClient.get('/invoices');
      final data = response.data['data'] as List<dynamic>;
      final invoices = data
          .map((json) => Invoice.fromJson(json as Map<String, dynamic>))
          .toList();
      
      if (invoices.isEmpty) {
        return 'No invoices to export';
      }
      
      // Generate and download CSV
      final csvContent = ExportUtils.generateInvoicesCsv(invoices);
      final filename = ExportUtils.generateFilename('all_invoices');
      ExportUtils.downloadCsv(csvContent, filename);
      
      return 'CSV exported successfully';
    } catch (e) {
      return 'Export failed: ${e.toString()}';
    }
  }
}
