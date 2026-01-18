import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';

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
      // Refresh auth state
      await _ref.read(authStateProvider.notifier).signIn(
            email: '', // Would need to re-fetch
            password: '',
          );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> updateCurrency(String currencyCode) async {
    state = const AsyncValue.loading();
    try {
      await _apiClient.patch('/users/me', data: {'systemCurrency': currencyCode});
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}
