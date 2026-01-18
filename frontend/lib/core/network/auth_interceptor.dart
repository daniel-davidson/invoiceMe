import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:frontend/core/constants/app_constants.dart';

class AuthInterceptor extends Interceptor {
  final SharedPreferences sharedPreferences;

  AuthInterceptor({required this.sharedPreferences});

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Get token from storage
    final token = sharedPreferences.getString(AppConstants.storageKeyToken);

    // Add Authorization header if token exists
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Handle 401 Unauthorized - token expired or invalid
    if (err.response?.statusCode == 401) {
      // Clear stored token
      sharedPreferences.remove(AppConstants.storageKeyToken);
      sharedPreferences.remove(AppConstants.storageKeyUserId);
      sharedPreferences.remove(AppConstants.storageKeyUserEmail);

      // Note: Navigation to login should be handled by the app layer
      // This interceptor just cleans up the storage
    }

    handler.next(err);
  }
}
