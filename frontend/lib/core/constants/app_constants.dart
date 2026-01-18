class AppConstants {
  // App Info
  static const String appName = 'InvoiceMe';
  static const String appVersion = '1.0.0';

  // Defaults
  static const String defaultCurrency = 'USD';
  static const String defaultLocale = 'en_US';

  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  // File Upload
  static const int maxFileSizeMB = 10;
  static const int maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
  static const List<String> allowedImageExtensions = ['jpg', 'jpeg', 'png'];
  static const List<String> allowedDocumentExtensions = ['pdf'];

  // Storage Keys
  static const String storageKeyToken = 'auth_token';
  static const String storageKeyUserId = 'user_id';
  static const String storageKeyUserEmail = 'user_email';

  // UI
  static const double defaultPadding = 16.0;
  static const double defaultBorderRadius = 8.0;
  static const Duration defaultAnimationDuration = Duration(milliseconds: 300);
  static const Duration snackbarDuration = Duration(seconds: 3);

  // Validation
  static const int minPasswordLength = 8;
  static const int maxNameLength = 100;
  static const int maxVendorNameLength = 100;

  // Chart
  static const int maxPieChartItems = 5;
  static const int monthsInLineChart = 12;
}
