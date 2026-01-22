# Implementation Plan: 003-invoiceme-stabilization

**Feature**: InvoiceMe Stabilization (20 Items)  
**Branch**: `003-invoiceme-stabilization`  
**Created**: 2026-01-21  
**Type**: Bug Fixes & UX Improvements

---

## Executive Summary

This plan details the implementation strategy for fixing 20 specific issues in the InvoiceMe MVP. The work is organized into 3 priority phases (P0, P1, P2) with strict execution order to minimize regressions.

**Critical Rule**: **DO NOT redesign the app**. Only adjust UI/UX to match SCOPE_LOCK.md. No flow changes, no new screens, no architectural changes.

**Source of Truth**: [SCOPE_LOCK.md](./SCOPE_LOCK.md)

---

## Technical Context

### Stack
- **Frontend**: Flutter 3.10.7+ (Web + Mobile)
- **State Management**: Riverpod (class-based notifiers)
- **Backend**: NestJS + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Architecture**: Clean Architecture (presentation/domain/data)

### Existing Codebase Structure
```
frontend/
  lib/
    core/
      constants/         # New: validation_constants.dart
      utils/             # New: export_utils.dart
      theme/
    features/
      auth/
        presentation/
          screens/       # signup_screen.dart, login_screen.dart
      home/
        presentation/
          screens/       # home_screen.dart (main focus)
          widgets/       # empty_state.dart
          providers/     # home_provider.dart
      invoices/
        presentation/
          screens/       # invoice_detail_screen.dart, invoices_list_screen.dart
          providers/     # invoices_provider.dart
      vendors/
        presentation/
          screens/       # vendor_analytics_screen.dart
          providers/     # vendor_analytics_provider.dart
      analytics/
        presentation/
          screens/       # overall_analytics_screen.dart
          providers/     # overall_analytics_provider.dart
      insights/
        presentation/
          screens/       # insights_screen.dart
      settings/
        presentation/
          screens/       # settings_screen.dart
          providers/     # settings_provider.dart
    shared/
      utils/             # New: snackbar_utils.dart
    main.dart
```

### Key Constraints
- **No Backend Schema Changes**: All fixes must work with existing API contracts
- **No Flow Changes**: Navigation stays identical
- **No New Packages**: Except `csv: ^6.0.0` for export functionality
- **Responsive Breakpoints**:
  - Mobile: < 768px (test at 375px)
  - Tablet: 768px - 1024px
  - Desktop: > 1024px (test at 1440px)

---

## Item Classification

### Frontend-Only (15 items)
- I01: App background color
- I02: Responsive layout
- I03: Password validation
- I04: Snackbar auto-dismiss
- I05: Home empty state
- I07: Home with businesses
- I08: App bar icons
- I09: Remove view file button
- I10: Line items edit
- I12: Mobile dialog positioning
- I13: Export functionality (CSV generation)
- I14: Fix type error
- I16: File size validation
- I17: Analytics loading message
- I20: Charts responsive

### Full-Stack (5 items)
- I06: Monthly limit field (requires backend if field missing)
- I11: Profile settings (name + currency API calls)
- I15: Currency validation (provider invalidation + API)
- I18: Dialog loading (UI + API integration)
- I19: AI insights (frontend display + backend prompt)

### Backend-Only (0 items)
- None

---

## Phase 0: Research & Prerequisites

### 0.1 Technical Decisions

#### Decision 1: Snackbar Implementation Strategy
**Choice**: Create `SnackbarUtils` singleton with standard methods

**Rationale**:
- Centralized snackbar behavior across all screens
- Consistent 5-second auto-dismiss with manual dismiss options
- Uses `SnackBarBehavior.floating` for tap-outside dismiss
- Swipe gesture support built into Flutter SnackBar

**Implementation**:
```dart
// frontend/lib/shared/utils/snackbar_utils.dart
class SnackbarUtils {
  static void showSuccess(BuildContext context, String message, {
    Duration duration = const Duration(seconds: 5),
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: duration,
        behavior: SnackBarBehavior.floating,
        dismissDirection: DismissDirection.horizontal,
        action: SnackBarAction(
          label: 'Dismiss',
          textColor: Colors.white,
          onPressed: () => ScaffoldMessenger.of(context).hideCurrentSnackBar(),
        ),
      ),
    );
  }
  // Similar for showError(), showInfo()
}
```

