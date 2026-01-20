import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:frontend/main.dart' show navigatorKeyProvider;
import 'package:frontend/features/auth/presentation/screens/welcome_screen.dart';
import 'package:frontend/features/auth/presentation/screens/login_screen.dart';
import 'package:frontend/features/auth/presentation/screens/signup_screen.dart';
import 'package:frontend/features/home/presentation/screens/home_screen.dart';
import 'package:frontend/features/invoices/presentation/screens/invoices_list_screen.dart';
import 'package:frontend/features/invoices/presentation/screens/invoice_detail_screen.dart';
import 'package:frontend/features/invoices/presentation/screens/edit_invoice_screen.dart';
import 'package:frontend/features/vendors/presentation/screens/vendor_analytics_screen.dart';
import 'package:frontend/features/analytics/presentation/screens/overall_analytics_screen.dart';
import 'package:frontend/features/settings/presentation/screens/settings_screen.dart';
import 'package:frontend/features/insights/presentation/screens/insights_screen.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';

/// Notifier that triggers router refresh when auth state changes
class AuthChangeNotifier extends ChangeNotifier {
  AuthChangeNotifier(Ref ref) {
    ref.listen(authStateProvider, (previous, next) {
      // Only notify when we transition between logged in/out states
      final wasLoggedIn =
          previous?.maybeWhen(
            data: (user) => user != null,
            orElse: () => false,
          ) ??
          false;

      final isLoggedIn = next.maybeWhen(
        data: (user) => user != null,
        orElse: () => false,
      );

      final wasLoading = previous?.isLoading ?? true;
      final isLoading = next.isLoading;

      // Notify on: loading->data, data change (login/logout)
      if (wasLoading != isLoading || wasLoggedIn != isLoggedIn) {
        notifyListeners();
      }
    });
  }
}

final authChangeNotifierProvider = Provider<AuthChangeNotifier>((ref) {
  return AuthChangeNotifier(ref);
});

final appRouterProvider = Provider<GoRouter>((ref) {
  final authChangeNotifier = ref.watch(authChangeNotifierProvider);

  // Get the navigator key from main.dart for session manager
  final navKey = ref.read(navigatorKeyProvider);

  return GoRouter(
    navigatorKey: navKey,
    initialLocation: '/',
    debugLogDiagnostics: true,
    refreshListenable: authChangeNotifier,
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);

      // While loading, don't redirect - stay on current page
      final isLoading = authState.isLoading;
      if (isLoading) {
        return null;
      }

      final isLoggedIn = authState.maybeWhen(
        data: (user) => user != null,
        orElse: () => false,
      );

      final isAuthRoute =
          state.matchedLocation == '/' ||
          state.matchedLocation == '/login' ||
          state.matchedLocation == '/signup';

      // Not logged in and trying to access protected route -> redirect to welcome
      if (!isLoggedIn && !isAuthRoute) {
        return '/';
      }

      // Logged in and on auth route -> redirect to home
      if (isLoggedIn && isAuthRoute) {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        name: 'welcome',
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/signup',
        name: 'signup',
        builder: (context, state) => const SignupScreen(),
      ),
      GoRoute(
        path: '/home',
        name: 'home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/invoices',
        name: 'invoices',
        builder: (context, state) => const InvoicesListScreen(),
      ),
      GoRoute(
        path: '/invoice/:id',
        name: 'invoice-detail',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return InvoiceDetailScreen(invoiceId: id);
        },
      ),
      GoRoute(
        path: '/invoice/:id/edit',
        name: 'invoice-edit',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return EditInvoiceScreen(invoiceId: id);
        },
      ),
      GoRoute(
        path: '/vendor/:id/analytics',
        name: 'vendor-analytics',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return VendorAnalyticsScreen(vendorId: id);
        },
      ),
      GoRoute(
        path: '/analytics',
        name: 'analytics',
        builder: (context, state) => const OverallAnalyticsScreen(),
      ),
      GoRoute(
        path: '/settings',
        name: 'settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/insights',
        name: 'insights',
        builder: (context, state) => const InsightsScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Page not found: ${state.uri.path}')),
    ),
  );
});
