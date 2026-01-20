/// API Constants - Runtime Configuration
///
/// The frontend fetches Supabase config from the backend at runtime.
/// This eliminates the need to store secrets in the frontend.
library;

class ApiConstants {
  // ============================================
  // BACKEND API - THE ONLY CONFIG NEEDED
  // ============================================

  /// Base URL for the NestJS backend
  ///
  /// Development: http://localhost:3000
  /// Production: Set via environment or build arg
  ///
  /// For Flutter Web, this can be:
  /// - Same origin (if backend serves frontend)
  /// - Cross-origin with proper CORS
  ///
  /// For Mobile:
  /// - Android Emulator: http://10.0.2.2:3000
  /// - iOS Simulator: http://localhost:3000
  /// - Physical device: Use your machine's IP or production URL
  static String get baseUrl {
    // In production, this would come from:
    // - Compile-time: --dart-define=API_URL=https://api.example.com
    // - Or detect from current URL for web
    const envUrl = String.fromEnvironment('API_URL');
    if (envUrl.isNotEmpty) {
      return envUrl;
    }

    // Default for development
    return 'http://localhost:3000';
  }

  // ============================================
  // ENDPOINTS
  // ============================================

  /// Config endpoint - fetches Supabase config from backend
  static const String configEndpoint = '/api/config';

  /// Auth endpoints (handled by backend, not direct Supabase)
  static const String loginEndpoint = '/auth/login';
  static const String signupEndpoint = '/auth/signup';
  static const String logoutEndpoint = '/auth/logout';
  static const String refreshEndpoint = '/auth/refresh';

  /// User endpoints
  static const String userMeEndpoint = '/users/me';
  static const String userSettingsEndpoint = '/users/settings';

  /// Vendor endpoints
  static const String vendorsEndpoint = '/vendors';

  /// Invoice endpoints
  static const String invoicesEndpoint = '/invoices';
  static const String uploadEndpoint = '/invoices/upload';

  /// Analytics endpoints
  static const String overallAnalyticsEndpoint = '/analytics/overall';
  static String vendorAnalyticsEndpoint(String vendorId) =>
      '/analytics/vendor/$vendorId';

  /// Insights endpoints
  static const String insightsEndpoint = '/insights';
  static const String generateInsightsEndpoint = '/insights/generate';

  /// Export endpoints
  static const String exportInvoicesEndpoint = '/export/invoices';
  static const String exportAnalyticsEndpoint = '/export/analytics';

  // ============================================
  // TIMEOUTS
  // ============================================

  static const int connectTimeout = 30000; // 30 seconds
  static const int receiveTimeout = 60000; // 60 seconds (default for regular requests)
  static const int uploadTimeout = 300000; // 5 minutes (for file upload + OCR + LLM processing)
  static const int uploadReceiveTimeout = 300000; // 5 minutes (waiting for backend OCR/LLM)

  // ============================================
  // LOCAL STORAGE KEYS
  // ============================================

  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userDataKey = 'user_data';
  static const String themeModeKey = 'theme_mode';
  static const String systemCurrencyKey = 'system_currency';
  static const String appConfigKey = 'app_config';

  // ============================================
  // VALIDATION
  // ============================================

  static const int minPasswordLength = 6;
  static const int maxFileSizeBytes = 10 * 1024 * 1024; // 10MB

  static const List<String> allowedFileExtensions = [
    'pdf',
    'jpg',
    'jpeg',
    'png'
  ];

  static const List<String> allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];
}
