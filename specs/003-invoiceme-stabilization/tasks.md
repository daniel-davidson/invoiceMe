# Implementation Tasks: InvoiceMe Stabilization

**Feature Branch**: `003-invoiceme-stabilization`  
**Created**: 2026-01-21  
**Status**: Implementation Ready  
**Source**: [spec.md](./spec.md) | [plan.md](./plan.md)

---

## Overview

This task list covers 20 specific stabilization items organized into 3 priority phases (P0, P1, P2). Each task includes concrete files to modify, acceptance criteria, and manual test steps.

**Total Tasks**: 22 (20 feature tasks + 1 validation + 1 compliance)  
**Estimated Timeline**: 7-10 days  
**Phases**: P0 (must fix first) → P1 (mobile/tablet) → P2 (analytics)

---

## Task Organization

Tasks are grouped by priority and functional area:

- **Phase 0 (P0)**: Critical fixes - crashes, broken core features, type errors
- **Phase 1 (P1)**: Mobile/tablet responsiveness, dialogs, UX improvements
- **Phase 2 (P2)**: Analytics improvements, AI insights, chart optimization

Each task follows this format:
- **Goal**: What this task achieves
- **Files**: Specific files to modify
- **Acceptance Criteria**: Checklist of requirements
- **Manual Test Steps**: Step-by-step validation

---

## Phase 0: Critical Fixes (P0)

**Purpose**: Fix crashes, broken functionality, and blocking bugs  
**Gate**: Must complete before Phase 1

### T001 [P0] Fix Runtime Type Error in All Invoices Screen

**Goal**: Eliminate "type 'minified:y0' is not a subtype of type 'String'" error

**Files**:
- `frontend/lib/features/invoices/presentation/screens/invoices_list_screen.dart` (or similar)
- Any invoice-related widgets/screens where type errors occur

**Changes Needed**:
1. Identify where string conversion happens without null/type checking
2. Add explicit `.toString()` calls
3. Add null checks before type casts
4. Use safe navigation (`?.`) for nullable fields
5. Provide default values for nullable strings

**Acceptance Criteria**:
- [ ] No "minified:y0" errors in browser console
- [ ] All invoices screen loads without crashes
- [ ] Invoice list displays correctly
- [ ] Filtering/sorting works without errors
- [ ] `flutter analyze` shows 0 new errors

**Manual Test Steps**:
1. Open browser DevTools console
2. Navigate to All Invoices screen
3. Verify no type errors appear
4. Try filtering invoices
5. Try sorting invoices
6. Verify all operations work smoothly

**Validation Command**:
```bash
cd frontend
flutter analyze
flutter build web --release
```

---

### T002 [P0] Align Password Validation to 8+ Characters

**Goal**: Standardize password validation to 8 characters minimum everywhere

**Files**:
- `frontend/lib/features/auth/presentation/screens/register_screen.dart`
- `frontend/lib/features/auth/presentation/screens/login_screen.dart`
- `frontend/lib/features/settings/presentation/screens/settings_screen.dart` (password change)
- `frontend/lib/core/constants/validation_constants.dart` (create if not exists)

**Changes Needed**:
1. Create shared validation constants:
   ```dart
   // lib/core/constants/validation_constants.dart
   const int minPasswordLength = 8;
   const String passwordRequirementMessage = 
     'Password must be at least 8 characters';
   ```
2. Update all password validators to use these constants
3. Ensure error messages are identical everywhere
4. Remove any conflicting validation logic

**Acceptance Criteria**:
- [ ] Registration rejects passwords < 8 characters
- [ ] Login validation consistent (if present)
- [ ] Password change rejects passwords < 8 characters
- [ ] Error message identical in all locations
- [ ] 8-character passwords accepted everywhere
- [ ] Clear, user-friendly error messages

**Manual Test Steps**:
1. Go to registration screen
2. Enter email: test@test.com
3. Enter password: `1234567` (7 chars)
4. Click Register → expect error "Password must be at least 8 characters"
5. Change password to: `12345678` (8 chars)
6. Click Register → expect success
7. Go to Settings → Change Password
8. Try `1234567` → expect same error
9. Try `12345678` → expect success

---

### T003 [P0] Fix Profile Settings (Name and Currency)

**Goal**: Ensure profile name and currency changes work end-to-end

**Files**:
- `frontend/lib/features/settings/presentation/screens/settings_screen.dart`
- `frontend/lib/features/settings/presentation/notifiers/settings_notifier.dart` (or similar state management)
- `frontend/lib/features/settings/data/repositories/settings_repository.dart`

**Changes Needed**:
1. **Name Update**:
   - Add loading state to save button
   - Ensure API call includes updated name
   - Update local state after successful save
   - Show success snackbar
   - Propagate name change to app header/profile

2. **Currency Update**:
   - Add loading state to save button
   - Ensure API call includes new currency
   - Update all currency displays after save
   - Use Riverpod to propagate change globally
   - Trigger re-fetch of amounts in new currency