**Alternatives Considered**:
- Custom overlay widget → Rejected (more complex, reinvents wheel)
- Third-party package (flushbar) → Rejected (no new dependencies)

---

#### Decision 2: Mobile Dialog Positioning Strategy
**Choice**: Wrap dialog content in `SingleChildScrollView` with `shrinkWrap: true`

**Rationale**:
- Dialogs remain accessible when keyboard appears
- Content scrollable without dialog jumping too high
- Native behavior preserved (keyboard dismisses on tap outside)

**Implementation**:
```dart
AlertDialog(
  title: const Text('Edit Business'),
  content: SingleChildScrollView(
    shrinkWrap: true,
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(/* ... */),
        // ... other fields
      ],
    ),
  ),
  actions: [/* buttons */],
)
```

**Why It Works**:
- `shrinkWrap: true` prevents dialog from expanding unnecessarily
- `mainAxisSize: MainAxisSize.min` keeps content compact
- Scrollable content ensures buttons always accessible via scroll

**Alternatives Considered**:
- `Positioned` widget → Rejected (doesn't work well with keyboard)
- Custom dialog positioning → Rejected (too complex, non-standard)

---

#### Decision 3: Responsive Layout Strategy
**Choice**: Combination of `LayoutBuilder` + `MediaQuery` + `Flexible`/`Expanded`

**Breakpoints**:
- Mobile: < 768px (test at 375px width)
- Tablet: 768px - 1024px (test at 768px)
- Desktop: > 1024px (test at 1440px)

**Layout Rules**:
1. **Charts**: Wrap in `LayoutBuilder` to get parent constraints
   ```dart
   LayoutBuilder(
     builder: (context, constraints) {
       return SizedBox(
         width: constraints.maxWidth - 32, // Minus padding
         height: 300,
         child: LineChart(/* ... */),
       );
     },
   )
   ```

2. **Button Rows**: Use `Expanded` or `Flexible` to prevent overflow
   ```dart
   Row(
     children: [
       Expanded(child: ElevatedButton(/* ... */)),
       const SizedBox(width: 8),
       Expanded(child: OutlinedButton(/* ... */)),
     ],
   )
   ```

3. **Long Content**: Wrap in `SingleChildScrollView` (vertical only, no horizontal)

4. **Padding**: Consistent 16px on mobile, 24px on tablet/desktop

**Validation**: Zero `RenderFlex overflowed` errors in console

---

#### Decision 4: Chart Axes Configuration
**Choice**: Configure `titlesData` with explicit `reservedSize`

**Implementation**:
```dart
LineChartData(
  titlesData: FlTitlesData(
    leftTitles: AxisTitles(
      sideTitles: SideTitles(
        showTitles: true,
        reservedSize: 40, // Space for Y-axis labels
        getTitlesWidget: (value, meta) {
          return Text(
            '\$${value.toInt()}',
            style: const TextStyle(fontSize: 10),
          );
        },
      ),
    ),
    bottomTitles: AxisTitles(
      sideTitles: SideTitles(
        showTitles: true,
        reservedSize: 30, // Space for X-axis labels
        getTitlesWidget: (value, meta) {
          return Text(
            'Jan',
            style: const TextStyle(fontSize: 10),
          );
        },
      ),
    ),
    topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
    rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
  ),
)
```

**Responsive Sizing**:
- Mobile: `reservedSize: 30` (left), `reservedSize: 25` (bottom)
- Tablet/Desktop: `reservedSize: 40` (left), `reservedSize: 30` (bottom)

---

#### Decision 5: CSV Export Strategy
**Choice**: `csv` package + `dart:html` Blob for web downloads

**Rationale**:
- `csv` package handles CSV formatting correctly
- `dart:html` Blob API works on Flutter Web
- No backend changes needed

**Implementation**:
```dart
// frontend/lib/core/utils/export_utils.dart
import 'dart:html' as html;
import 'package:csv/csv.dart';

class ExportUtils {
  static String generateInvoicesCsv(List<Invoice> invoices) {
    List<List<dynamic>> rows = [
      ['Date', 'Business', 'Amount', 'Currency', 'Invoice #', 'Status']
    ];
    for (var invoice in invoices) {
      rows.add([/* ... */]);
    }
    return const ListToCsvConverter().convert(rows);
  }
  
  static void downloadCsv(String csvContent, String filename) {
    final bytes = csvContent.codeUnits;
    final blob = html.Blob([bytes], 'text/csv');
    final url = html.Url.createObjectUrlFromBlob(blob);
    html.AnchorElement(href: url)
      ..setAttribute('download', filename)
      ..click();
    html.Url.revokeObjectUrl(url);
  }
}
```

---

#### Decision 6: Loading Indicators Strategy
**Choice**: `Consumer` widget + `CircularProgressIndicator` in button

**Implementation**:
```dart
Consumer(
  builder: (context, ref, child) {
    final isLoading = ref.watch(someProvider.select((s) => s.isLoading));
    
    return AlertDialog(
      title: const Text('Add Business'),
      content: TextField(enabled: !isLoading, /* ... */),
      actions: [
        TextButton(
          onPressed: isLoading ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: isLoading ? null : () { /* save */ },
          child: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : const Text('Save'),
        ),
      ],
    );
  },
)
```

**Also**: Set `barrierDismissible: !isLoading` to prevent dismissing during save

---

#### Decision 7: Analytics Loading Message
**Choice**: Conditional info card at top of analytics screen

**Implementation**:
```dart
if (analytics.kpis.invoiceCount == 0)
  Card(
    color: Colors.blue.withValues(alpha: 0.1),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: Colors.blue.shade700),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Using demo resources - loading may be slower. Upload your first invoice to see real analytics.',
              style: TextStyle(color: Colors.blue.shade700),
            ),
          ),
        ],
      ),
    ),
  ),
```

**Behavior**: Message visible only when `invoiceCount == 0`, disappears after first upload

---

## Phase 1: Implementation Execution Order

### Execution Strategy: Sequential by Priority
**Reason**: Minimizes regressions by fixing critical issues first, then UX, then polish

---

### P0: Critical Correctness (MUST FIX FIRST)

**Items**: I03, I11, I13, I14, I15  
**Estimated Duration**: 2-3 days  
**Goal**: Fix broken core functionality (auth, profile, export, type safety, currency)

#### Task Group 1: Type Safety & Validation
**Items**: I03 (password), I14 (type error)

**I03: Password Validation (30 min)**
- Create: `frontend/lib/core/constants/validation_constants.dart`
- Update: `frontend/lib/features/auth/presentation/screens/signup_screen.dart`
- Files: 2
- Risk: Low (isolated change)

**I14: Fix Type Error (45 min)**
- Update: `frontend/lib/features/invoices/presentation/providers/invoices_provider.dart`
- Add `_parseString()` helper for safe JSON parsing
- Files: 1
- Risk: Medium (affects invoice display)

**Validation After Group 1**:
```bash
cd frontend
flutter analyze  # Must pass
flutter test     # If tests exist
```
**Manual Test**: Signup with 6/7/8 char passwords, view all invoices screen

---

#### Task Group 2: Profile Settings
**Items**: I11 (profile), I15 (currency)

**I11: Fix Profile Settings (2 hours)**
- Update: `frontend/lib/features/settings/presentation/screens/settings_screen.dart`
- Update: `frontend/lib/features/settings/presentation/providers/settings_provider.dart`
- Add loading states to name/currency dialogs
- Fix `updateName()` and `updateCurrency()` methods
- Files: 2
- Risk: High (affects user data)

**I15: Currency Validation (1 hour)**
- Update: `frontend/lib/features/settings/presentation/providers/settings_provider.dart`
- Add provider invalidation: `overallAnalyticsProvider`, `invoicesProvider`
- Files: 1 (same as I11, can combine)
- Risk: Medium (affects analytics)

**Validation After Group 2**:
```bash
cd frontend
flutter analyze
```
**Manual Test**: Change name → Verify everywhere, change currency → Verify analytics refresh

---

#### Task Group 3: Export Functionality
**Items**: I13 (export)

**I13: CSV Export (3 hours)**
- Add: `csv: ^6.0.0` to `frontend/pubspec.yaml`
- Create: `frontend/lib/core/utils/export_utils.dart`
- Update: `frontend/lib/features/invoices/presentation/providers/invoices_provider.dart`
- Update: `frontend/lib/features/invoices/presentation/screens/invoices_list_screen.dart`
- Update: `frontend/lib/features/vendors/presentation/providers/vendor_analytics_provider.dart`
- Update: `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
- Files: 6
- Risk: Medium (new dependency)

**Validation After Group 3**:
```bash
cd frontend
flutter pub get  # Install csv package
flutter analyze
flutter build web  # Verify web build works
```
**Manual Test**: Export from all invoices, export from vendor analytics, verify CSV content

---

**P0 Phase Gate**:
- [ ] All 5 P0 items implemented (I03, I11, I13, I14, I15)
- [ ] `flutter analyze` passes (0 errors)
- [ ] `flutter build web` succeeds
- [ ] Manual tests pass on mobile (375px) + web (1440px)
- [ ] No new console errors

**If Gate Fails**: Stop and fix issues before proceeding to P1

---

### P1: UX Correctness

**Items**: I04, I05, I06, I07, I08, I09, I10, I18  
**Estimated Duration**: 3-4 days  
**Goal**: Fix UX inconsistencies and improve user feedback

#### Task Group 4: Snackbar Standardization
**Items**: I04 (snackbar)

**I04: Snackbar Auto-Dismiss (2 hours)**
- Create: `frontend/lib/shared/utils/snackbar_utils.dart`
- Update: All screens with snackbars (~10 files)
- Files: 11
- Risk: Medium (affects all user feedback)

**Affected Screens**:
- `home_screen.dart`, `settings_screen.dart`, `invoice_detail_screen.dart`, 
- `invoices_list_screen.dart`, `vendor_analytics_screen.dart`, 
- `overall_analytics_screen.dart`, `insights_screen.dart`, etc.

**Validation After Group 4**:
```bash
cd frontend
flutter analyze
```
**Manual Test**: Trigger any action → Wait 5 sec → Verify auto-dismiss, tap dismiss, swipe

---

#### Task Group 5: Home Screen Cleanup
**Items**: I05 (empty state), I07 (with businesses), I08 (app bar icons)

**I05: Home Empty State (45 min)**
- Update: `frontend/lib/features/home/presentation/screens/home_screen.dart`
- Update: `frontend/lib/features/home/presentation/widgets/empty_state.dart`
- Remove duplicate buttons in empty state
- Files: 2
- Risk: Low (UI only)

**I07: Home With Businesses (30 min)**
- Update: `frontend/lib/features/home/presentation/screens/home_screen.dart`
- Center floating upload button
- Files: 1 (same as I05)
- Risk: Low (UI only)

**I08: App Bar Icons (30 min)**
- Update: `frontend/lib/features/home/presentation/screens/home_screen.dart`
- Remove analytics icon, add business icon
- Files: 1 (same as I05, I07)
- Risk: Low (UI only)

**Note**: Combine I05, I07, I08 into single `home_screen.dart` update

**Validation After Group 5**:
```bash
cd frontend
flutter analyze
```
**Manual Test**: Delete businesses → Verify 2 buttons, add business → Verify centered upload button

---

#### Task Group 6: Invoice Screens
**Items**: I09 (remove button), I10 (line items)

**I09: Remove View File Button (15 min)**
- Update: `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart`
- Remove `OutlinedButton` with "View Original File"
- Files: 1
- Risk: Very Low (removal only)

**I10: Line Items Edit (1.5 hours)**
- Update: `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart`
- Standardize line items edit dialog pattern
- Add loading indicators
- Files: 1 (same as I09)
- Risk: Medium (affects editing)

**Validation After Group 6**:
```bash
cd frontend
flutter analyze
```
**Manual Test**: Open invoice details → No view file button, edit line items → Verify consistent UX

---

#### Task Group 7: Monthly Limit Field
**Items**: I06 (monthly limit)

**I06: Add Monthly Limit (2 hours)**
- Update: `frontend/lib/features/home/presentation/screens/home_screen.dart`
- Add monthly limit field to add/edit business dialogs
- Add validation (required, positive number)
- Backend check: Verify `Vendor.monthlyLimit` field exists
- Files: 1 (possibly backend schema if missing)
- Risk: Medium (requires backend coordination)

**Backend Verification**:
```bash
cd backend
grep -r "monthlyLimit" prisma/schema.prisma
# If missing, add:
# monthlyLimit Decimal?
```

**Validation After Group 7**:
```bash
cd frontend
flutter analyze
cd backend
npx prisma validate  # If schema changed
```
**Manual Test**: Add business → Verify monthly limit field, enter value, save

---

#### Task Group 8: Loading Indicators
**Items**: I18 (dialog loading)

**I18: Dialog Loading Indicators (3 hours)**
- Update: All dialogs in:
  - `home_screen.dart` (add/edit business)
  - `settings_screen.dart` (edit name, currency)
  - `invoice_detail_screen.dart` (edit invoice, line items)
  - `vendor_analytics_screen.dart` (if applicable)
- Wrap in `Consumer`, add loading states
- Files: 4-6
- Risk: Medium (affects all save/delete actions)

**Validation After Group 8**:
```bash
cd frontend
flutter analyze
```
**Manual Test**: Save any dialog → Verify immediate loading indicator, buttons disabled

---

**P1 Phase Gate**:
- [ ] All 8 P1 items implemented (I04-I10, I18)
- [ ] `flutter analyze` passes
- [ ] `flutter build web` succeeds
- [ ] Manual tests pass on mobile + web
- [ ] No regressions from P0 items

**If Gate Fails**: Fix issues before proceeding to P2

---

### P2: Responsiveness & Polish

**Items**: I01, I02, I12, I16, I17, I19, I20  
**Estimated Duration**: 2-3 days  
**Goal**: Ensure responsive design and add polish touches

#### Task Group 9: Theme & Basic Responsiveness
**Items**: I01 (background), I02 (responsive layout)

**I01: Fix Background Color (5 min)**
- Update: `frontend/lib/main.dart`
- Change `themeMode: ThemeMode.system` to `themeMode: ThemeMode.light`
- Files: 1
- Risk: Very Low

**I02: Responsive Layout (4 hours)**
- Update: All screens with charts and button rows (~8 files)
- Wrap charts in `LayoutBuilder`
- Use `Expanded`/`Flexible` for buttons
- Add `SingleChildScrollView` where needed
- Files: 8-10
- Risk: Medium (affects all screens)

**Affected Screens**:
- `overall_analytics_screen.dart`, `vendor_analytics_screen.dart`,
- `invoices_list_screen.dart`, `home_screen.dart`, etc.

**Validation After Group 9**:
```bash
cd frontend
flutter analyze
flutter build web
# Test at 375px, 768px, 1440px
```
**Manual Test**: View all screens at 375px → No overflow, 1440px → Proper layout

---

#### Task Group 10: Mobile Dialog Fixes
**Items**: I12 (dialog positioning)

**I12: Mobile Dialog Positioning (2 hours)**
- Update: All dialogs (~6 files)
- Wrap content in `SingleChildScrollView` with `shrinkWrap: true`
- Files: 6
- Risk: Low (improves existing behavior)

**Validation After Group 10**:
```bash
cd frontend
flutter analyze
```
**Manual Test (actual device)**: Open dialog → Type → Keyboard appears → Verify scrollable

---

#### Task Group 11: Upload & Analytics Feedback
**Items**: I16 (file size), I17 (analytics message)

**I16: File Size Validation (1 hour)**
- Update: `frontend/lib/features/home/presentation/providers/home_provider.dart`
- Add size check before upload (max 10MB)
- Files: 1
- Risk: Low (validation only)

**I17: Analytics Loading Message (30 min)**
- Update: `frontend/lib/features/analytics/presentation/screens/overall_analytics_screen.dart`
- Add conditional info card for demo resources
- Files: 1
- Risk: Very Low (additive change)

**Validation After Group 11**:
```bash
cd frontend
flutter analyze
```
**Manual Test**: Upload 15MB image → Verify error, analytics with 0 invoices → Verify message

---

#### Task Group 12: AI Insights & Charts
**Items**: I19 (AI insights), I20 (charts)

**I19: AI Insights Copy (1.5 hours)**
- Update: `frontend/lib/features/insights/presentation/screens/insights_screen.dart`
- Update: Backend prompt (if needed)
- Parse as plain text, display 3-5 sentences
- Files: 1-2
- Risk: Low (display only)

**I20: Charts Responsive with Axes (2 hours)**
- Update: All chart screens (~4 files)
- Configure `titlesData` with `reservedSize`
- Wrap in `LayoutBuilder`
- Files: 4
- Risk: Medium (affects analytics display)

**Affected Screens**:
- `overall_analytics_screen.dart`, `vendor_analytics_screen.dart`

**Validation After Group 12**:
```bash
cd frontend
flutter analyze
flutter build web
```
**Manual Test**: View insights → Plain language, view charts at 375px/768px/1440px → Axes visible

---

**P2 Phase Gate**:
- [ ] All 7 P2 items implemented (I01, I02, I12, I16, I17, I19, I20)
- [ ] `flutter analyze` passes
- [ ] `flutter build web` succeeds
- [ ] Manual tests pass on all breakpoints
- [ ] No regressions from P0/P1 items

---

## Phase 2: Final Validation

### Full Regression Suite
**Duration**: 2-3 hours

#### Automated Validation
```bash
# Frontend
cd frontend
flutter analyze        # MUST: 0 errors (info/warnings ok)
flutter build web      # MUST: Success
dart format --set-exit-if-changed lib/  # MUST: Formatted

# Backend (if touched)
cd backend
npm run build          # MUST: Success
npx prisma validate    # MUST: Success (if schema changed)
npm run lint           # SHOULD: Pass
```

#### Manual Smoke Tests

**Test Checklist**: Run through all 20 items

| Item | Mobile (375px) | Web (1440px) | Pass/Fail |
|------|----------------|--------------|-----------|
| I01 | Dark mode → Light BG | Same | ⬜ |
| I02 | No overflow, charts fit | Proper layout | ⬜ |
| I03 | 7-char rejected, 8-char ok | Same | ⬜ |
| I04 | Auto-dismiss 5s | Same | ⬜ |
| I05 | 2 centered buttons | Same | ⬜ |
| I06 | Monthly limit present | Same | ⬜ |
| I07 | Centered upload button | Same | ⬜ |
| I08 | No analytics icon, business icon | Same | ⬜ |
| I09 | No view file button | Same | ⬜ |
| I10 | Consistent edit UX | Same | ⬜ |
| I11 | Name saves, currency saves | Same | ⬜ |
| I12 | Keyboard → scrollable | N/A | ⬜ |
| I13 | CSV downloads | CSV downloads | ⬜ |
| I14 | No type errors | No type errors | ⬜ |
| I15 | Currency updates analytics | Same | ⬜ |
| I16 | 15MB rejected | Same | ⬜ |
| I17 | Demo message shows | Same | ⬜ |
| I18 | Loading indicators | Same | ⬜ |
| I19 | Plain language | Same | ⬜ |
| I20 | Axes visible | Axes visible | ⬜ |

**Critical Flows** (No Regressions):
- [ ] Signup → Login → Dashboard
- [ ] Add business → View business
- [ ] Upload invoice → View invoice
- [ ] View analytics → Export CSV
- [ ] Edit profile → Settings update

**Console Check**:
- [ ] Chrome DevTools: 0 errors during normal usage
- [ ] Mobile simulator: 0 errors during normal usage

---

### Cross-Browser Testing

**Browsers** (Web only):
- [ ] Chrome Desktop (primary)
- [ ] Safari Desktop
- [ ] Firefox Desktop

**Devices** (Mobile):
- [ ] iOS Simulator (Safari)
- [ ] Android Emulator (Chrome)
- [ ] Actual device (ideal for keyboard tests)

---

## Definition of Done (Per Item)

Each of the 20 items must meet:

### Implementation Complete
- [ ] Code changes committed to branch `003-invoiceme-stabilization`
- [ ] All files modified as specified in tasks.md
- [ ] No debugging code left (console.log, print statements)

### Acceptance Criteria Met
- [ ] All acceptance criteria from spec.md checked
- [ ] Item behaves exactly as described in SCOPE_LOCK.md
- [ ] No deviation from specification

### Manual Tests Passed
- [ ] Tested on mobile (375px) - passed
- [ ] Tested on web (1440px) - passed
- [ ] Tested on tablet (768px) - passed (if applicable)
- [ ] Actual device test passed (for I12 keyboard behavior)

### No New Errors
- [ ] `flutter analyze` passes (0 errors)
- [ ] `flutter build web` succeeds
- [ ] No runtime exceptions in console
- [ ] No `RenderFlex overflowed` errors (for I02, I20)

### Quality Standards
- [ ] Code follows existing patterns (Riverpod, Clean Architecture)
- [ ] No duplicate code (use utils for shared logic)
- [ ] Responsive at all breakpoints
- [ ] Loading states where applicable
- [ ] Error handling with user-friendly messages

---

## Definition of Done (Overall)

### All Items Complete
- [ ] 20/20 items implemented and tested
- [ ] VERIFICATION_MATRIX.md fully checked (all items marked PASS)
- [ ] No outstanding bugs or issues

### Automated Validation
- [ ] `flutter analyze` passes (0 errors)
- [ ] `flutter build web` succeeds
- [ ] Backend builds successfully (if touched)
- [ ] Prisma schema valid (if changed)

### Manual Validation
- [ ] Full regression suite passed (20 items + critical flows)
- [ ] Cross-browser testing passed (Chrome, Safari, Firefox)
- [ ] Mobile device testing passed (actual device for I12)
- [ ] No console errors during normal usage

### Documentation
- [ ] VERIFICATION_MATRIX.md updated with results
- [ ] Any issues documented in DECISIONS.md
- [ ] README updated if needed (e.g., new csv package)

### Ready for Production
- [ ] All stakeholder acceptance criteria met
- [ ] Code reviewed (if applicable)
- [ ] Ready to merge into main branch

---

## Risk Mitigation

### High-Risk Items
1. **I11 (Profile Settings)**: Affects user data
   - **Mitigation**: Test thoroughly, add error handling, backup before testing
2. **I02 (Responsive Layout)**: Affects all screens
   - **Mitigation**: Test at each breakpoint, use Flutter DevTools to debug overflow
3. **I18 (Loading Indicators)**: Affects all dialogs
   - **Mitigation**: Test each dialog individually, verify loading/success/error states

### Medium-Risk Items
1. **I13 (Export)**: New dependency
   - **Mitigation**: Verify csv package compatibility, test web download API
2. **I14 (Type Error)**: Affects invoice display
   - **Mitigation**: Add fallback values, log warnings for debugging
3. **I06 (Monthly Limit)**: May require backend change
   - **Mitigation**: Check schema first, coordinate with backend if needed

### Rollback Plan
If critical issue discovered after deployment:
1. **Identify affected items**: Check VERIFICATION_MATRIX.md
2. **Revert specific commits**: Use `git revert` for isolated changes
3. **Hotfix branch**: Create `hotfix/003-stabilization-fix` if needed
4. **Re-test**: Run validation suite before re-deploying

---

## Validation Strategy Per Item

### I01: App Background Color
- **Test**: Enable OS dark mode → Open app
- **Expected**: Light background
- **Pass Criteria**: Background color consistent across all screens

### I02: Responsive Layout
- **Test**: View all screens at 375px, 768px, 1440px
- **Expected**: No horizontal scroll, all content fits, charts visible
- **Pass Criteria**: 0 `RenderFlex overflowed` errors in console

### I03: Password Validation
- **Test**: Signup with 6, 7, 8 character passwords
- **Expected**: 6, 7 rejected with clear message; 8 accepted
- **Pass Criteria**: Consistent error message across all auth screens

### I04: Snackbar Auto-Dismiss
- **Test**: Trigger action → Wait 5 sec, tap dismiss, swipe
- **Expected**: Auto-dismiss after 5s, manual dismiss works
- **Pass Criteria**: All dismiss methods work on mobile + web

### I05: Home Empty State
- **Test**: Delete all businesses
- **Expected**: Exactly 2 centered buttons, no app bar icon, no floating button
- **Pass Criteria**: Visual match to spec

### I06: Monthly Limit Field
- **Test**: Add/edit business → Verify field, enter value, save
- **Expected**: Field present, required, positive numbers only
- **Pass Criteria**: Saves successfully, backend receives value

### I07: Home With Businesses
- **Test**: Add business → Check home
- **Expected**: Single centered floating "Upload Invoice" button
- **Pass Criteria**: No duplicate buttons

### I08: App Bar Icons
- **Test**: Check home app bar
- **Expected**: No analytics icon, business icon present
- **Pass Criteria**: Clicking business icon opens add business dialog

### I09: Remove View File Button
- **Test**: Open invoice details
- **Expected**: No "View Original File" button
- **Pass Criteria**: Only edit and delete buttons visible

### I10: Line Items Edit
- **Test**: Edit line items
- **Expected**: Same dialog pattern as invoice field edits
- **Pass Criteria**: Loading indicator, success snackbar, validation works

### I11: Profile Settings
- **Test**: Change name → Check display, change currency → Check analytics
- **Expected**: Name saves everywhere, currency updates analytics < 2 sec
- **Pass Criteria**: All updates propagate correctly

### I12: Mobile Dialog Positioning
- **Test (actual device)**: Open dialog → Tap field → Keyboard appears
- **Expected**: Dialog scrollable, buttons accessible
- **Pass Criteria**: Keyboard doesn't obscure content

### I13: Export Functionality
- **Test**: Click export on all invoices, vendor analytics
- **Expected**: CSV downloads with correct data
- **Pass Criteria**: CSV opens in Excel/Sheets with proper formatting

### I14: Fix Type Error
- **Test**: Open all invoices screen → Check console
- **Expected**: Screen loads, 0 type errors in console
- **Pass Criteria**: All invoices display correctly

### I15: Currency Validation
- **Test**: Change USD to EUR → Check analytics, invoices, charts
- **Expected**: All displays update within 2 seconds
- **Pass Criteria**: Currency symbol correct everywhere

### I16: File Size Validation
- **Test**: Upload 15MB image
- **Expected**: Error message with actual file size
- **Pass Criteria**: Can select different file after rejection

### I17: Analytics Loading Message
- **Test**: With 0 invoices → Open analytics
- **Expected**: Demo resources message visible
- **Pass Criteria**: Message disappears after uploading invoice

### I18: Dialog Loading Indicators
- **Test**: Save any dialog
- **Expected**: Immediate loading indicator, buttons disabled
- **Pass Criteria**: Dialog not dismissible during loading

### I19: AI Insights
- **Test**: Open insights screen
- **Expected**: 3-5 plain language sentences, no JSON
- **Pass Criteria**: Non-technical user can understand

### I20: Charts Responsive
- **Test**: View charts at 375px, 768px, 1440px
- **Expected**: X and Y axes visible at all sizes
- **Pass Criteria**: No axis label overlap

---

## Key Metrics

### Success Metrics
- **Implementation Speed**: 7-10 days total
- **Code Quality**: 0 errors in `flutter analyze`
- **Test Coverage**: 100% of 20 items manually tested
- **Regression Rate**: 0 regressions in critical flows

### Performance Metrics
- **Build Time**: `flutter build web` < 3 minutes
- **Analytics Load**: With message, < 5 seconds perceived load
- **Export Speed**: CSV generation < 1 second for 100 invoices

---

## Project Structure Impact

### New Files Created
```
frontend/lib/
  core/
    constants/
      validation_constants.dart        # I03
    utils/
      export_utils.dart                 # I13
  shared/
    utils/
      snackbar_utils.dart               # I04
```

### Modified Files (High Impact)
```
frontend/lib/
  main.dart                             # I01 (theme)
  features/
    home/
      presentation/
        screens/home_screen.dart        # I05, I06, I07, I08, I18
    settings/
      presentation/
        screens/settings_screen.dart    # I11, I18
        providers/settings_provider.dart # I11, I15
    invoices/
      presentation/
        screens/invoice_detail_screen.dart # I09, I10, I18
        providers/invoices_provider.dart   # I14
    analytics/
      presentation/
        screens/overall_analytics_screen.dart # I17, I20
```

### Dependency Changes
```yaml
# frontend/pubspec.yaml
dependencies:
  csv: ^6.0.0  # New for I13
```

---

## Coordination Notes

### Frontend Team
- Focus on UI/UX changes
- Test at all breakpoints (375px, 768px, 1440px)
- Use Flutter DevTools to debug overflow/performance

### Backend Team
- Verify `Vendor.monthlyLimit` field exists (I06)
- Check AI insights prompt (I19, if backend change needed)
- No other backend changes required

### QA Team
- Use TEST_PLAN.md for manual testing
- Use VERIFICATION_MATRIX.md to track progress
- Prioritize testing on actual mobile devices (keyboard behavior)

---

## Timeline Summary

| Phase | Duration | Items | Completion Criteria |
|-------|----------|-------|---------------------|
| P0 | 2-3 days | 5 items (I03, I11, I13, I14, I15) | Critical bugs fixed |
| P1 | 3-4 days | 8 items (I04-I10, I18) | UX polished |
| P2 | 2-3 days | 7 items (I01, I02, I12, I16, I17, I19, I20) | Fully responsive |
| Validation | 0.5 day | Full suite | All 20 items verified |
| **Total** | **7-10 days** | **20 items** | **Ready for production** |

---

## References

- **SCOPE_LOCK.md**: Source of truth for 20 items
- **spec.md**: Detailed requirements for each item
- **tasks.md**: Task-by-task implementation guide (T001-T020)
- **TEST_PLAN.md**: Manual test procedures
- **VERIFICATION_MATRIX.md**: Tracking sheet with checkboxes
- **UI_STATES.md**: Snackbar, dialog, loading state definitions

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Confirm priority order** (P0 → P1 → P2)
3. **Begin P0 implementation** (start with I03, I14)
4. **Use tasks.md** for step-by-step guidance
5. **Track progress** in VERIFICATION_MATRIX.md

**Ready to implement!** 🚀
