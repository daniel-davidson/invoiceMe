import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';

class VendorKpis {
  final double currentMonthSpend;
  final double? monthlyLimit;
  final double monthlyAverage;
  final double yearlyAverage;
  final double? limitUtilization;

  VendorKpis({
    required this.currentMonthSpend,
    this.monthlyLimit,
    required this.monthlyAverage,
    required this.yearlyAverage,
    this.limitUtilization,
  });

  factory VendorKpis.fromJson(Map<String, dynamic> json) {
    return VendorKpis(
      currentMonthSpend: _parseDouble(json['currentMonthSpend']),
      monthlyLimit: json['monthlyLimit'] != null
          ? _parseDouble(json['monthlyLimit'])
          : null,
      monthlyAverage: _parseDouble(json['monthlyAverage']),
      yearlyAverage: _parseDouble(json['yearlyAverage']),
      limitUtilization: json['limitUtilization'] != null
          ? _parseDouble(json['limitUtilization'])
          : null,
    );
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.parse(value);
    return 0.0;
  }
}

class ChartDataset {
  final String label;
  final List<double> data;
  final String color;

  ChartDataset({
    required this.label,
    required this.data,
    required this.color,
  });

  factory ChartDataset.fromJson(Map<String, dynamic> json) {
    return ChartDataset(
      label: json['label'] as String,
      data: (json['data'] as List<dynamic>)
          .map((e) {
            if (e is num) return e.toDouble();
            if (e is String) return double.parse(e);
            return 0.0;
          })
          .toList(),
      color: json['color'] as String,
    );
  }
}

class LineChartModel {
  final String title;
  final List<String> labels;
  final List<ChartDataset> datasets;

  LineChartModel({
    required this.title,
    required this.labels,
    required this.datasets,
  });

  factory LineChartModel.fromJson(Map<String, dynamic> json) {
    return LineChartModel(
      title: json['title'] as String,
      labels: (json['labels'] as List<dynamic>).cast<String>(),
      datasets: (json['datasets'] as List<dynamic>)
          .map((e) => ChartDataset.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class VendorAnalytics {
  final String vendorId;
  final String vendorName;
  final VendorKpis kpis;
  final LineChartModel lineChart;

  VendorAnalytics({
    required this.vendorId,
    required this.vendorName,
    required this.kpis,
    required this.lineChart,
  });

  factory VendorAnalytics.fromJson(Map<String, dynamic> json) {
    return VendorAnalytics(
      vendorId: json['vendorId'] as String,
      vendorName: json['vendorName'] as String,
      kpis: VendorKpis.fromJson(json['kpis'] as Map<String, dynamic>),
      lineChart: LineChartModel.fromJson(json['lineChart'] as Map<String, dynamic>),
    );
  }
}

final vendorAnalyticsProvider = StateNotifierProvider.family<
    VendorAnalyticsNotifier, AsyncValue<VendorAnalytics?>, String>((ref, id) {
  final apiClient = ref.watch(apiClientProvider);
  return VendorAnalyticsNotifier(apiClient, id);
});

class VendorAnalyticsNotifier
    extends StateNotifier<AsyncValue<VendorAnalytics?>> {
  final ApiClient _apiClient;
  final String _vendorId;

  VendorAnalyticsNotifier(this._apiClient, this._vendorId)
      : super(const AsyncValue.loading()) {
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    try {
      final response = await _apiClient.get('/analytics/vendor/$_vendorId');
      final analytics =
          VendorAnalytics.fromJson(response.data as Map<String, dynamic>);
      state = AsyncValue.data(analytics);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> updateLimit(double? limit) async {
    try {
      await _apiClient.patch('/analytics/vendor/$_vendorId/limit', data: {
        'monthlyLimit': limit,
      });
      await load();
    } catch (e) {
      // Handle error
    }
  }

  Future<void> exportCsv() async {
    try {
      await _apiClient.download('/export/analytics?vendorId=$_vendorId');
    } catch (e) {
      // Handle error
    }
  }
}
