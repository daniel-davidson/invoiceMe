# Routes Map: InvoiceMe (Version 002)

**Purpose**: Navigation structure and route definitions for Flutter implementation  
**Created**: 2026-01-20  
**Based On**: FLOW_CONTRACT.md  
**Status**: Implementation Guide

---

## Document Purpose

This document translates the FLOW_CONTRACT navigation graph into:
1. Suggested Flutter route names (GoRouter format)
2. Required route parameters
3. Navigation edges with source/destination mapping
4. Forbidden routes and navigation patterns

---

## Route Definitions

### Flutter Route Structure

**Format**: `/path/to/screen`  
**Router**: GoRouter (already implemented in Version 001)

| Route Path | Screen | Parameters | Auth Required |
|------------|--------|------------|---------------|
| `/` | Welcome Screen | None | No |
| `/login` | Login Screen | None | No |
| `/signup` | Sign Up Screen | None | No |
| `/home` | Home Screen | None | Yes |
| `/settings` | Settings Screen | None | Yes |
| `/invoices` | Invoices List Screen | None | Yes |
| `/invoice/:id` | Edit Invoice Screen | `id` (UUID, required) | Yes |
| `/vendor/:id/analytics` | Single Business Analytics Screen | `id` (UUID, required) | Yes |
| `/analytics` | Businesses Analysis Screen | None | Yes |

### Modal/Dialog Routes

**Note**: These are NOT full-page routes but modals/dialogs opened programmatically.

| Component | Trigger | Parameters | Type |
|-----------|---------|------------|------|
| Add/Edit Business Dialog | Button/Icon on Home Screen | `businessId` (UUID, optional) | Centered Dialog |
| Delete Business Confirmation | Delete button in Add/Edit Business | None (inherits from parent) | Centered Dialog |
| Upload Invoice modalBottomSheet | Upload button on Home Screen | None | Bottom Sheet |
| Delete Invoice Confirmation | Delete button in Edit Invoice Screen | None (inherits from parent) | Centered Dialog |
| Edit Name Popup (Invoice) | Edit icon in Edit Invoice Screen | Current name (string) | Centered Dialog |
| Edit Amount Popup (Invoice) | Edit icon in Edit Invoice Screen | Current amount (number), currency (string) | Centered Dialog |
| Date Picker (Invoice) | Calendar icon in Edit Invoice Screen | Current date (DateTime) | Modal |
| Business List Dropdown (Invoice) | Expander in Edit Invoice Screen | Current businessId (UUID) | Dropdown |
| Edit Name Popup (User) | Edit icon in Settings Screen | Current name (string) | Centered Dialog |
| Currency Picker | Edit icon in Settings Screen | Current currency (string) | Bottom Sheet |
| Edit Limit Popup (Analytics) | Edit icon in Single Business Analytics | Current limit (number, nullable) | Centered Dialog |

---

## Route Parameters

### Required Parameters

| Route | Parameter | Type | Nullable | Description | Validation |
|-------|-----------|------|----------|-------------|------------|
| `/invoice/:id` | `id` | UUID | No | Invoice to edit | Must exist in database for current tenant |
| `/vendor/:id/analytics` | `id` | UUID | No | Business to show analytics for | Must exist in database for current tenant |

### Optional Parameters

| Route | Parameter | Type | Default | Description |
|-------|-----------|------|---------|-------------|
| Add/Edit Business Dialog | `businessId` | UUID | null | If null: create mode; if provided: edit mode |

### Query Parameters

None defined in FLOW_CONTRACT. All navigation uses path parameters or dialog props.

---

## Navigation Graph

**Format**: `Source Screen.Action → Destination`

### Authentication Flow

```
Welcome Screen
├─ Login Button → Login Screen
│  └─ Enter Button (success) → Home Screen
│  └─ Back → Welcome Screen
└─ Sign Up Button → Sign Up Screen
   └─ Enter Button (success) → Home Screen
   └─ Back → Welcome Screen
```

### Main Application Flow

