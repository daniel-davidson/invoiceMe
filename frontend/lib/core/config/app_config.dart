import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:frontend/core/constants/api_constants.dart';
import 'package:http/http.dart' as http;

/// Runtime application configuration fetched from backend
class AppConfig {
  final String supabaseUrl;
  final String supabaseAnonKey;
  final bool aiInsightsEnabled;
  final bool currencyConversionEnabled;
  final bool exportCsvEnabled;
  final double maxFileSizeMb;
  final List<String> allowedMimeTypes;

  AppConfig({
    required this.supabaseUrl,
    required this.supabaseAnonKey,
    this.aiInsightsEnabled = true,
    this.currencyConversionEnabled = true,
    this.exportCsvEnabled = true,
    this.maxFileSizeMb = 10.0,
    this.allowedMimeTypes = const [
      'application/pdf',
      'image/jpeg',
      'image/png'
    ],
  });

  factory AppConfig.fromJson(Map<String, dynamic> json) {
    final features = json['features'] as Map<String, dynamic>? ?? {};
    final upload = json['upload'] as Map<String, dynamic>? ?? {};

    return AppConfig(
      supabaseUrl: json['supabaseUrl'] as String? ?? '',
      supabaseAnonKey: json['supabaseAnonKey'] as String? ?? '',
      aiInsightsEnabled: features['aiInsights'] as bool? ?? true,
      currencyConversionEnabled: features['currencyConversion'] as bool? ?? true,
      exportCsvEnabled: features['exportCsv'] as bool? ?? true,
      maxFileSizeMb: (upload['maxFileSizeMb'] as num?)?.toDouble() ?? 10.0,
      allowedMimeTypes: (upload['allowedTypes'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          ['application/pdf', 'image/jpeg', 'image/png'],
    );
  }

  Map<String, dynamic> toJson() => {
        'supabaseUrl': supabaseUrl,
        'supabaseAnonKey': supabaseAnonKey,
        'features': {
          'aiInsights': aiInsightsEnabled,
          'currencyConversion': currencyConversionEnabled,
          'exportCsv': exportCsvEnabled,
        },
        'upload': {
          'maxFileSizeMb': maxFileSizeMb,
          'allowedTypes': allowedMimeTypes,
        },
      };

  /// Default config for when backend is unreachable
  factory AppConfig.defaults() {
    return AppConfig(
      supabaseUrl: '',
      supabaseAnonKey: '',
    );
  }
}

/// Service to fetch and cache app configuration
class AppConfigService {
  static AppConfig? _cachedConfig;
  static const String _cacheKey = 'app_config_cache';

  /// Fetch config from backend, with caching
  static Future<AppConfig> fetchConfig() async {
    // Return cached if available
    if (_cachedConfig != null) {
      return _cachedConfig!;
    }

    // Try to load from local storage first (for offline support)
    final prefs = await SharedPreferences.getInstance();
    final cachedJson = prefs.getString(_cacheKey);
    if (cachedJson != null) {
      try {
        _cachedConfig = AppConfig.fromJson(jsonDecode(cachedJson));
      } catch (_) {
        // Ignore parse errors, will fetch fresh
      }
    }

    // Fetch fresh config from backend
    try {
      final url = '${ApiConstants.baseUrl}${ApiConstants.configEndpoint}';
      final response = await http.get(
        Uri.parse(url),
        headers: {'Accept': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        _cachedConfig = AppConfig.fromJson(json);

        // Cache to local storage
        await prefs.setString(_cacheKey, jsonEncode(_cachedConfig!.toJson()));
      }
    } catch (e) {
      // Use cached or defaults if fetch fails
      if (_cachedConfig == null) {
        _cachedConfig = AppConfig.defaults();
      }
    }

    return _cachedConfig!;
  }

  /// Clear cached config
  static Future<void> clearCache() async {
    _cachedConfig = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_cacheKey);
  }

  /// Get current cached config (synchronous, may be null)
  static AppConfig? get currentConfig => _cachedConfig;
}
