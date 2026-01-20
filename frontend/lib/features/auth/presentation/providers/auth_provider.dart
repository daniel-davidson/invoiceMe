import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/core/auth/session_manager.dart';
import 'package:frontend/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:frontend/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:frontend/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:frontend/features/auth/domain/entities/user.dart';
import 'package:frontend/features/auth/domain/repositories/auth_repository.dart';

// SharedPreferences provider
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences must be overridden in main');
});

// API Client provider - now includes SharedPreferences and session expired callback
final apiClientProvider = Provider<ApiClient>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  final sessionManager = ref.watch(sessionManagerProvider);
  
  return ApiClient(
    prefs: prefs,
    onSessionExpired: () => sessionManager.handleSessionExpired(),
  );
});

// Auth datasources
final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  return AuthRemoteDataSourceImpl(ref.watch(apiClientProvider));
});

final authLocalDataSourceProvider = Provider<AuthLocalDataSource>((ref) {
  return AuthLocalDataSourceImpl(ref.watch(sharedPreferencesProvider));
});

// Auth repository
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(
    ref.watch(authRemoteDataSourceProvider),
    ref.watch(authLocalDataSourceProvider),
  );
});

// Auth state
final authStateProvider = StateNotifierProvider<AuthNotifier, AsyncValue<User?>>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});

class AuthNotifier extends StateNotifier<AsyncValue<User?>> implements SessionManagerAuth {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(const AsyncValue.loading()) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    try {
      final result = await _repository.getCurrentUser();
      result.fold(
        (failure) => state = const AsyncValue.data(null),
        (user) => state = AsyncValue.data(user),
      );
    } catch (e) {
      state = const AsyncValue.data(null);
    }
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String fullName,
    String? personalBusinessId,
    required String systemCurrency,
  }) async {
    state = const AsyncValue.loading();
    try {
      final result = await _repository.signUp(
        email: email,
        password: password,
        fullName: fullName,
        personalBusinessId: personalBusinessId,
        systemCurrency: systemCurrency,
      );
      result.fold(
        (failure) => state = AsyncValue.error(failure.message, StackTrace.current),
        (user) => state = AsyncValue.data(user),
      );
    } catch (e) {
      state = AsyncValue.error(e.toString(), StackTrace.current);
    }
  }

  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    state = const AsyncValue.loading();
    try {
      final result = await _repository.signIn(
        email: email,
        password: password,
      );
      result.fold(
        (failure) => state = AsyncValue.error(failure.message, StackTrace.current),
        (user) => state = AsyncValue.data(user),
      );
    } catch (e) {
      state = AsyncValue.error(e.toString(), StackTrace.current);
    }
  }

  Future<void> signOut() async {
    state = const AsyncValue.loading();
    try {
      await _repository.signOut();
      state = const AsyncValue.data(null);
      // Clear all cached data providers on logout
      _invalidateAllProviders();
    } catch (e) {
      // Still set to null even if signout fails
      state = const AsyncValue.data(null);
      _invalidateAllProviders();
    }
  }

  /// Force logout without showing loading state (called by session manager on 401/403)
  @override
  Future<void> forceLogout() async {
    try {
      await _repository.signOut();
    } catch (e) {
      // Ignore errors during force logout
    }
    // Immediately set to null - router will redirect to login
    state = const AsyncValue.data(null);
    // Clear all cached data providers
    _invalidateAllProviders();
  }

  /// Invalidate all data providers to clear cached data on logout
  void _invalidateAllProviders() {
    // This will be implemented to clear all providers that cache user data
    // For now, we'll rely on the providers to check auth state
  }
}