```
Home Screen (Hub)
├─ Settings Icon → Settings Screen
│  └─ Back → Home Screen
├─ Add Business Button/Icon → Add/Edit Business Dialog
│  ├─ Save → Home Screen (dismiss dialog)
│  └─ Delete → Delete Business Confirmation
│     ├─ Cancel → Add/Edit Business Dialog
│     └─ Ok → Home Screen (dismiss both dialogs)
├─ Analytics Icon (header) → Businesses Analysis Screen
│  └─ Back → Home Screen
├─ Business Card Edit Icon → Add/Edit Business Dialog (with businessId)
├─ Business Card Analytics Icon → Single Business Analytics Screen
│  ├─ Edit Limit Icon → Edit Limit Popup
│  └─ Back → Home Screen
├─ Invoice Card Edit Icon → Edit Invoice Screen
│  ├─ Edit Name → Name Edit Popup
│  ├─ Edit Amount → Amount Edit Popup
│  ├─ Calendar Icon → Date Picker
│  ├─ Business Expander → Business List Dropdown
│  │  └─ Add Business Card → Add/Edit Business Dialog
│  ├─ Save → Home Screen
│  ├─ Delete → Delete Invoice Confirmation
│  │  ├─ Cancel → Edit Invoice Screen
│  │  └─ Ok → Home Screen
│  └─ Back → Home Screen
├─ See All Card → Invoices List Screen
│  ├─ Invoice Card Edit Icon → Edit Invoice Screen
│  └─ Back → Home Screen
└─ Upload Button → Upload Invoice modalBottomSheet
   └─ Upload Complete → Home Screen (dismiss sheet)
```

### Navigation Edges Table

| Source Screen | Action | Destination | Parameters | Notes |
|---------------|--------|-------------|------------|-------|
| Welcome | Login Button | Login Screen | None | |
| Welcome | Sign Up Button | Sign Up Screen | None | |
| Login | Enter (success) | Home Screen | None | Requires authentication |
| Login | Back | Welcome Screen | None | |
| Sign Up | Enter (success) | Home Screen | None | Creates account + auth |
| Sign Up | Back | Welcome Screen | None | |
| Home | Settings Icon | Settings Screen | None | |
| Home | Add Business Button | Add/Edit Business Dialog | businessId=null | Create mode |
| Home | Analytics Icon | Businesses Analysis Screen | None | |
| Home | Business.EditIcon | Add/Edit Business Dialog | businessId | Edit mode |
| Home | Business.AnalyticsIcon | Single Business Analytics | businessId | |
| Home | Invoice.EditIcon | Edit Invoice Screen | invoiceId | |
| Home | See All Card | Invoices List Screen | None | |
| Home | Upload Button | Upload Invoice Sheet | None | Modal |
| Add/Edit Business | Save | Home Screen | None | Dismiss dialog |
| Add/Edit Business | Delete | Delete Business Confirm | businessId | |
| Delete Business Confirm | Cancel | Add/Edit Business Dialog | None | |
| Delete Business Confirm | Ok | Home Screen | None | Dismiss both |
| Upload Invoice Sheet | Complete | Home Screen | None | Dismiss sheet |
| Edit Invoice | Edit Name Icon | Name Edit Popup | name | Modal |
| Edit Invoice | Edit Amount Icon | Amount Edit Popup | amount, currency | Modal |
| Edit Invoice | Calendar Icon | Date Picker | date | Modal |
| Edit Invoice | Business Expander | Business List Dropdown | businessId | Dropdown |
| Edit Invoice | Business.AddCard | Add/Edit Business Dialog | businessId=null | |
| Edit Invoice | Save | Home Screen | None | |
| Edit Invoice | Delete | Delete Invoice Confirm | invoiceId | |
| Edit Invoice | Back | Home Screen | None | |
| Delete Invoice Confirm | Cancel | Edit Invoice Screen | None | |
| Delete Invoice Confirm | Ok | Home Screen | None | Dismiss dialog |
| Invoices List | Invoice.EditIcon | Edit Invoice Screen | invoiceId | |
| Invoices List | Back | Home Screen | None | |
| Settings | Edit Name Icon | Name Edit Popup | name | Modal |
| Settings | Edit Currency Icon | Currency Picker Sheet | currency | Modal |
| Settings | Back | Home Screen | None | |
| Single Business Analytics | Edit Limit Icon | Edit Limit Popup | limit | Modal |
| Single Business Analytics | Back | Home Screen | None | |
| Businesses Analysis | Back | Home Screen | None | |

---

## Forbidden Routes & Navigation

### Routes That MUST NOT Exist

- ❌ `/vendor/:id/invoices` (invoices accessed via Home Screen expandable cards, not separate route)
- ❌ `/vendor/:id/analytics/invoices` (NO invoices tab in analytics)
- ❌ `/forgot-password`
- ❌ `/reset-password`
- ❌ `/profile` (use `/settings` instead)
- ❌ `/notifications`
- ❌ `/help` or `/support`

