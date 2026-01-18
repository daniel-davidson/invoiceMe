import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/core/network/auth_interceptor.dart';

/// SharedPreferences provider
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences must be overridden');
});

/// Dio provider with auth interceptor
final dioProvider = Provider<Dio>((ref) {
  final sharedPreferences = ref.watch(sharedPreferencesProvider);
  final dio = Dio();

  // Add auth interceptor
  dio.interceptors.add(AuthInterceptor(sharedPreferences: sharedPreferences));

  return dio;
});

/// API Client provider
final apiClientProvider = Provider<ApiClient>((ref) {
  final dio = ref.watch(dioProvider);
  return ApiClient(dio: dio);
});