3. **Error Handling**:
   - Catch API errors
   - Show specific error messages
   - Allow retry on failure

**Acceptance Criteria**:
- [ ] Name change saves successfully to backend
- [ ] Name updates in UI within 2 seconds
- [ ] Name persists after page reload
- [ ] Currency change saves successfully to backend
- [ ] All amounts update to new currency immediately
- [ ] Currency persists after page reload
- [ ] Errors show actionable messages with retry option
- [ ] Loading indicator shows during save

**Manual Test Steps**:
1. Go to Settings screen
2. Change name from "Test User" to "New Name"
3. Click Save → verify loading spinner appears
4. Verify success snackbar shows
5. Check app header → name should be "New Name"
6. Reload page (Cmd+R)
7. Verify name still "New Name"
8. Change currency from ILS to USD
9. Click Save → verify loading spinner
10. Verify success snackbar
11. Go to home screen → check amounts now in USD
12. Reload page → verify amounts still in USD

**Validation Command**:
```bash
cd frontend
flutter analyze
# Test with backend running
```

---

### T004 [P0] Implement Export/Share/Download Flows

**Goal**: Working CSV download and share for overall and per-business analytics

**Files**:
- `frontend/lib/core/utils/export_utils.dart` (create)
- `frontend/lib/features/analytics/presentation/screens/analytics_screen.dart`
- `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
- `frontend/pubspec.yaml` (add csv package if needed)

**Changes Needed**:
1. **Create CSV Export Utility**:
   ```dart
   // lib/core/utils/export_utils.dart
   import 'package:csv/csv.dart';
   
   String generateInvoicesCsv(List<Invoice> invoices) {
     List<List<dynamic>> rows = [
       ['Date', 'Business', 'Amount', 'Currency', 'Invoice #', 'Status']
     ];
     for (var invoice in invoices) {
       rows.add([
         invoice.date,
         invoice.businessName,
         invoice.amount,
         invoice.currency,
         invoice.number,
         invoice.status
       ]);
     }
     return const ListToCsvConverter().convert(rows);
   }
   ```

2. **Overall Export** (analytics_screen.dart):
   - Add export button handler
   - Get all user invoices
   - Generate CSV
   - Trigger download
   - Show success/error snackbar

3. **Per-Business Export** (vendor_analytics_screen.dart):
   - Add export button handler
   - Get invoices filtered to current business
   - Generate CSV
   - Trigger download
   - Show success/error snackbar

4. **Add Share Functionality**:
   - Check for Web Share API support
   - Show share option on compatible browsers
   - Fallback to download on unsupported browsers

**Acceptance Criteria**:
- [ ] Overall export button downloads CSV with all invoices
- [ ] Per-business export downloads CSV with only that business's invoices
- [ ] CSV opens correctly in Excel/Google Sheets
- [ ] CSV contains correct columns: Date, Business, Amount, Currency, Invoice #, Status
- [ ] File naming descriptive (e.g., invoices_2026-01-21.csv, business_abc_2026-01-21.csv)
- [ ] Share option appears on compatible mobile browsers
- [ ] Errors show actionable messages
- [ ] Success snackbars confirm download

**Manual Test Steps**:
1. Go to Overall Analytics screen
2. Click Export/Download button
3. Verify CSV file downloads
4. Open CSV in Excel or Google Sheets
5. Verify all your invoices are present
6. Verify columns: Date, Business, Amount, Currency, Invoice #, Status
7. Go to Business Analytics for a specific business
8. Click Export button
9. Open downloaded CSV
10. Verify only that business's invoices present
11. Test on mobile browser → verify share sheet opens (if supported)

**Validation Command**:
```bash
cd frontend
flutter pub add csv
flutter pub get
flutter analyze
```

---

### T005 [P0] Validate Currency Change Affects Analytics

**Goal**: Ensure currency change updates all analytics displays

**Files**:
- `frontend/lib/features/analytics/presentation/screens/analytics_screen.dart`
- `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
- `frontend/lib/core/providers/currency_provider.dart` (or similar)
- `frontend/lib/features/analytics/presentation/notifiers/analytics_notifier.dart`

**Changes Needed**:
1. Listen to currency change events
2. Trigger analytics data re-fetch when currency changes
3. Update all displayed amounts to new currency
4. Update chart labels and tooltips
5. Ensure KPIs recalculate in new currency

**Acceptance Criteria**:
- [ ] After currency change in Settings, analytics page updates
- [ ] All amounts display in new currency
- [ ] Charts update to show new currency
- [ ] KPIs recalculate correctly
- [ ] No page reload required
- [ ] Change persists after page reload

**Manual Test Steps**:
1. Go to Overall Analytics
2. Note current amounts (e.g., in ILS)
3. Go to Settings
4. Change currency to USD
5. Click Save
6. Go back to Overall Analytics
7. Verify all amounts now in USD
8. Verify charts show USD
9. Verify KPIs correct in USD
10. Reload page
11. Verify analytics still in USD

