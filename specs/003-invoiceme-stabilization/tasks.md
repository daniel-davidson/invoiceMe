# Tasks: InvoiceMe Stabilization (20 Items)

**Feature**: 003-invoiceme-stabilization  
**Date**: 2026-01-21  
**Status**: Active Implementation (NOT retrospective)

**Organization**: Tasks map 1:1 to the 20 specification items (I01-I20), organized by priority phase.

---

## Scope Mapping: I01-I20

| Item | Description | Task ID | Priority | Files |
|------|-------------|---------|----------|-------|
| I01 | App background color fixed | T001 | P2 | `main.dart` |
| I02 | Responsive layout mobile | T002 | P2 | All screens, charts |
| I03 | Password validation 8 chars | T003 | P0 | `signup_screen.dart`, `validation_constants.dart` |
| I04 | Snackbar auto-dismiss | T004 | P1 | `snackbar_utils.dart`, all action screens |
| I05 | Home empty state fix | T005 | P1 | `home_screen.dart`, `empty_state.dart` |
| I06 | Monthly limit field | T006 | P1 | `home_screen.dart` |
| I07 | Home with businesses fix | T007 | P1 | `home_screen.dart` |
| I08 | App bar icons update | T008 | P1 | `home_screen.dart` |
| I09 | Remove view file button | T009 | P1 | `invoice_detail_screen.dart` |
| I10 | Line items edit consistency | T010 | P1 | `invoice_detail_screen.dart` |
| I11 | Profile settings working | T011 | P0 | `settings_screen.dart`, `settings_provider.dart` |
| I12 | Mobile dialogs keyboard-safe | T012 | P2 | All dialogs |
| I13 | Export functionality | T013 | P0 | `export_utils.dart`, export screens |
| I14 | Fix type error | T014 | P0 | `invoices_provider.dart` |
| I15 | Currency validation | T015 | P0 | `settings_provider.dart` |
| I16 | File size validation | T016 | P2 | `home_provider.dart` |
| I17 | Analytics loading message | T017 | P2 | `overall_analytics_screen.dart` |
| I18 | Dialog loading indicators | T018 | P1 | All dialogs |
| I19 | AI insights human-friendly | T019 | P2 | `insights_screen.dart` |
| I20 | Charts responsive axes | T020 | P2 | All chart screens |

**Total**: 20 implementation tasks + validation tasks

---

## Phase P0: Critical Correctness (MUST FIX FIRST)

**Items**: I03, I11, I13, I14, I15

---

### T003: [I03] Password Validation 8-Character Minimum

**Goal**: Fix password validation mismatch (currently says 6 but requires 8)

**Files to Change**:
- Create: `frontend/lib/core/constants/validation_constants.dart`
- Update: `frontend/lib/features/auth/presentation/screens/signup_screen.dart`
- Update: `frontend/lib/features/auth/presentation/screens/login_screen.dart` (consistency)

**Implementation Steps**:
1. Create `validation_constants.dart`:
   ```dart
   const int minPasswordLength = 8;
   const String passwordRequirementMessage = 'Password must be at least 8 characters';
   ```

2. Update `signup_screen.dart` validator:
   ```dart
   import 'package:frontend/core/constants/validation_constants.dart';
   
   validator: (value) {
     if (value == null || value.isEmpty) {
       return 'Please enter a password';
     }
     if (value.length < minPasswordLength) {
       return passwordRequirementMessage;
     }
     return null;
   }
   ```

**Acceptance Criteria**:
- [ ] 7-char password shows error: "Password must be at least 8 characters"
- [ ] 8-char password is accepted
- [ ] Error message consistent across all auth screens

**Manual Test - Mobile (375px)**:
1. Navigate to signup screen
2. Enter 6-char password → Verify error shows
3. Enter 7-char password → Verify error shows
4. Enter 8-char password → Verify no error

**Manual Test - Web (1440px)**:
1. Repeat all mobile tests on desktop Chrome
2. Verify error messages display correctly

**Definition of Done**:
- [ ] `flutter analyze` passes for modified files
- [ ] All manual tests pass
- [ ] Consistent validation across auth screens

---

### T011: [I11] Fix Profile Settings (Name + Currency)

**Goal**: Make profile settings actually work (currently broken)