### Navigation Patterns That MUST NOT Exist

- ❌ **NO tabs in Single Business Analytics Screen** (CRITICAL)
  - Current implementation has Analytics/Invoices tabs → REMOVE
  - Only allowed content: KPIs + Charts
- ❌ NO bottom navigation bar / tab bar
- ❌ NO drawer navigation / hamburger menu
- ❌ NO breadcrumbs
- ❌ NO deep linking beyond defined routes
- ❌ NO "Recent" or "Favorites" sections

### Restricted Navigation Patterns

- ✅ **Home Screen is the primary hub**: Most screens navigate back to Home (not to previous screen)
- ✅ **Single entry point per screen**: No multiple paths to same screen (except Home → X and X → Home)
- ✅ **Modals/dialogs are NOT routes**: Use programmatic dialog opening, not URL navigation

---

## Route Guards & Middleware

### Authentication Guard

**Required**: All routes except `/`, `/login`, `/signup` require authentication.

**Implementation**:
```dart
// GoRouter redirect logic
redirect: (context, state) {
  final isLoggedIn = authState.maybeWhen(
    data: (user) => user != null,
    orElse: () => false,
  );

  final isAuthRoute = ['/','login', '/signup'].contains(state.matchedLocation);

  if (!isLoggedIn && !isAuthRoute) {
    return '/'; // Redirect to welcome
  }

  if (isLoggedIn && isAuthRoute) {
    return '/home'; // Redirect to home if already logged in
  }

  return null; // Allow navigation
}
```

### Tenant Isolation

**All API calls** must include `tenantId` derived from authenticated user's JWT `sub` claim.

**Route-level validation**: Ensure `invoiceId` and `businessId` parameters belong to current tenant.

---

## Navigation State Management

### Using GoRouter (Existing)

**Current Implementation**: GoRouter with declarative routing (Version 001)

**Required for Version 002**:
- ✅ Maintain existing route structure
- ✅ Add/update routes as needed for compliance
- ✅ Remove forbidden routes (e.g., analytics invoices tab)

### Back Navigation Behavior

| Screen | Back Button | Behavior |
|--------|-------------|----------|
| Welcome | N/A | Exit app |
| Login | Back | → Welcome |
| Sign Up | Back | → Welcome |
| Home | Back | Exit app |
| Settings | Back | → Home |
| Invoices List | Back | → Home |
| Edit Invoice | Back | → Home |
| Single Business Analytics | Back | → Home |
| Businesses Analysis | Back | → Home |

**Note**: Most screens navigate back to Home (not previous screen in stack).

---

## Route Naming Conventions

### Route Names (for programmatic navigation)

```dart
// Suggested route names for GoRouter
const welcomeRoute = '/';
const loginRoute = '/login';
const signupRoute = '/signup';
const homeRoute = '/home';
const settingsRoute = '/settings';
const invoicesRoute = '/invoices';
const invoiceDetailRoute = '/invoice/:id';
const vendorAnalyticsRoute = '/vendor/:id/analytics';
const overallAnalyticsRoute = '/analytics';
```

### Route Parameters Access

```dart
// GoRouter path parameters
final invoiceId = state.pathParameters['id']!; // Required
final businessId = state.pathParameters['id']!; // Required

// GoRouter query parameters (not used in current spec)
// final filter = state.queryParameters['filter']; // N/A
```

---

## Deep Linking Support

**Out of Scope for Version 002**: Deep linking is not specified in FLOW_CONTRACT.

**If implemented later**, allowed deep link patterns:
- `invoiceme://invoice/{id}` → Edit Invoice Screen
- `invoiceme://vendor/{id}/analytics` → Single Business Analytics
- `invoiceme://invoices` → Invoices List Screen

---

## Testing Checklist

**Route validation**:
- [ ] All defined routes are implemented
- [ ] All forbidden routes are NOT implemented
- [ ] Route parameters are validated (UUID format, tenant ownership)
- [ ] Authentication guard works on protected routes
- [ ] Back navigation follows specified behavior
- [ ] Modals/dialogs are NOT routes (programmatic only)
- [ ] **CRITICAL**: `/vendor/:id/analytics` has NO tabs

---

## Version Control

| Version | Date | Changes |
|---------|------|---------|
| 002 | 2026-01-20 | Initial routes map from FLOW_CONTRACT |

---

**END OF ROUTES MAP**