---

### T006 [P0] Reject Heavy Images with User-Friendly Error

**Goal**: Reject images >10MB during upload with clear error message

**Files**:
- `frontend/lib/features/invoices/presentation/widgets/upload_widget.dart` (or similar)
- `frontend/lib/features/invoices/data/repositories/invoice_repository.dart`

**Changes Needed**:
1. Add file size check before upload
2. Show specific error for oversized files: "File too large (max 10MB)"
3. Add loading indicator immediately on file select
4. Show progress indicator for large files
5. Add retry mechanism on failure

**Acceptance Criteria**:
- [ ] Files >10MB rejected immediately
- [ ] Error message: "File too large (max 10MB)"
- [ ] Error message user-friendly and actionable
- [ ] Loading indicator shows within 100ms of file selection
- [ ] Files ≤10MB upload successfully
- [ ] Progress indicator for files 5-10MB
- [ ] Network errors show specific message with retry

**Manual Test Steps**:
1. Go to Upload Invoice screen
2. Select file >10MB
3. Verify error message appears: "File too large (max 10MB)"
4. Select file 5-9MB
5. Verify progress indicator shows
6. Verify upload completes successfully
7. Select file <1MB
8. Verify loading indicator appears immediately
9. Verify upload completes

---

### T007 [P0] Show Demo Resources Message on Analytics Load

**Goal**: Inform users when analytics loading is due to demo resources

**Files**:
- `frontend/lib/features/analytics/presentation/screens/analytics_screen.dart`
- `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`

**Changes Needed**:
1. Detect when user has 0 invoices
2. Show banner: "ℹ️ Using demo resources - this may take a moment to load"
3. Show banner while analytics loading
4. Hide banner once real data loaded or user has invoices
5. Make banner dismissible

**Acceptance Criteria**:
- [ ] Banner shows when user has 0 invoices and analytics loading
- [ ] Banner text clear: "Using demo resources"
- [ ] Banner mentions possible slow load
- [ ] Banner disappears when data loads
- [ ] Banner doesn't show when user has real invoices
- [ ] Banner dismissible with X button

**Manual Test Steps**:
1. Use account with 0 invoices
2. Go to Overall Analytics
3. Verify banner shows: "Using demo resources"
4. Wait for data to load
5. Verify banner disappears when loaded
6. Upload an invoice
7. Go to Analytics
8. Verify banner does NOT show

---

## Phase 1: Mobile/Tablet & UX (P1)

**Purpose**: Fix responsive design, dialogs, buttons, and UI improvements  
**Gate**: Complete after Phase 0 passes

### T008 [P1] Fix App Background Color Independence

**Goal**: App background doesn't depend on browser/system dark mode

**Files**:
- `frontend/lib/main.dart`
- `frontend/lib/core/theme/app_theme.dart` (or similar)
- `frontend/web/index.html`

**Changes Needed**:
1. Set explicit background color in MaterialApp theme
2. Override system theme mode
3. Set `ThemeMode.light` or `ThemeMode.dark` explicitly
4. Ensure background color consistent across browsers

**Acceptance Criteria**:
- [ ] Background color same in light and dark mode browsers
- [ ] Background color doesn't change when system mode changes
- [ ] Background color consistent across Chrome, Firefox, Safari
- [ ] App maintains chosen theme regardless of system

**Manual Test Steps**:
1. Open app in Chrome with system in light mode
2. Note background color
3. Change system to dark mode
4. Reload app
5. Verify background color unchanged
6. Repeat in Firefox and Safari

**Validation Command**:
```bash
cd frontend
flutter analyze
flutter build web --release
```

---

### T009 [P1] Fix Mobile Responsiveness (Buttons/Charts Overflow)

**Goal**: No overflow errors on mobile; all content fits viewport

