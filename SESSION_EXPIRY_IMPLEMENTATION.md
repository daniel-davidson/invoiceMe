# Session Expiry Auto-Logout Implementation (v2.0)

## Problem
User reported: **"I'm getting unauthorized errors and still I'm not logged out"**

When the backend API returns 401 (Unauthorized) or 403 (Forbidden), the app was not automatically logging the user out and showing a notification.

---

## Solution Overview

Implemented a global session expiry handler that:
1. ✅ Detects 401/403 responses from ANY API call
2. ✅ Automatically logs user out
3. ✅ Shows notification: "Your session has expired. Please log in again."
4. ✅ Redirects to login screen via existing GoRouter logic

---

## Implementation Details

### 1. **SessionManager** (`frontend/lib/core/auth/session_manager.dart`)

**Purpose**: Global handler for session expiry across the entire app.

**Key Features**:
- Accepts a `Ref` to access providers
- Uses `GlobalKey<NavigatorState>` to show SnackBar from anywhere
- Prevents duplicate notifications with `_hasShownExpiredMessage` flag
- Shows orange SnackBar with 5-second duration
- Calls `AuthNotifier.forceLogout()` to clear auth state

**How it works**:
```dart
Future<void> handleSessionExpired({String? message}) async {
  // 1. Prevent duplicates
  // 2. Force logout via AuthNotifier
  // 3. Show SnackBar notification
  // 4. Reset flag after delay
}
```

---

### 2. **ApiClient Updates** (`frontend/lib/core/network/api_client.dart`)

**Added**:
- `SessionExpiredCallback` typedef
- `_onSessionExpired` callback field
- `setSessionExpiredCallback()` method

**Interceptor** (lines 42-58):
```dart
onError: (error, handler) async {
  if (error.response?.statusCode == 401 || error.response?.statusCode == 403) {
    if (_onSessionExpired != null) {
      await _onSessionExpired!();
    }
  }
  handler.next(error);
}
```

**Why both interceptor AND _handleResponse?**
- Interceptor: Catches DioException errors
- _handleResponse: Catches successful HTTP responses with 401/403 status

---

### 3. **AuthNotifier Updates** (`frontend/lib/features/auth/presentation/providers/auth_provider.dart`)

**Added**:
- `implements SessionManagerAuth` interface
- `forceLogout()` method for immediate logout without loading state

**Key difference from `signOut()`**:
```dart
// signOut() - user initiated, shows loading
Future<void> signOut() async {
  state = const AsyncValue.loading(); // Shows loading UI
  await _repository.signOut();
  state = const AsyncValue.data(null);
}

// forceLogout() - system initiated, instant
Future<void> forceLogout() async {
  await _repository.signOut(); // Clean up tokens
  state = const AsyncValue.data(null); // Immediate state update
}
```

---

### 4. **Main.dart Wiring** (`frontend/lib/main.dart`)

**Added**:
- `navigatorKey` global variable
- `navigatorKeyProvider` for DI
- `sessionManagerProviderOverride` with proper wiring

**Provider Overrides**:
```dart
ProviderScope(
  overrides: [
    navigatorKeyProvider.overrideWithValue(navigatorKey),
    sessionManagerProvider.overrideWith(...),
    sessionManagerAuthProvider.overrideWith(...),
  ],
  child: const InvoiceMeApp(),
)
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│ User makes API call (e.g., GET /invoices)          │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ Backend returns 401 Unauthorized                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ ApiClient Interceptor detects statusCode == 401    │
│ Calls: _onSessionExpired()                         │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ SessionManager.handleSessionExpired()              │
│  1. Check if already handled (prevent duplicates)  │
│  2. Call AuthNotifier.forceLogout()                │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ AuthNotifier.forceLogout()                         │
│  1. await _repository.signOut() (clear tokens)     │
│  2. state = AsyncValue.data(null)                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ GoRouter detects auth state change                 │
│ redirect() logic: isLoggedIn = false               │
│ Navigates to: '/' (WelcomeScreen)                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ SessionManager shows SnackBar                      │
│ "Your session has expired. Please log in again."  │
│ (Orange background, 5s duration)                   │
└─────────────────────────────────────────────────────┘
```

---

## Testing Instructions

### Manual Test 1: Simulate Session Expiry
1. Login to the app
2. Navigate to any screen (Home, Invoices, etc.)
3. **Manually expire the token** (delete from backend DB or wait for expiry)
4. Make any API call (refresh page, click on vendor, etc.)
5. **Expected**:
   - ✅ Immediately redirected to Welcome/Login screen
   - ✅ Orange SnackBar appears: "Your session has expired. Please log in again."
   - ✅ No duplicate notifications

### Manual Test 2: Backend Returns 401
1. Login to the app
2. Stop backend server OR modify backend to return 401
3. Try to load invoices or any data
4. **Expected**:
   - ✅ Auto-logout
   - ✅ SnackBar notification
   - ✅ Redirect to login

### Manual Test 3: Multiple 401s (Prevent Duplicates)
1. Login to the app
2. Make multiple API calls that all return 401 simultaneously
3. **Expected**:
   - ✅ Only ONE SnackBar appears
   - ✅ Clean logout without errors

---

## Files Changed

| File | Lines Changed | Description |
|------|---------------|-------------|
| `frontend/lib/core/auth/session_manager.dart` | +88 | NEW: Global session expiry handler |
| `frontend/lib/core/network/api_client.dart` | +22 -6 | Added callback mechanism for 401/403 |
| `frontend/lib/features/auth/presentation/providers/auth_provider.dart` | +21 -2 | Added forceLogout() method |
| `frontend/lib/main.dart` | +20 -0 | Wired SessionManager with navigator key |

**Total**: 4 files changed, 151 insertions(+), 8 deletions(-)

---

## Spec Compliance

✅ **Aligns with**: `specs/002-invoiceme-mvp/FLOW_CONTRACT.md` §0 (Global Behaviors - Session Expiry & Auto-Logout)

✅ **Aligns with**: `specs/002-invoiceme-mvp/UI_STATES.md` (Session Expired Flow)

---

## Commit

```
commit cd1a938
feat(frontend): Implement session expiry auto-logout with notice (v2.0)
```

---

## Status

✅ **IMPLEMENTED AND COMMITTED**
🧪 **READY FOR TESTING**

User should now see automatic logout + notification when session expires!