**Files to Change**:
- Update: `frontend/lib/features/settings/presentation/screens/settings_screen.dart`
- Update: `frontend/lib/features/settings/presentation/providers/settings_provider.dart`

**Implementation Steps**:
1. Update `settings_screen.dart` - Edit name dialog:
   - Wrap in `Consumer` widget
   - Add `barrierDismissible: !isLoading`
   - Show `CircularProgressIndicator` in save button during loading
   - Add `ref.listen` for success/error snackbars
   - Disable TextField and buttons during loading

2. Update `settings_screen.dart` - Currency picker:
   - Wrap `onSelect` in try-catch
   - Show success snackbar (green)
   - Show error snackbar (red) with "Retry"

3. Update `settings_provider.dart`:
   - In `updateName()`: add `rethrow` to propagate errors to UI
   - In `updateCurrency()`: add `rethrow` and provider invalidation:
     ```dart
     await _apiClient.patch('/users/me', data: {'systemCurrency': currencyCode});
     _ref.invalidate(authStateProvider);
     _ref.invalidate(overallAnalyticsProvider);
     _ref.invalidate(invoicesProvider);
     ```

**Acceptance Criteria**:
- [ ] Edit name dialog shows loading states
- [ ] Name change shows success snackbar and updates everywhere
- [ ] Currency change shows loading states
- [ ] Currency change triggers analytics refresh (< 2 seconds)
- [ ] Error handling works with retry option

**Manual Test - Mobile (375px)**:
1. Settings → Edit name → Enter new name → Save
2. Verify loading indicator appears
3. Verify success snackbar: "Name updated successfully"
4. Settings → Edit currency → Change to EUR → Save
5. Navigate to analytics → Verify EUR appears < 2 sec
6. Test error: Disconnect network → Try save → Verify error with "Retry"

**Manual Test - Web (1440px)**:
1. Repeat all mobile tests
2. Verify dialogs properly sized on desktop

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] Name change works end-to-end
- [ ] Currency change works end-to-end
- [ ] Analytics refresh after currency change
- [ ] All manual tests pass

---

### T013: [I13] Implement CSV Export End-to-End

**Goal**: Make download/share export functionality work