**Files**:
- `frontend/lib/features/home/presentation/screens/home_screen.dart`
- `frontend/lib/features/analytics/presentation/screens/analytics_screen.dart`
- `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
- `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart`
- `frontend/lib/shared/widgets/responsive_container.dart` (create if needed)

**Changes Needed**:
1. Test all screens at 320px, 375px, 768px widths
2. Fix all RenderFlex overflow errors
3. Wrap Row/Column with Flexible or Expanded where needed
4. Use SingleChildScrollView for long content
5. Replace fixed widths with flexible layouts
6. Ensure buttons ≥44x44px on mobile
7. Make charts responsive (fit screen width)

**Acceptance Criteria**:
- [ ] 0 RenderFlex overflow errors at 320px width
- [ ] 0 RenderFlex overflow errors at 375px width
- [ ] 0 RenderFlex overflow errors at 768px width
- [ ] All content fits viewport without horizontal scroll
- [ ] All buttons ≥44x44px on mobile
- [ ] Charts fit screen width on all breakpoints
- [ ] Touch targets easily tappable

**Manual Test Steps**:
1. Open DevTools, set viewport to 375px x 667px
2. Navigate to Home screen → verify no overflow
3. Navigate to Analytics → verify no overflow, charts fit
4. Navigate to Business Analytics → verify no overflow, charts fit
5. Navigate to Invoice Detail → verify no overflow
6. Navigate to Settings → verify no overflow
7. Repeat at 320px width (iPhone SE)
8. Repeat at 768px width (iPad Mini)
9. Check console for "RenderFlex overflow" errors

**Validation Command**:
```bash
cd frontend
flutter run -d chrome --dart-define=FLUTTER_WEB_USE_SKIA=false
# Resize browser to 375px, navigate all screens
```

---

### T010 [P1] Snackbar Auto-Dismiss and Manual Dismiss

**Goal**: All snackbars auto-dismiss after 5 seconds and can be dismissed manually

**Files**:
- `frontend/lib/shared/widgets/snackbar_utils.dart` (create)
- All screens that show snackbars (search for `ScaffoldMessenger.of(context).showSnackBar`)

**Changes Needed**:
1. Create snackbar utility:
   ```dart
   // lib/shared/widgets/snackbar_utils.dart
   void showSuccessSnackbar(BuildContext context, String message) {
     ScaffoldMessenger.of(context).showSnackBar(
       SnackBar(
         content: Text(message),
         backgroundColor: Colors.green,
         duration: const Duration(seconds: 5),
         action: SnackBarAction(
           label: 'Dismiss',
           textColor: Colors.white,
           onPressed: () {
             ScaffoldMessenger.of(context).hideCurrentSnackBar();
           },
         ),
         behavior: SnackBarBehavior.floating,
         dismissDirection: DismissDirection.horizontal,
       ),
     );
   }
   ```
2. Replace all `showSnackBar` calls with utility functions
3. Ensure 5-second duration everywhere
4. Add dismiss action to all snackbars
5. Allow swipe-to-dismiss (DismissDirection.horizontal)
6. Support tap-outside-to-dismiss (SnackBarBehavior.floating)

**Acceptance Criteria**:
- [ ] All snackbars auto-dismiss after 5 seconds ±500ms
- [ ] All snackbars have "Dismiss" action button
- [ ] Dismiss button closes snackbar immediately
- [ ] Snackbars can be swiped away
- [ ] Tapping outside snackbar dismisses it (floating behavior)
- [ ] Success snackbars are green
- [ ] Error snackbars are red
- [ ] Behavior consistent across entire app

**Manual Test Steps**:
1. Trigger success snackbar (e.g., save settings)
2. Start timer → verify dismisses at ~5 seconds
3. Trigger another success snackbar
4. Click "Dismiss" button → verify immediate close
5. Trigger error snackbar
6. Verify red color and dismiss button
7. Swipe snackbar → verify dismisses
8. Trigger snackbar, tap outside → verify dismisses

---

### T011 [P1] Home Empty State: Fix Button Layout

**Goal**: Remove add business icon, remove extra upload button; show only 2 centered buttons

**Files**:
- `frontend/lib/features/home/presentation/screens/home_screen.dart`

**Changes Needed**:
1. Identify empty state UI (when user has 0 businesses)
2. Remove floating action button (add business icon)
3. Remove bottom upload invoice button (if exists)
4. Show 2 centered buttons:
   - "Create Business" (primary)
   - "Upload Invoice" (secondary)
5. Center buttons vertically and horizontally
6. Use Column with MainAxisAlignment.center

**Acceptance Criteria**:
- [ ] Empty state shows 2 buttons only
- [ ] Buttons are centered horizontally
- [ ] Buttons are centered vertically
- [ ] "Create Business" button is primary (filled)
- [ ] "Upload Invoice" button is secondary (outlined)
- [ ] No floating action button visible
- [ ] No extra bottom button visible
- [ ] Layout looks clean and intentional

**Manual Test Steps**:
1. Delete all businesses and invoices (or use fresh account)
2. Go to Home screen
3. Verify only 2 centered buttons visible
4. Verify "Create Business" and "Upload Invoice" buttons
5. Verify no floating add icon
6. Verify no extra bottom upload button
7. Click "Create Business" → verify dialog opens
8. Click "Upload Invoice" → verify upload screen opens

---

### T012 [P1] Add/Edit Business Dialog: Include Monthly Limit

**Goal**: Monthly limit field required in add/edit business dialog

**Files**:
- `frontend/lib/features/home/presentation/screens/home_screen.dart` (dialog)
- `frontend/lib/features/vendors/domain/entities/vendor.dart` (add field if not exists)
- `backend/prisma/schema.prisma` (add field if not exists)
- Backend vendor service and controller

**Changes Needed**:
1. **Frontend**:
   - Add "Monthly Limit" text field to dialog
   - Mark field as required
   - Validate input is a number
   - Update create/edit API calls to include monthlyLimit

2. **Backend** (if needed):
   - Add `monthlyLimit Decimal?` to Vendor model in Prisma schema
   - Run migration
   - Update DTO to include monthlyLimit
   - Update service to save/update monthlyLimit

**Acceptance Criteria**:
- [ ] Add Business dialog includes "Monthly Limit" field
- [ ] Edit Business dialog includes "Monthly Limit" field with current value
- [ ] Field marked as required (validation on save)
- [ ] Field accepts only numbers
- [ ] Field shows currency symbol or label
- [ ] Saving without limit shows error
- [ ] Saving with valid limit succeeds
- [ ] Monthly limit persists and displays on edit

**Manual Test Steps**:
1. Click "Create Business" on home screen
2. Verify dialog includes "Monthly Limit" field
3. Fill name, leave limit empty
4. Click Save → verify validation error
5. Enter limit: 5000
6. Click Save → verify success
7. Edit same business
8. Verify limit shows 5000
9. Change limit to 6000
10. Save → verify success
11. Edit again → verify shows 6000

**Migration Command** (if schema changes):
```bash
cd backend
npx prisma migrate dev --name add_vendor_monthly_limit
```

---

### T013 [P1] Home with State: Center Upload Button

**Goal**: Remove add business icon, center floating upload invoice button

**Files**:
- `frontend/lib/features/home/presentation/screens/home_screen.dart`

**Changes Needed**:
1. Identify home screen UI when user has businesses
2. Remove floating add business icon (if exists)
3. Keep floating upload invoice button
4. Center the upload button horizontally
5. Use `FloatingActionButton` with `floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat`

**Acceptance Criteria**:
- [ ] No add business floating icon visible
- [ ] Upload invoice button visible
- [ ] Upload button centered at bottom
- [ ] Upload button not overlapping content
- [ ] Clicking upload button opens upload screen
- [ ] Layout consistent on all screen sizes

**Manual Test Steps**:
1. Ensure you have at least 1 business
2. Go to Home screen
3. Verify no add business icon visible
4. Verify upload invoice button centered at bottom
5. Verify button doesn't overlap business cards
6. Click upload button → verify upload screen opens
7. Test on mobile (375px) → verify button still centered

---

### T014 [P1] Remove Analytics Icon from App Bar

**Goal**: Remove analytics icon/button from app bar

**Files**:
- `frontend/lib/main.dart` (or wherever AppBar is defined)
- `frontend/lib/core/navigation/app_scaffold.dart` (if exists)

**Changes Needed**:
1. Find analytics icon in AppBar actions
2. Remove analytics icon
3. Ensure app bar looks clean
4. Analytics still accessible via navigation drawer or bottom nav

**Acceptance Criteria**:
- [ ] No analytics icon in app bar
- [ ] App bar looks clean
- [ ] Analytics still accessible via other navigation
- [ ] Change applies to all screens

**Manual Test Steps**:
1. Navigate to any screen
2. Check app bar
3. Verify no analytics icon visible
4. Open navigation drawer (if exists)
5. Verify analytics accessible from drawer
6. Navigate to analytics via drawer → verify works

---

### T015 [P1] Add Business Icon Button on Home

**Goal**: Add business icon/button on home screen app bar or visible location

**Files**:
- `frontend/lib/features/home/presentation/screens/home_screen.dart`

**Changes Needed**:
1. Add business icon button to home screen
2. Position: Either in app bar actions OR as a visible button near business list
3. Clicking button opens "Create Business" dialog
4. Use appropriate icon (e.g., Icons.business, Icons.add_business)

**Acceptance Criteria**:
- [ ] Business icon button visible on home screen
- [ ] Icon positioned appropriately (app bar or top of list)
- [ ] Clicking icon opens Create Business dialog
- [ ] Icon easily discoverable
- [ ] Icon has clear purpose (tooltip or label)

**Manual Test Steps**:
1. Go to Home screen
2. Verify business icon button visible
3. Click icon
4. Verify Create Business dialog opens
5. Fill dialog and save
6. Verify new business appears

---

### T016 [P1] Invoice Details: Remove "View Original File" Button

**Goal**: Remove the "View Original File" button from invoice detail screen

**Files**:
- `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart`

**Changes Needed**:
1. Find "View Original File" button
2. Remove button and associated logic
3. Ensure remaining UI looks clean

**Acceptance Criteria**:
- [ ] "View Original File" button not visible
- [ ] Invoice detail screen still displays all other information
- [ ] Layout looks clean without button
- [ ] No errors or warnings

**Manual Test Steps**:
1. Navigate to any invoice detail screen
2. Verify no "View Original File" button present
3. Verify all other invoice information displays correctly
4. Verify edit/delete buttons still work

---

### T017 [P1] Edit Line Items: Same UX as Edit Invoice

**Goal**: Edit line items uses same UX pattern as edit invoice name/number/date

**Files**:
- `frontend/lib/features/invoices/presentation/screens/edit_invoice_screen.dart` (or invoice_detail_screen.dart)
- `frontend/lib/features/invoices/presentation/widgets/line_item_editor.dart` (create if needed)

**Changes Needed**:
1. Create/update line item editing UI
2. Match UX pattern of invoice edit:
   - Same dialog style
   - Same button placement (Delete left, Cancel/Save right)
   - Same loading indicators
   - Same validation and error handling
3. Support add/edit/delete line items
4. Show loading state during save

**Acceptance Criteria**:
- [ ] Line item edit dialog matches invoice edit dialog style
- [ ] Delete button on left
- [ ] Cancel and Save buttons on right
- [ ] Loading indicator shows during save
- [ ] Validation errors clear and actionable
- [ ] Can add new line items
- [ ] Can edit existing line items
- [ ] Can delete line items
- [ ] Changes persist after save

**Manual Test Steps**:
1. Go to invoice detail screen
2. Click "Edit Line Items" (or similar)
3. Verify dialog opens with consistent style
4. Add a new line item
5. Fill: description, amount
6. Click Save → verify loading indicator
7. Verify success snackbar
8. Verify line item appears
9. Edit existing line item
10. Change amount → Save → verify updated
11. Delete line item → verify confirmation → confirm → verify removed

---

### T018 [P1] Dialogs on Mobile: Fix Positioning and Keyboard-Safe

**Goal**: Dialogs not pushed too high on mobile; scroll when keyboard appears

**Files**:
- `frontend/lib/shared/widgets/responsive_dialog.dart` (create utility)
- All screens with dialogs (home, invoice detail, settings, etc.)

**Changes Needed**:
1. Create responsive dialog utility:
   ```dart
   // lib/shared/widgets/responsive_dialog.dart
   Future<T?> showResponsiveDialog<T>({
     required BuildContext context,
     required Widget child,
   }) {
     return showDialog<T>(
       context: context,
       builder: (context) => Dialog(
         insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
         child: SingleChildScrollView(
           padding: EdgeInsets.only(
             bottom: MediaQuery.of(context).viewInsets.bottom,
           ),
           child: child,
         ),
       ),
     );
   }
   ```
2. Replace all `showDialog` calls with `showResponsiveDialog`
3. Wrap dialog content in `SingleChildScrollView`
4. Add padding for keyboard insets
5. Ensure Save button always reachable when keyboard open

**Acceptance Criteria**:
- [ ] Dialogs positioned correctly on mobile (not too high)
- [ ] Dialogs scroll when keyboard appears
- [ ] Save/Cancel buttons always reachable
- [ ] No content cut off by keyboard
- [ ] Dialogs work on 320px, 375px, 768px widths
- [ ] Consistent behavior across all dialogs

**Manual Test Steps**:
1. Set viewport to 375px x 667px
2. Open edit business dialog
3. Tap business name field → keyboard appears
4. Verify dialog scrolls if needed
5. Verify Save button still visible and reachable
6. Verify no content cut off
7. Repeat for edit invoice dialog
8. Repeat for settings dialogs
9. Test on real mobile device (iOS/Android browser)

---

### T019 [P1] All Dialogs: Immediate Loading Indicators

**Goal**: All save/delete actions in dialogs show loading indicator immediately until response

**Files**:
- All dialogs with save/delete actions:
  - `frontend/lib/features/home/presentation/screens/home_screen.dart` (business dialog)
  - `frontend/lib/features/invoices/presentation/screens/edit_invoice_screen.dart`
  - `frontend/lib/features/invoices/presentation/widgets/line_item_editor.dart`
  - `frontend/lib/features/settings/presentation/screens/settings_screen.dart`

**Changes Needed**:
1. Add loading state to dialog notifiers
2. Show loading indicator on buttons during actions:
   - Replace button text with CircularProgressIndicator
   - Disable button during loading
3. Show loading within 100ms of button click
4. Hide loading when response returns
5. Show success/error snackbar after loading

**Acceptance Criteria**:
- [ ] Save button shows loading spinner within 100ms of click
- [ ] Delete button shows loading spinner within 100ms of click
- [ ] Buttons disabled during loading (prevent double-click)
- [ ] Loading indicator visible until backend response
- [ ] Success snackbar shows after loading completes
- [ ] Error snackbar shows if request fails
- [ ] Consistent loading behavior across all dialogs

**Manual Test Steps**:
1. Open edit business dialog
2. Click Save → verify loading spinner appears immediately
3. Wait for response → verify spinner disappears
4. Verify success snackbar appears
5. Open edit invoice dialog
6. Click Delete → verify loading spinner
7. Confirm deletion → verify spinner during delete
8. Verify success snackbar after delete
9. Repeat for all dialogs with save/delete

---

## Phase 2: Analytics Improvements (P2)

**Purpose**: Improve analytics presentation, AI insights, and chart quality  
**Gate**: Complete after Phase 1 passes

### T020 [P2] AI Insights: Human-Friendly Language (No JSON)

**Goal**: AI insights show 3-5 clear, human-readable insights (no JSON)

**Files**:
- `frontend/lib/features/analytics/presentation/screens/analytics_screen.dart` (insights display)
- `frontend/lib/features/analytics/presentation/widgets/ai_insights_widget.dart` (create if needed)
- `backend/src/analytics/analytics.service.ts` (insights generation)
- Backend AI/LLM service (Ollama/Groq integration)

**Changes Needed**:
1. **Backend**:
   - Update AI prompt to request 3-5 bullet-point insights
   - Explicitly request human-friendly language
   - Request actionable recommendations
   - Parse LLM response to extract insights
   - Return array of insight strings (not JSON)

2. **Frontend**:
   - Display insights as bullet points
   - Add icons to insights (💡 for tips, ⚠️ for warnings, 📊 for trends)
   - Highlight key numbers
   - Show "Analyzing your spending..." loading state
   - Handle errors gracefully

**Acceptance Criteria**:
- [ ] AI insights show 3-5 bullet points
- [ ] Insights are clear and easy to understand
- [ ] Insights provide actionable recommendations
- [ ] Insights mention specific spending patterns
- [ ] Icons used for visual hierarchy
- [ ] Key numbers highlighted
- [ ] No JSON or technical jargon visible
- [ ] Loading state shown during analysis
- [ ] Error handling for failed insights

**Manual Test Steps**:
1. Go to Overall Analytics
2. Scroll to AI Insights section
3. Verify "Analyzing..." message while loading
4. Once loaded, verify 3-5 bullet points shown
5. Verify insights are clear and specific
6. Verify insights mention actual businesses/amounts
7. Verify insights provide recommendations
8. Verify icons present (💡, ⚠️, 📊)
9. Verify key numbers highlighted
10. Check no JSON visible

**Example Good Insights**:
- 💡 Your spending at "Coffee Shop" increased 25% this month
- ⚠️ You're approaching your monthly limit of ₪5,000 (currently at ₪4,200)
- 📊 Your top 3 expenses: Coffee Shop (₪1,500), Supermarket (₪1,200), Gas Station (₪800)

**Example Bad Insights** (avoid):
- `{"category": "Coffee", "amount": 1500}` ❌
- "You have some invoices" ❌ (too vague)
- "Data shows patterns" ❌ (not actionable)

---

### T021 [P2] All Line Charts: Responsive with Visible Axes

**Goal**: All charts responsive, axes visible, fit screen on all breakpoints

**Files**:
- `frontend/lib/features/analytics/presentation/screens/analytics_screen.dart`
- `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
- `frontend/lib/shared/widgets/responsive_chart.dart` (create utility if needed)

