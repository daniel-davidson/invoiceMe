import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Global session manager that handles unauthorized responses
/// and triggers logout with appropriate messaging
class SessionManager {
  final Ref _ref;
  final GlobalKey<NavigatorState> _navigatorKey;
  
  // Track if we've already shown the session expired message
  bool _hasShownExpiredMessage = false;

  SessionManager({
    required Ref ref,
    required GlobalKey<NavigatorState> navigatorKey,
  })  : _ref = ref,
        _navigatorKey = navigatorKey;

  /// Call this when API returns 401 or 403
  Future<void> handleSessionExpired({String? message}) async {
    // ignore: avoid_print
    print('[SessionManager] handleSessionExpired called');
    
    // Prevent multiple simultaneous session expired handlers
    if (_hasShownExpiredMessage) {
      // ignore: avoid_print
      print('[SessionManager] Already shown message, skipping');
      return;
    }
    _hasShownExpiredMessage = true;

    final context = _navigatorKey.currentContext;
    if (context == null) {
      // ignore: avoid_print
      print('[SessionManager] WARNING: No navigator context available');
      _hasShownExpiredMessage = false;
      return;
    }

    // ignore: avoid_print
    print('[SessionManager] Forcing logout...');
    
    // Import auth provider dynamically to avoid circular dependencies
    final authProvider = _ref.read(sessionManagerAuthProvider);
    
    // Force logout (this will clear storage and trigger navigation via router)
    await authProvider.forceLogout();
    
    // ignore: avoid_print
    print('[SessionManager] Logout complete');

    // Show session expired message
    if (context.mounted) {
      // Use SnackBar for the notification
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            message ?? 'Your session has expired. Please log in again.',
          ),
          backgroundColor: Colors.orange.shade700,
          duration: const Duration(seconds: 5),
          behavior: SnackBarBehavior.floating,
          action: SnackBarAction(
            label: 'Dismiss',
            textColor: Colors.white,
            onPressed: () {
              ScaffoldMessenger.of(context).hideCurrentSnackBar();
            },
          ),
        ),
      );
    }

    // Reset flag after a delay to allow future session expiry notifications
    Future.delayed(const Duration(seconds: 2), () {
      _hasShownExpiredMessage = false;
    });
  }

  /// Reset the session state (useful for testing or manual logout)
  void reset() {
    _hasShownExpiredMessage = false;
  }
}

/// Provider for session manager - will be set up in main.dart
final sessionManagerProvider = Provider<SessionManager>((ref) {
  throw UnimplementedError('SessionManager must be overridden with navigatorKey');
});

/// Auth provider reference for session manager (to avoid circular dependency)
/// This will be implemented in auth_provider.dart
final sessionManagerAuthProvider = Provider<SessionManagerAuth>((ref) {
  throw UnimplementedError('Must be overridden in auth_provider.dart');
});

/// Interface for auth operations needed by session manager
abstract class SessionManagerAuth {
  Future<void> forceLogout();
}