**Files to Change**:
- Add dependency: `frontend/pubspec.yaml` (add `csv: ^6.0.0`)
- Create: `frontend/lib/core/utils/export_utils.dart`
- Update: `frontend/lib/features/invoices/presentation/providers/invoices_provider.dart`
- Update: `frontend/lib/features/invoices/presentation/screens/invoices_list_screen.dart`
- Update: `frontend/lib/features/vendors/presentation/providers/vendor_analytics_provider.dart`
- Update: `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
- Update: `frontend/lib/features/analytics/presentation/providers/overall_analytics_provider.dart`

**Implementation Steps**:
1. Add to `pubspec.yaml`:
   ```yaml
   dependencies:
     csv: ^6.0.0
   ```

2. Create `export_utils.dart`:
   ```dart
   import 'dart:html' as html;
   import 'package:csv/csv.dart';
   import 'package:intl/intl.dart';
   
   class ExportUtils {
     static String generateInvoicesCsv(List<Invoice> invoices) {
       List<List<dynamic>> rows = [
         ['Date', 'Business', 'Amount', 'Currency', 'Invoice #', 'Status']
       ];
       for (var invoice in invoices) {
         rows.add([
           DateFormat('yyyy-MM-dd').format(invoice.invoiceDate),
           invoice.vendorName,
           invoice.originalAmount.toStringAsFixed(2),
           invoice.originalCurrency,
           invoice.invoiceNumber ?? 'N/A',
           invoice.needsReview ? 'Needs Review' : 'Complete',
         ]);
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
     
     static String generateFilename(String prefix, {String? businessName}) {
       final date = DateFormat('yyyy-MM-dd').format(DateTime.now());
       if (businessName != null) {
         final sanitized = businessName
           .replaceAll(RegExp(r'[^\w\s-]'), '')
           .replaceAll(RegExp(r'\s+'), '_');
         return '${prefix}_${sanitized}_$date.csv';
       }
       return '${prefix}_$date.csv';
     }
   }
   ```

3. Implement `exportCsv()` in each provider using `ExportUtils`

4. Add export button handlers with try-catch and snackbars

**Acceptance Criteria**:
- [ ] Export from all invoices downloads CSV file
- [ ] CSV contains correct headers and data
- [ ] Export from vendor analytics downloads vendor-specific CSV
- [ ] Success snackbar after download
- [ ] Error message if no data: "No invoices to export"

**Manual Test - Mobile (375px)**:
1. All invoices screen → Click export → Verify CSV downloads
2. Open CSV → Verify headers: Date, Business, Amount, Currency, Invoice #, Status
3. Verify data matches UI display
4. Vendor analytics → Click export → Verify vendor-specific CSV
5. With 0 invoices → Click export → Verify error message

**Manual Test - Web (1440px)**:
1. Repeat all mobile tests
2. Check Downloads folder for CSV files
3. Open CSV in Excel/Sheets → Verify formatting

**Definition of Done**:
- [ ] `flutter pub get` succeeds with csv package
- [ ] `flutter analyze` passes
- [ ] Export works from all locations
- [ ] All manual tests pass

---

### T014: [I14] Fix Type Error in All Invoices Screen

**Goal**: Fix runtime error: type 'minified:y0' is not a subtype of type 'String'

**Files to Change**:
- Update: `frontend/lib/features/invoices/presentation/providers/invoices_provider.dart`

**Implementation Steps**:
1. Add `_parseString()` static helper to `Invoice` class:
   ```dart
   static String _parseString(dynamic value, String? defaultValue) {
     if (value == null) return defaultValue ?? '';
     if (value is String) return value;
     return value.toString();
   }
   ```

2. Update `Invoice.fromJson()` to use safe parsing:
   ```dart
   factory Invoice.fromJson(Map<String, dynamic> json) {
     return Invoice(
       id: _parseString(json['id'], 'unknown-id'),
       vendorName: _parseString(json['vendor']?['name'], 'Unknown'),
       originalCurrency: _parseString(json['originalCurrency'], 'USD'),
       invoiceNumber: json['invoiceNumber'] != null 
         ? _parseString(json['invoiceNumber'], null) 
         : null,
       // ... other fields with safe parsing
     );
   }
   ```

**Acceptance Criteria**:
- [ ] All invoices screen loads without errors
- [ ] Console shows 0 type errors
- [ ] All invoice fields display correctly
- [ ] Fields with unexpected types show fallback values

**Manual Test - Mobile (375px)**:
1. Open Chrome DevTools console (F12)
2. Navigate to "All Invoices" screen
3. Verify console shows 0 errors
4. Scroll through invoice list
5. Click on invoices → Details open without errors

**Manual Test - Web (1440px)**:
1. Open DevTools console
2. Navigate to all invoices
3. Verify 0 errors in console
4. Test with various invoices

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] 0 runtime type errors in console
- [ ] All invoices display correctly

---

### T015: [I15] Validate Currency Change Propagation

**Goal**: Ensure currency changes immediately affect all displays

**Files to Change**:
- Update: `frontend/lib/features/settings/presentation/providers/settings_provider.dart`
- Add imports: `overall_analytics_provider.dart`, `invoices_provider.dart`

**Implementation Steps**:
1. In `updateCurrency()` method, after successful API call:
   ```dart
   await _apiClient.patch('/users/me', data: {'systemCurrency': currencyCode});
   _ref.invalidate(authStateProvider);
   _ref.invalidate(overallAnalyticsProvider);  // Add this
   _ref.invalidate(invoicesProvider);          // Add this
   state = const AsyncValue.data(null);
   ```

2. Add necessary imports at top of file

**Acceptance Criteria**:
- [ ] Currency change in settings triggers analytics refresh
- [ ] Analytics KPIs show new currency within 2 seconds
- [ ] Invoice list shows updated normalized amounts
- [ ] Chart Y-axis labels show correct currency symbol (e.g., $, €, ₪)

**Manual Test - Mobile (375px)**:
1. Note current currency (e.g., USD)
2. Navigate to analytics → Note KPI values
3. Settings → Change currency to EUR → Save
4. Navigate back to analytics
5. Verify values updated to EUR < 2 seconds
6. Navigate to invoices → Verify amounts show EUR
7. View charts → Verify € symbol on Y-axis
8. Change back to USD → Verify all update again

**Manual Test - Web (1440px)**:
1. Repeat all mobile tests
2. Verify immediate propagation

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] Currency change triggers immediate refresh
- [ ] All displays update (analytics, invoices, charts)

---

**Phase P0 Validation Checkpoint**:
```bash
cd frontend
flutter analyze        # Must pass: 0 errors
flutter build web      # Must succeed
```
- [ ] All 5 P0 items complete (I03, I11, I13, I14, I15)
- [ ] Manual tests pass on mobile + web
- [ ] No console errors

---

## Phase P1: UX Correctness

**Items**: I04, I05, I06, I07, I08, I09, I10, I18

---

### T004: [I04] Snackbar Auto-Dismiss + Manual Dismiss

**Goal**: Make snackbars auto-dismiss after 5 seconds with manual dismiss options

**Files to Change**:
- Create: `frontend/lib/shared/utils/snackbar_utils.dart`
- Update: All screens with snackbars (settings, home, invoices, vendors, analytics)

**Implementation Steps**:
1. Create `snackbar_utils.dart`:
   ```dart
   import 'package:flutter/material.dart';
   
   class SnackbarUtils {
     static void showSuccess(
       BuildContext context,
       String message, {
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
     
     static void showError(
       BuildContext context,
       String message, {
       Duration duration = const Duration(seconds: 5),
       VoidCallback? onRetry,
     }) {
       ScaffoldMessenger.of(context).showSnackBar(
         SnackBar(
           content: Text(message),
           backgroundColor: Colors.red,
           duration: duration,
           behavior: SnackBarBehavior.floating,
           dismissDirection: DismissDirection.horizontal,
           action: onRetry != null
               ? SnackBarAction(
                   label: 'Retry',
                   textColor: Colors.white,
                   onPressed: () {
                     ScaffoldMessenger.of(context).hideCurrentSnackBar();
                     onRetry();
                   },
                 )
               : SnackBarAction(
                   label: 'Dismiss',
                   textColor: Colors.white,
                   onPressed: () => ScaffoldMessenger.of(context).hideCurrentSnackBar(),
                 ),
         ),
       );
     }
     
     static void showInfo(
       BuildContext context,
       String message, {
       Duration duration = const Duration(seconds: 5),
     }) {
       ScaffoldMessenger.of(context).showSnackBar(
         SnackBar(
           content: Text(message),
           backgroundColor: Colors.blue.shade700,
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
   }
   ```

2. Replace all existing snackbar code in screens with `SnackbarUtils` calls

**Acceptance Criteria**:
- [ ] Snackbars auto-dismiss after 5 seconds
- [ ] "Dismiss" button immediately closes snackbar
- [ ] Tap outside dismisses snackbar
- [ ] Swipe gesture dismisses
- [ ] Success = green, Error = red, Info = blue

**Manual Test - Mobile (375px)**:
1. Save business → Green snackbar → Wait 5 sec → Auto-dismisses
2. Save again → Tap "Dismiss" → Immediately closes
3. Perform action → Snackbar shows → Tap outside → Dismisses
4. Perform action → Snackbar shows → Swipe → Dismisses

**Manual Test - Web (1440px)**:
1. Repeat mobile tests
2. Verify snackbar position correct (bottom)

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] All snackbars use `SnackbarUtils`
- [ ] All manual tests pass

---

### T005: [I05] Fix Home Empty State

**Goal**: Remove duplicate buttons, keep only 2 centered buttons

**Files to Change**:
- Update: `frontend/lib/features/home/presentation/screens/home_screen.dart`
- Verify: `frontend/lib/features/home/presentation/widgets/empty_state.dart`

**Implementation Steps**:
1. In `home_screen.dart`, when `vendors.isEmpty`:
   - Set `floatingActionButton: null`
   - Remove add business icon from app bar in empty state

2. Verify `empty_state.dart` shows exactly 2 centered buttons:
   - "Add Business"
   - "Upload Invoice"

**Acceptance Criteria**:
- [ ] Empty state shows exactly 2 centered buttons
- [ ] No add business icon in app bar
- [ ] No floating button at bottom

**Manual Test - Mobile (375px)**:
1. Delete all businesses
2. Home screen → Count buttons → Should be exactly 2
3. Verify buttons centered
4. Check app bar → No add business icon
5. Check bottom → No floating button

**Manual Test - Web (1440px)**:
1. Repeat mobile tests
2. Verify buttons properly sized on desktop

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] Exactly 2 buttons in empty state
- [ ] Manual tests pass

---

### T006: [I06] Add Monthly Limit to Business Dialog

**Goal**: Add monthly limit input field to add/edit business dialogs

**Files to Change**:
- Update: `frontend/lib/features/home/presentation/screens/home_screen.dart` (`_showAddVendorDialog`, `_showEditVendorDialog`)
- Backend (if needed): `backend/prisma/schema.prisma` (check if `monthlyLimit` field exists)

**Implementation Steps**:
1. In `_showAddVendorDialog`:
   - Add `TextEditingController` for monthly limit
   - Add `TextField` with `keyboardType: TextInputType.number`
   - Add validator: required, positive number
   - Update `addVendor()` call to include `monthlyLimit`

2. In `_showEditVendorDialog`:
   - Pre-fill monthly limit from vendor data
   - Same validation
   - Update `updateVendor()` call

3. If backend doesn't have field, add to Prisma schema:
   ```prisma
   model Vendor {
     // ... existing fields
     monthlyLimit Decimal?
   }
   ```

**Acceptance Criteria**:
- [ ] Add business dialog has "Monthly Limit" field
- [ ] Field is required (blocks save if empty)
- [ ] Field accepts only positive numbers
- [ ] Edit dialog pre-fills existing limit
- [ ] Limit saves successfully

**Manual Test - Mobile (375px)**:
1. Add business → Verify monthly limit field present
2. Try save without limit → Verify validation error
3. Enter -100 → Verify error
4. Enter 5000 → Save succeeds
5. Edit business → Verify limit pre-filled
6. Update limit → Save succeeds

**Manual Test - Web (1440px)**:
1. Repeat all mobile tests
2. Verify number keyboard on mobile

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] Field present in both dialogs
- [ ] All validation works
- [ ] Manual tests pass

---

### T007: [I07] Fix Home With Businesses

**Goal**: Center upload button, remove duplicate add business icon

**Files to Change**:
- Update: `frontend/lib/features/home/presentation/screens/home_screen.dart`

**Implementation Steps**:
1. When `vendors.isNotEmpty`:
   - Set `floatingActionButton: FloatingActionButton.extended` with label "Upload Invoice"
   - Set `floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat`
   - Remove any separate add business floating button

**Acceptance Criteria**:
- [ ] Single centered "Upload Invoice" floating button
- [ ] No separate add business floating button
- [ ] Button at bottom center

**Manual Test - Mobile (375px)**:
1. Add business
2. Home → Verify single "Upload Invoice" button centered at bottom
3. Verify no duplicate add business button

**Manual Test - Web (1440px)**:
1. Repeat mobile tests
2. Verify button centered, not full width

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] Single centered button
- [ ] Manual tests pass

---

### T008: [I08] Update App Bar Icons

**Goal**: Remove analytics icon, add business icon on home

**Files to Change**:
- Update: `frontend/lib/features/home/presentation/screens/home_screen.dart`

**Implementation Steps**:
1. Remove `IconButton(Icons.analytics_outlined)` from app bar
2. Add `IconButton(Icons.business)` to app bar that calls `_showAddVendorDialog`

**Acceptance Criteria**:
- [ ] No analytics icon in app bar
- [ ] Business icon present in app bar
- [ ] Clicking business icon opens add business dialog

**Manual Test - Mobile (375px)**:
1. Home → Check app bar icons
2. Verify no analytics icon
3. Verify business icon present
4. Tap business icon → Add business dialog opens

**Manual Test - Web (1440px)**:
1. Repeat mobile tests

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] Icons updated correctly
- [ ] Manual tests pass

---

### T009: [I09] Remove View Original File Button

**Goal**: Remove non-functional button from invoice details

**Files to Change**:
- Update: `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart`

**Implementation Steps**:
1. Locate `OutlinedButton` with "View Original File" text (around lines 324-333)
2. Remove entire button widget

**Acceptance Criteria**:
- [ ] Invoice details has no "View Original File" button
- [ ] Only edit and delete buttons remain

**Manual Test - Mobile (375px)**:
1. Open invoice details
2. Verify no "View Original File" button
3. Verify edit and delete work

**Manual Test - Web (1440px)**:
1. Repeat mobile test

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] Button removed
- [ ] Manual tests pass

---

### T010: [I10] Fix Line Items Edit Behavior

**Goal**: Make line items edit match invoice field edit pattern

**Files to Change**:
- Update: `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart` (or separate edit screen)

**Implementation Steps**:
1. Ensure line items edit uses same dialog pattern as invoice name/number/date
2. Add loading indicator to save button
3. Show success/error snackbar after save
4. Add validation

**Acceptance Criteria**:
- [ ] Line items edit dialog matches other edit patterns
- [ ] Save shows loading indicator
- [ ] Success snackbar after save
- [ ] Validation errors clear

**Manual Test - Mobile (375px)**:
1. Edit line items → Verify dialog pattern consistent
2. Save → Verify loading indicator
3. Verify success snackbar

**Manual Test - Web (1440px)**:
1. Repeat mobile tests

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] Consistent edit UX
- [ ] Manual tests pass

---

### T018: [I18] Add Loading Indicators to All Dialogs

**Goal**: Show immediate loading feedback in all add/edit/delete dialogs

**Files to Change**:
- Update: `frontend/lib/features/home/presentation/screens/home_screen.dart` (add/edit business dialogs)
- Update: `frontend/lib/features/settings/presentation/screens/settings_screen.dart` (edit name dialog)
- Update: All other dialogs with save/delete actions

**Implementation Steps**:
1. For each dialog:
   - Wrap in `Consumer` widget
   - Add `barrierDismissible: !isLoading`
   - Show `CircularProgressIndicator` in action buttons during loading:
     ```dart
     ElevatedButton(
       onPressed: isLoading ? null : () => { /* save */ },
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
     )
     ```
   - Disable all buttons during loading

**Acceptance Criteria**:
- [ ] All save buttons show loading indicator immediately
- [ ] Delete buttons show loading indicator
- [ ] Buttons disabled during loading
- [ ] Dialog not dismissible during loading

**Manual Test - Mobile (375px)**:
1. Add business → Save → Verify immediate loading
2. Edit business → Save → Verify loading
3. Delete business → Confirm → Verify loading on delete
4. Try tap outside during loading → Dialog stays open
5. Try tap save again → Button disabled

**Manual Test - Web (1440px)**:
1. Repeat all mobile tests

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] All dialogs show loading
- [ ] Manual tests pass

---

**Phase P1 Validation Checkpoint**:
```bash
cd frontend
flutter analyze        # Must pass: 0 errors
flutter build web      # Must succeed
```
- [ ] All 8 P1 items complete (I04-I10, I18)
- [ ] Manual tests pass on mobile + web

---

## Phase P2: Responsiveness & Polish

**Items**: I01, I02, I12, I16, I17, I19, I20

---

### T001: [I01] Fix App Background Color

**Goal**: Make app background independent of browser/OS dark mode

**Files to Change**:
- Update: `frontend/lib/main.dart`

**Implementation Steps**:
1. Change `themeMode: ThemeMode.system` to `themeMode: ThemeMode.light`

**Acceptance Criteria**:
- [ ] App background light despite browser dark mode
- [ ] App background light despite OS dark mode
- [ ] Consistent across all browsers

**Manual Test - Mobile**:
1. Enable iOS dark mode
2. Open app in Safari → Verify light background

**Manual Test - Web (1440px)**:
1. Enable browser dark mode
2. Open app → Verify light background
3. Test Chrome, Safari, Firefox

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] Theme always light
- [ ] Manual tests pass

---

### T002: [I02] Fix Responsive Layout Mobile

**Goal**: Fix buttons and charts overflowing on mobile

**Files to Change**:
- Update: All screens with charts (analytics, vendor analytics)
- Update: All screens with button rows
- Update: Any screens with potential overflow

**Implementation Steps**:
1. Wrap charts in `LayoutBuilder`:
   ```dart
   LayoutBuilder(
     builder: (context, constraints) {
       return SizedBox(
         width: constraints.maxWidth - 32,
         height: 300,
         child: LineChart(/* ... */),
       );
     },
   )
   ```

2. Use `Expanded` or `Flexible` for button rows to prevent overflow

3. Add `SingleChildScrollView` to long content sections

4. Test at 375px width in Chrome DevTools

**Acceptance Criteria**:
- [ ] No horizontal scrolling on any screen (375px)
- [ ] All buttons visible and tappable
- [ ] Charts fit screen with visible axes
- [ ] 0 RenderFlex overflow errors

**Manual Test - Mobile (375px)**:
1. Navigate to every screen
2. Verify no horizontal scrolling
3. View analytics → Charts fit with axes visible
4. Click all buttons → All tappable
5. Console → Verify 0 overflow errors

**Manual Test - Web (1440px)**:
1. Verify no layout regressions on desktop
2. Resize window → Content reflows

**Definition of Done**:
- [ ] `flutter analyze` passes (0 overflow errors)
- [ ] Manual tests pass
- [ ] Responsive on all sizes

---

### T012: [I12] Fix Mobile Dialog Positioning

**Goal**: Keep dialogs accessible when keyboard appears

**Files to Change**:
- Update: All dialogs (home, settings, invoices, vendors)

**Implementation Steps**:
1. Wrap `AlertDialog` content in `SingleChildScrollView`:
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

**Acceptance Criteria**:
- [ ] Dialogs stay on screen when keyboard appears
- [ ] Content scrollable with keyboard visible
- [ ] Buttons accessible via scrolling
- [ ] Keyboard dismisses without closing dialog

**Manual Test - Mobile (actual device)**:
1. Open add business dialog
2. Tap text field → Keyboard appears
3. Verify dialog still visible
4. Scroll → Verify can reach buttons
5. Tap outside keyboard → Keyboard dismisses, dialog stays

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] Keyboard-safe on mobile
- [ ] Manual tests pass

---

### T016: [I16] File Size Validation

**Goal**: Reject heavy images with clear error message

**Files to Change**:
- Update: `frontend/lib/features/home/presentation/providers/home_provider.dart`

**Implementation Steps**:
1. In `uploadFromGallery()` and `uploadPdf()`:
   ```dart
   Future<void> uploadFromGallery() async {
     final result = await FilePicker.platform.pickFiles(type: FileType.image);
     
     if (result != null && result.files.single.bytes != null) {
       final file = result.files.single;
       const maxSizeBytes = 10 * 1024 * 1024; // 10MB
       
       if (file.size > maxSizeBytes) {
         final sizeMB = (file.size / 1024 / 1024).toStringAsFixed(1);
         _setError('File too large (max 10MB). Selected file: ${sizeMB}MB');
         return;
       }
       
       await _uploadFileFromBytes(file.bytes!, file.name);
     }
   }
   ```

**Acceptance Criteria**:
- [ ] Files ≤10MB upload normally
- [ ] Files >10MB show error with actual size
- [ ] Can select different file after rejection

**Manual Test - Mobile (375px)**:
1. Select 5MB image → Upload proceeds
2. Select 15MB image → Error: "File too large (max 10MB). Selected file: 15.0MB"
3. Select 8MB image → Upload proceeds

**Manual Test - Web (1440px)**:
1. Repeat mobile tests

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] Size validation works
- [ ] Manual tests pass

---

### T017: [I17] Add Analytics Loading Message

**Goal**: Show message explaining slow loading with demo resources

**Files to Change**:
- Update: `frontend/lib/features/analytics/presentation/screens/overall_analytics_screen.dart`

**Implementation Steps**:
1. Add conditional info card at top of analytics screen:
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

**Acceptance Criteria**:
- [ ] Message visible with 0 invoices
- [ ] Message explains demo resources
- [ ] Message disappears with invoices

**Manual Test - Mobile (375px)**:
1. With no invoices → Analytics → Verify message shows
2. Upload invoice → Analytics → Verify message gone

**Manual Test - Web (1440px)**:
1. Repeat mobile tests

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] Message displays correctly
- [ ] Manual tests pass

---

### T019: [I19] Improve AI Insights Copy

**Goal**: Make insights human-friendly (no JSON)

**Files to Change**:
- Update: `frontend/lib/features/insights/presentation/screens/insights_screen.dart`
- Backend (optional): `backend/src/insights/insights.service.ts` (update prompt)

**Implementation Steps**:
1. Update AI prompt to request "3-5 short, friendly sentences"
2. Parse response as plain text (split by newlines)
3. Display in simple list format with icons

**Acceptance Criteria**:
- [ ] 3-5 readable sentences displayed
- [ ] No JSON visible
- [ ] No technical jargon
- [ ] Non-technical users understand

**Manual Test - Mobile (375px)**:
1. Open insights screen
2. Count insights → Should be 3-5
3. Read each → Plain English
4. Ask non-technical person → They understand

**Manual Test - Web (1440px)**:
1. Repeat mobile tests

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] Plain language insights
- [ ] Manual tests pass

---

### T020: [I20] Make Charts Responsive with Axes

**Goal**: Ensure charts fit screens with visible X and Y axes

**Files to Change**:
- Update: `frontend/lib/features/analytics/presentation/screens/overall_analytics_screen.dart`
- Update: `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
- Update: Any other screens with charts

**Implementation Steps**:
1. Wrap all line charts in `LayoutBuilder`
2. Set responsive size based on constraints
3. Configure `titlesData`:
   ```dart
   LineChartData(
     titlesData: FlTitlesData(
       leftTitles: AxisTitles(
         sideTitles: SideTitles(
           showTitles: true,
           reservedSize: 40,
         ),
       ),
       bottomTitles: AxisTitles(
         sideTitles: SideTitles(
           showTitles: true,
           reservedSize: 30,
         ),
       ),
       topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
       rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
     ),
   )
   ```

**Acceptance Criteria**:
- [ ] Charts fit container on all devices
- [ ] X-axis labels visible
- [ ] Y-axis labels visible
- [ ] No label overlap

**Manual Test - Mobile (375px)**:
1. View analytics charts
2. Verify X-axis labels visible
3. Verify Y-axis labels visible

**Manual Test - Tablet (768px)**:
1. Same verification

**Manual Test - Web (1440px)**:
1. Same verification
2. Resize window → Charts respond

**Definition of Done**:
- [ ] `flutter analyze` passes
- [ ] All charts have visible axes
- [ ] Manual tests pass on all sizes

---

**Phase P2 Validation Checkpoint**:
```bash
cd frontend
flutter analyze        # Must pass: 0 errors
flutter build web      # Must succeed
```
- [ ] All 7 P2 items complete (I01, I02, I12, I16, I17, I19, I20)
- [ ] Manual tests pass on mobile + web

---

## Final Validation

### All Items Verification
- [ ] I01: App background fixed ✅
- [ ] I02: Responsive layout ✅
- [ ] I03: Password validation ✅
- [ ] I04: Snackbar working ✅
- [ ] I05: Home empty state ✅
- [ ] I06: Monthly limit field ✅
- [ ] I07: Home with businesses ✅
- [ ] I08: App bar icons ✅
- [ ] I09: View file button removed ✅
- [ ] I10: Line items edit ✅
- [ ] I11: Profile settings ✅
- [ ] I12: Mobile dialogs ✅
- [ ] I13: Export working ✅
- [ ] I14: Type error fixed ✅
- [ ] I15: Currency validation ✅
- [ ] I16: File size validation ✅
- [ ] I17: Analytics message ✅
- [ ] I18: Loading indicators ✅
- [ ] I19: AI insights ✅
- [ ] I20: Charts responsive ✅

### Automated Validation
```bash
cd frontend
flutter analyze          # 0 errors
flutter build web        # Success
cd ../backend
npm run build            # Success (if backend touched)
npx prisma validate      # Success (if schema changed)
```

### Manual Validation
- [ ] All 20 items tested on mobile (375px)
- [ ] All 20 items tested on web (1440px)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] No console errors during normal usage
- [ ] No regressions in existing functionality

---

## Notes

- **NOT retrospective**: All tasks require implementation
- **NOT marked complete**: Checkboxes empty until work is done
- **Exact mapping**: 20 tasks (T001-T020) map to 20 items (I01-I20)
- **File paths**: Exact locations provided for each task
- **Manual tests**: Both mobile and web for every item
- **Definition of done**: Clear completion criteria for each

---

## Execution Strategy

### Sequential (Single Developer)
1. Implement Phase P0 (5 items): 2-3 days
2. Validate P0 checkpoint
3. Implement Phase P1 (8 items): 3-4 days
4. Validate P1 checkpoint
5. Implement Phase P2 (7 items): 2-3 days
6. Final validation

**Total**: 7-10 days

### Parallel (Multiple Developers)
- Developer A: P0 items
- Developer B: P1 items (after P0 checkpoint)
- Developer C: P2 items (after P0 checkpoint)

**Total**: 5-7 days

---

**Ready for Implementation**: All 20 tasks defined with clear instructions.