**Changes Needed**:
1. Make charts responsive:
   - Mobile (320-599px): Chart width = screen width - 32px
   - Tablet (600-1023px): Chart width = 80% of screen width
   - Desktop (1024px+): Chart width = 600px max
2. Ensure X-axis visible and readable:
   - Labels don't overlap
   - Use abbreviated labels on mobile (Jan, Feb vs January, February)
   - Rotate labels if needed
3. Ensure Y-axis visible and readable:
   - Labels don't overflow
   - Use K/M abbreviations for large numbers (5K, 1.2M)
4. Add padding around charts
5. Ensure charts don't cause horizontal scroll

**Acceptance Criteria**:
- [ ] Charts render without overflow at all breakpoints
- [ ] X-axis labels visible and readable at 320px
- [ ] Y-axis labels visible and readable at 320px
- [ ] Labels don't overlap at any breakpoint
- [ ] Charts scale appropriately (mobile/tablet/desktop)
- [ ] No horizontal scrolling required
- [ ] Chart data points touchable/clickable
- [ ] Tooltips show on hover/tap

**Manual Test Steps**:
1. Set viewport to 320px x 568px
2. Go to Overall Analytics
3. Scroll to chart
4. Verify chart fits width without overflow
5. Verify X-axis labels visible and readable
6. Verify Y-axis labels visible and readable
7. Verify no label overlap
8. Increase viewport to 375px → verify still visible
9. Increase to 768px → verify chart scales appropriately
10. Increase to 1920px → verify chart not too wide
11. Repeat for Business Analytics charts

