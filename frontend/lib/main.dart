import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:frontend/core/routing/app_router.dart';
import 'package:frontend/core/theme/app_theme.dart';
import 'package:frontend/core/config/app_config.dart';
import 'package:frontend/core/auth/session_manager.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';

// Global navigator key for session manager  
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

// Navigator key provider
final navigatorKeyProvider = Provider<GlobalKey<NavigatorState>>((ref) {
  return navigatorKey;
});

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize dependencies in parallel
  final results = await Future.wait([
    SharedPreferences.getInstance(),
    AppConfigService.fetchConfig(),
  ]);
  
  final sharedPreferences = results[0] as SharedPreferences;
  // App config is now cached in AppConfigService.currentConfig
  
  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(sharedPreferences),
        navigatorKeyProvider.overrideWithValue(navigatorKey),
        // Override sessionManagerProvider with the implementation that has navigator key
        sessionManagerProvider.overrideWith((ref) {
          final navKey = ref.watch(navigatorKeyProvider);
          return SessionManager(ref: ref, navigatorKey: navKey);
        }),
        // Override sessionManagerAuthProvider with the actual auth notifier
        sessionManagerAuthProvider.overrideWith((ref) => ref.read(authStateProvider.notifier)),
      ],
      child: const InvoiceMeApp(),
    ),
  );
}

class InvoiceMeApp extends ConsumerWidget {
  const InvoiceMeApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'InvoiceMe',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
