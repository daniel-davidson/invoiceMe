import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';
import 'package:frontend/features/analytics/presentation/providers/overall_analytics_provider.dart';
import 'package:frontend/features/invoices/presentation/providers/invoices_provider.dart';

final settingsProvider =
    StateNotifierProvider<SettingsNotifier, AsyncValue<void>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return SettingsNotifier(apiClient, ref);
});

class SettingsNotifier extends StateNotifier<AsyncValue<void>> {
  final ApiClient _apiClient;
  final Ref _ref;

  SettingsNotifier(this._apiClient, this._ref) : super(const AsyncValue.data(null));

  Future<void> updateName(String name) async {
    state = const AsyncValue.loading();
    try {
      await _apiClient.patch('/users/me', data: {'fullName': name});
      // Invalidate auth state to trigger a re-fetch of user data
      _ref.invalidate(authStateProvider);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> updateCurrency(String currencyCode) async {
    state = const AsyncValue.loading();
    try {
      await _apiClient.patch('/users/me', data: {'systemCurrency': currencyCode});
      // Invalidate to refresh displays with new currency
      _ref.invalidate(authStateProvider);
      _ref.invalidate(overallAnalyticsProvider);
      _ref.invalidate(invoicesProvider);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}