**Validation Command**:
```bash
cd frontend
flutter run -d chrome
# Resize browser to test all breakpoints
```

---

## Final Tasks

### T022 [All Phases] Continuous Validation

**Goal**: Run validation commands after each task completion

**Validation Commands**:

**Frontend**:
```bash
cd frontend
flutter analyze                    # Must show 0 errors
flutter build web --release        # Must complete successfully
```

**Backend** (if changes):
```bash
cd backend
npm run build                      # Must complete
npx prisma validate               # Must pass (if schema changed)
```

**Manual Testing Checklist** (Run after each phase):
- [ ] Navigate entire app without crashes
- [ ] No errors in browser console
- [ ] All features work as expected
- [ ] Responsive on mobile/tablet/desktop
- [ ] All snackbars appear and auto-dismiss
- [ ] All dialogs positioned correctly
- [ ] All loading indicators work

---

### T023 [Final] Spec Compliance Checklist

**Goal**: Verify all 20 requirements implemented correctly

**Checklist**:

**P0 Critical Fixes**:
- [ ] T001: Runtime type error fixed (no "minified:y0" errors)
- [ ] T002: Password validation 8+ chars everywhere
- [ ] T003: Profile settings (name + currency) work end-to-end
- [ ] T004: Export/share/download flows work
- [ ] T005: Currency change affects analytics
- [ ] T006: Heavy images rejected with friendly error
- [ ] T007: Demo resources message shows on analytics load

