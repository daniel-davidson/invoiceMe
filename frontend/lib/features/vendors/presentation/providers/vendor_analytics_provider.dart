import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/core/constants/api_constants.dart';
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

class SelectedPeriod {
  final int year;
  final int month; // 1-12

  SelectedPeriod({required this.year, required this.month});

  factory SelectedPeriod.fromJson(Map<String, dynamic> json) {
    return SelectedPeriod(
      year: json['year'] as int,
      month: json['month'] as int,
    );
  }

  String get label {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[month - 1]} $year';
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SelectedPeriod &&
          runtimeType == other.runtimeType &&
          year == other.year &&
          month == other.month;

  @override
  int get hashCode => year.hashCode ^ month.hashCode;
}

class VendorAnalytics {
  final String vendorId;
  final String vendorName;
  final SelectedPeriod selectedPeriod;
  final VendorKpis kpis;
  final LineChartModel lineChart;

  VendorAnalytics({
    required this.vendorId,
    required this.vendorName,
    required this.selectedPeriod,
    required this.kpis,
    required this.lineChart,
  });

  factory VendorAnalytics.fromJson(Map<String, dynamic> json) {
    return VendorAnalytics(
      vendorId: json['vendorId'] as String,
      vendorName: json['vendorName'] as String,
      selectedPeriod: SelectedPeriod.fromJson(json['selectedPeriod'] as Map<String, dynamic>),
      kpis: VendorKpis.fromJson(json['kpis'] as Map<String, dynamic>),
      lineChart: LineChartModel.fromJson(json['lineChart'] as Map<String, dynamic>),
    );
  }
}

class AvailablePeriods {
  final List<SelectedPeriod> periods;
  final SelectedPeriod? latestPeriod;

  AvailablePeriods({required this.periods, this.latestPeriod});

  factory AvailablePeriods.fromJson(Map<String, dynamic> json) {
    return AvailablePeriods(
      periods: (json['periods'] as List<dynamic>)
          .map((e) => SelectedPeriod.fromJson(e as Map<String, dynamic>))
          .toList(),
      latestPeriod: json['latestPeriod'] != null
          ? SelectedPeriod.fromJson(json['latestPeriod'] as Map<String, dynamic>)
          : null,
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
  AvailablePeriods? _availablePeriods;

  VendorAnalyticsNotifier(this._apiClient, this._vendorId)
      : super(const AsyncValue.loading()) {
    _initialize();
  }

  AvailablePeriods? get availablePeriods => _availablePeriods;

  Future<void> _initialize() async {
    // First load available periods
    try {
      final periodsResponse = await _apiClient.get(
        '/analytics/vendor/$_vendorId/available-periods',
        options: Options(
          receiveTimeout: Duration(milliseconds: ApiConstants.analyticsTimeout),
        ),
      );
      _availablePeriods = AvailablePeriods.fromJson(periodsResponse.data as Map<String, dynamic>);
      
      // Auto-load analytics for latest period with data
      if (_availablePeriods?.latestPeriod != null) {
        await loadForPeriod(_availablePeriods!.latestPeriod!);
      } else {
        // No data available, load current month anyway
        await load();
      }
    } catch (e, st) {
      // If periods fetch fails, propagate error instead of falling back
      // This helps identify issues with vendor ID or permissions
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    try {
      final response = await _apiClient.get(
        '/analytics/vendor/$_vendorId',
        options: Options(
          receiveTimeout: Duration(milliseconds: ApiConstants.analyticsTimeout),
        ),
      );
      final analytics =
          VendorAnalytics.fromJson(response.data as Map<String, dynamic>);
      state = AsyncValue.data(analytics);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> loadForPeriod(SelectedPeriod period) async {
    state = const AsyncValue.loading();
    try {
      final response = await _apiClient.get(
        '/analytics/vendor/$_vendorId',
        queryParameters: {
          'year': period.year,
          'month': period.month,
        },
        options: Options(
          receiveTimeout: Duration(milliseconds: ApiConstants.analyticsTimeout),
        ),
      );
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
      
      // Reload with current period if available
      final currentAnalytics = state.value;
      if (currentAnalytics != null) {
        await loadForPeriod(currentAnalytics.selectedPeriod);
      } else {
        await load();
      }
    } catch (e) {
      // Handle error
    }
  }

  Future<String> exportCsv() async {
    // T072-ALT: Export feature deferred to future release
    return 'Export feature coming soon';
  }
}
