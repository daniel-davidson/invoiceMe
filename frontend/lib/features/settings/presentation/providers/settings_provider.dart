import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';
import 'package:frontend/features/auth/data/models/user_model.dart';
import 'package:frontend/features/analytics/presentation/providers/overall_analytics_provider.dart';
import 'package:frontend/features/invoices/presentation/providers/invoices_provider.dart';
import 'package:frontend/features/home/presentation/providers/home_provider.dart';

final settingsProvider =
    StateNotifierProvider<SettingsNotifier, AsyncValue<void>>((ref) {
      final apiClient = ref.watch(apiClientProvider);
      final authLocalDataSource = ref.watch(authLocalDataSourceProvider);
      return SettingsNotifier(apiClient, authLocalDataSource, ref);
    });

class SettingsNotifier extends StateNotifier<AsyncValue<void>> {
  final ApiClient _apiClient;
  final dynamic _authLocalDataSource;
  final Ref _ref;

  SettingsNotifier(this._apiClient, this._authLocalDataSource, this._ref)
    : super(const AsyncValue.data(null));

  Future<void> updateName(String name) async {
    state = const AsyncValue.loading();
    try {
      await _apiClient.patch('/users/me', data: {'fullName': name});

      // Fetch and cache updated user data
      await _refreshUserData();

      // Invalidate auth state to trigger UI refresh
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
      await _apiClient.patch(
        '/users/me',
        data: {'systemCurrency': currencyCode},
      );

      // Fetch and cache updated user data
      await _refreshUserData();

      // Invalidate to refresh displays with new currency
      _ref.invalidate(authStateProvider);
      _ref.invalidate(overallAnalyticsProvider);
      _ref.invalidate(invoicesProvider);
      _ref.invalidate(vendorsProvider);
      // Note: vendorAnalyticsProvider and invoiceDetailProvider are family providers
      // They will be invalidated when their parent screens rebuild due to authStateProvider change
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> _refreshUserData() async {
    // Fetch fresh user data from server and update cache
    final response = await _apiClient.get('/users/me');
    final updatedUser = UserModel.fromJson(
      response.data as Map<String, dynamic>,
    );
    await _authLocalDataSource.cacheUser(updatedUser);
  }
}