**P1 Mobile/Tablet & UX**:
- [ ] T008: App background color independent of browser mode
- [ ] T009: Mobile responsiveness (no overflow)
- [ ] T010: Snackbar auto-dismiss + manual dismiss
- [ ] T011: Home empty state (2 centered buttons)
- [ ] T012: Business dialog includes monthly limit
- [ ] T013: Home with state (centered upload button)
- [ ] T014: Analytics icon removed from app bar
- [ ] T015: Business icon button on home
- [ ] T016: "View original file" button removed
- [ ] T017: Edit line items same UX as edit invoice
- [ ] T018: Dialogs keyboard-safe on mobile
- [ ] T019: All dialogs show immediate loading

**P2 Analytics**:
- [ ] T020: AI insights human-friendly (3-5 clear insights)
- [ ] T021: Charts responsive with visible axes

**Acceptance Criteria Validation**:
- [ ] All tasks have acceptance criteria met
- [ ] All manual test steps completed
- [ ] All validation commands passed
- [ ] No regressions introduced
- [ ] Full user journey works end-to-end

---

## Implementation Strategy

### Execution Order

1. **Phase 0 (P0)**: Complete all P0 tasks sequentially (T001-T007)
2. **Phase 0 Gate**: Run validation, ensure all P0 acceptance criteria met
3. **Phase 1 (P1)**: Complete all P1 tasks (T008-T019)
   - Can parallelize independent tasks (e.g., T008 and T011)
4. **Phase 1 Gate**: Run validation, ensure all P1 acceptance criteria met
5. **Phase 2 (P2)**: Complete all P2 tasks (T020-T021)
6. **Phase 2 Gate**: Run validation, ensure all P2 acceptance criteria met
7. **Final Validation**: Complete T022 and T023

### Commit Strategy

- One commit per task or small task group
- Commit message format:
  ```
  [T###] [P#] Brief description
  
  - Change 1
  - Change 2
  
  Acceptance Criteria:
  - [x] Criterion 1
  - [x] Criterion 2
  
  Manual Test:
  1. Step 1
  2. Step 2
  ```

### Testing Strategy

**After Each Task**:
1. Run `flutter analyze` (frontend) or `npm run build` (backend)
2. Run manual test steps from task
3. Check acceptance criteria
4. If all pass → commit
5. If any fail → fix and retest

**After Each Phase**:
1. Run full validation commands
2. Complete phase gate checklist
3. Test all features from previous phases (regression)
4. If all pass → proceed to next phase
5. If any fail → identify and fix broken item

---

## Dependencies & Parallelization

### Task Dependencies

**Sequential (must complete in order)**:
- P0 must complete before P1
- P1 must complete before P2
- T003 should complete before T005 (currency validation)

**Parallelizable (can work simultaneously)**:
- T008, T009, T010 (different areas of codebase)
- T011, T012, T013 (different UI components)
- T014, T015, T016 (different screens)
- T020, T021 (different analytics components)

---

## Success Metrics

**Completion Criteria**:
- All 22 tasks completed
- All acceptance criteria met
- All manual test steps passed
- All validation commands successful
- 0 errors in `flutter analyze`
- 0 errors in browser console
- Full user journey works on mobile/tablet/desktop

**Target Metrics**:
- 0 runtime type errors
- 0 RenderFlex overflow errors
- 100% snackbars auto-dismiss correctly
- 100% dialogs keyboard-safe
- All charts responsive on all breakpoints
- 3-5 clear AI insights (no JSON)

---

## Status

**Tasks Status**: ✅ **READY FOR IMPLEMENTATION**

**Next Steps**:
1. Start with Phase 0 (P0) tasks
2. Complete T001 (runtime type error)
3. Continue sequentially through P0
4. Pass Phase 0 gate before starting P1
5. Document progress in commits

**Timeline**: 7-10 days for all 3 phases

---

**Generated**: 2026-01-21  
**Status**: Implementation Ready ✅  
**Total Tasks**: 22 (20 feature + 2 validation/compliance)
