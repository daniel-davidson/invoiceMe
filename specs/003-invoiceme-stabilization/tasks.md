# Tasks: InvoiceMe Stabilization (20 Items)

**Feature**: 003-invoiceme-stabilization  
**Date**: 2026-01-21  
**Status**: Active Implementation

**Source of Truth**: [SCOPE_LOCK.md](./SCOPE_LOCK.md)

---

## Overview

This task list contains EXACTLY 20 tasks (I01-I20) mapping 1:1 to the 20 scope items defined in SCOPE_LOCK.md. Each task must be implemented and verified before marking complete.

**Total Tasks**: 20  
**Format**: I01..I20 (item-based, not phased)  
**All Tasks Unchecked**: Ready for implementation

---

## The 20 Tasks

### I01: Fix App Background Color

- [x] **I01**: Set Flutter theme to always use light mode regardless of system settings

**What to Change**:
- Update `frontend/lib/main.dart`
- Change `themeMode: ThemeMode.system` to `themeMode: ThemeMode.light`

**Files**:
- `frontend/lib/main.dart`

**Acceptance Criteria**:
- [ ] App background is light even with browser dark mode enabled
- [ ] App background is light even with OS dark mode enabled
- [ ] Theme is consistent across all pages

**Test Steps**:
- **Mobile**: Enable iOS dark mode → Open app → Verify light background
- **Web**: Enable browser dark mode (Chrome, Safari, Firefox) → Open app → Verify light background

**Automated Validation**:
```bash
cd frontend && flutter analyze
cd frontend && flutter build web
```

---

### I02: Fix Responsive Layout (Mobile)

- [ ] **I02**: Make all UI elements responsive - no overflow on mobile, charts fit screen with visible axes

**What to Change**:
- Wrap all charts in `LayoutBuilder` for dynamic sizing
- Use `Expanded`/`Flexible` for button rows to prevent overflow
- Add `SingleChildScrollView` where needed (vertical only)
- Test at 375px, 768px, 1440px

**Files**:
- `frontend/lib/features/analytics/presentation/screens/overall_analytics_screen.dart`
- `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
- `frontend/lib/features/invoices/presentation/screens/invoices_list_screen.dart`
- `frontend/lib/features/home/presentation/screens/home_screen.dart`
- Any other screens with charts or button rows

**Acceptance Criteria**:
- [ ] No horizontal scrolling on any screen at 375px width
- [ ] All buttons visible and tappable on mobile
- [ ] Charts fit within screen with visible axes
- [ ] Console shows 0 `RenderFlex overflowed` errors

**Test Steps**:
- **Mobile (375px)**: Navigate to every screen → Verify no overflow → View analytics → Charts fit with axes visible → Click all buttons → All tappable
- **Tablet (768px)**: Same verification
- **Web (1440px)**: Verify no layout regressions → Resize window → Content reflows properly

**Automated Validation**:
```bash
cd frontend && flutter analyze  # Must show 0 overflow errors
cd frontend && flutter build web
```

---

### I03: Fix Password Validation Mismatch

- [x] **I03**: Align password validation to 8 characters minimum with consistent error messaging

**What to Change**:
- Create `frontend/lib/core/constants/validation_constants.dart` with:
  ```dart
  const int minPasswordLength = 8;
  const String passwordRequirementMessage = 'Password must be at least 8 characters';
  ```
- Update `frontend/lib/features/auth/presentation/screens/signup_screen.dart` validator to use constant
- Update any password-related messaging to reference constant

**Files**:
- `frontend/lib/core/constants/validation_constants.dart` (NEW)
- `frontend/lib/features/auth/presentation/screens/signup_screen.dart`

**Acceptance Criteria**:
- [ ] 7-char password shows error: "Password must be at least 8 characters"
- [ ] 8-char password is accepted
- [ ] Consistent messaging across all auth screens

**Test Steps**:
- **Mobile**: Signup with 6-char password → Verify error → Signup with 7-char → Verify error → Signup with 8-char → Verify no error, form submits
- **Web**: Same test on desktop Chrome

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I04: Snackbar Auto-Dismiss + Manual Dismiss

- [x] **I04**: Implement standard snackbar behavior - auto-dismiss after 5 seconds with manual dismiss options

**What to Change**:
- Create `frontend/lib/shared/utils/snackbar_utils.dart` with:
  - `showSuccess()` method (green, 5s duration, "Dismiss" button, floating, swipeable)
  - `showError()` method (red, 5s duration, "Dismiss" or "Retry" button, floating, swipeable)
  - `showInfo()` method (blue, 5s duration, "Dismiss" button, floating, swipeable)
- Replace all existing snackbar code in screens with `SnackbarUtils` calls
- Set `behavior: SnackBarBehavior.floating` and `dismissDirection: DismissDirection.horizontal`

**Files**:
- `frontend/lib/shared/utils/snackbar_utils.dart` (NEW)
- `frontend/lib/features/home/presentation/screens/home_screen.dart`
- `frontend/lib/features/settings/presentation/screens/settings_screen.dart`
- `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart`
- `frontend/lib/features/invoices/presentation/screens/invoices_list_screen.dart`
- `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
- `frontend/lib/features/analytics/presentation/screens/overall_analytics_screen.dart`
- Any other screens with snackbars

**Acceptance Criteria**:
- [ ] Snackbars auto-dismiss after 5 seconds
- [ ] "Dismiss" button immediately closes snackbar
- [ ] Tap outside snackbar dismisses it
- [ ] Swipe gesture dismisses snackbar
- [ ] Success = green, Error = red, Info = blue

**Test Steps**:
- **Mobile**: Save business → Green snackbar appears → Wait 5 sec → Auto-dismisses
- **Mobile**: Save again → Tap "Dismiss" → Immediately closes
- **Mobile**: Perform action → Snackbar shows → Tap outside → Dismisses
- **Mobile**: Perform action → Snackbar shows → Swipe → Dismisses
- **Web**: Repeat all tests on desktop

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I05: Fix Home Empty State

- [ ] **I05**: Clean up home screen empty state - show exactly 2 centered buttons, remove duplicates

**What to Change**:
- In `frontend/lib/features/home/presentation/screens/home_screen.dart`, when `vendors.isEmpty`:
  - Set `floatingActionButton: null` (no floating button in empty state)
  - Remove add business icon from app bar in empty state
- Verify `frontend/lib/features/home/presentation/widgets/empty_state.dart` shows exactly 2 centered buttons:
  - "Add Business" (primary style)
  - "Upload Invoice" (secondary or outlined style)

**Files**:
- `frontend/lib/features/home/presentation/screens/home_screen.dart`
- `frontend/lib/features/home/presentation/widgets/empty_state.dart` (verify only)

**Acceptance Criteria**:
- [ ] Empty state shows exactly 2 centered buttons (vertically stacked)
- [ ] No add business icon in app bar when empty
- [ ] No floating button at bottom when empty

**Test Steps**:
- **Mobile**: Delete all businesses → Home screen → Count buttons → Should be exactly 2 → Verify buttons centered → Check app bar → No add business icon → Check bottom → No floating button
- **Web**: Repeat test on desktop

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I06: Add Monthly Limit to Business Dialog

- [ ] **I06**: Add monthly limit input field to add/edit business dialogs with validation

**What to Change**:
- In `frontend/lib/features/home/presentation/screens/home_screen.dart`:
  - In `_showAddVendorDialog()`: Add `TextEditingController` for monthly limit, add `TextField` with `keyboardType: TextInputType.number`, add validator (required, positive number), update `addVendor()` call to include `monthlyLimit`
  - In `_showEditVendorDialog()`: Pre-fill monthly limit from vendor data, same validation, update `updateVendor()` call
- Check backend: Verify `backend/prisma/schema.prisma` has `Vendor.monthlyLimit` field (add if missing: `monthlyLimit Decimal?`)

**Files**:
- `frontend/lib/features/home/presentation/screens/home_screen.dart`
- `backend/prisma/schema.prisma` (check only, add field if missing)

**Acceptance Criteria**:
- [ ] Add business dialog has "Monthly Limit" field
- [ ] Field is required (blocks save if empty)
- [ ] Field accepts only positive numbers
- [ ] Edit dialog pre-fills existing limit
- [ ] Limit saves successfully to backend

**Test Steps**:
- **Mobile**: Add business → Verify monthly limit field present → Try save without limit → Verify validation error → Enter -100 → Verify error → Enter 5000 → Save succeeds
- **Mobile**: Edit business → Verify limit pre-filled → Update limit → Save succeeds
- **Web**: Repeat all tests on desktop

**Automated Validation**:
```bash
cd frontend && flutter analyze
cd backend && npx prisma validate  # If schema changed
```

---

### I07: Fix Home Screen With Businesses

- [ ] **I07**: Center the floating upload invoice button, remove duplicate add business icon

**What to Change**:
- In `frontend/lib/features/home/presentation/screens/home_screen.dart`, when `vendors.isNotEmpty`:
  - Set `floatingActionButton: FloatingActionButton.extended` with label "Upload Invoice"
  - Set `floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat`
  - Remove any separate add business floating button

**Files**:
- `frontend/lib/features/home/presentation/screens/home_screen.dart`

**Acceptance Criteria**:
- [ ] No add business icon button when businesses exist
- [ ] Single centered "Upload Invoice" floating button at bottom center
- [ ] Button is properly centered (not full width)

**Test Steps**:
- **Mobile**: Add business → Home → Verify single "Upload Invoice" button centered at bottom → Verify no duplicate add business button
- **Web**: Same verification on desktop

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I08: Update App Bar Icons

- [ ] **I08**: Remove analytics icon from app bar, add business icon on home screen

**What to Change**:
- In `frontend/lib/features/home/presentation/screens/home_screen.dart`:
  - Remove `IconButton(Icons.analytics_outlined)` from app bar (analytics already exists near search)
  - Add `IconButton(Icons.business)` to app bar that calls `_showAddVendorDialog`

**Files**:
- `frontend/lib/features/home/presentation/screens/home_screen.dart`

**Acceptance Criteria**:
- [ ] No analytics icon in app bar on home screen
- [ ] Business icon present in app bar on home screen
- [ ] Clicking business icon opens add business dialog

**Test Steps**:
- **Mobile**: Home → Check app bar icons → Verify no analytics icon → Verify business icon present → Tap business icon → Add business dialog opens
- **Web**: Repeat test on desktop

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I09: Remove View Original File Button

- [x] **I09**: Remove non-functional "View Original File" button from invoice details screen

**What to Change**:
- In `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart`:
  - Locate `OutlinedButton` with "View Original File" text (around lines 324-333)
  - Remove entire button widget

**Files**:
- `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart`

**Acceptance Criteria**:
- [ ] Invoice details screen has no "View Original File" button
- [ ] Only edit and delete buttons remain

**Test Steps**:
- **Mobile**: Open invoice details → Verify no "View Original File" button → Verify edit and delete buttons work
- **Web**: Repeat test on desktop

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I10: Fix Line Items Edit Behavior

- [ ] **I10**: Make line items edit consistent with other invoice field edit patterns

**What to Change**:
- In `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart`:
  - Ensure line items edit uses same dialog pattern as invoice name/number/date edits
  - Add loading indicator to save button (using `CircularProgressIndicator`)
  - Show success/error snackbar after save (using `SnackbarUtils`)
  - Add validation for line item fields

**Files**:
- `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart`

**Acceptance Criteria**:
- [ ] Line items edit dialog matches other edit dialog patterns
- [ ] Save button shows loading indicator during save
- [ ] Success snackbar appears after successful save
- [ ] Validation errors shown clearly

**Test Steps**:
- **Mobile**: Edit line items → Verify dialog pattern consistent with invoice name edit → Save → Verify loading indicator → Verify success snackbar
- **Web**: Repeat test on desktop

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I11: Fix Profile Settings (Name + Currency)

- [ ] **I11**: Fix profile settings functionality - make name and currency changes work end-to-end

**What to Change**:
- Update `frontend/lib/features/settings/presentation/screens/settings_screen.dart`:
  - Edit name dialog: Wrap in `Consumer` widget, add `barrierDismissible: !isLoading`, show `CircularProgressIndicator` in save button during loading, add `ref.listen` for success/error snackbars, disable TextField and buttons during loading
  - Currency picker: Wrap `onSelect` in try-catch, show success snackbar (green), show error snackbar (red) with "Retry"
- Update `frontend/lib/features/settings/presentation/providers/settings_provider.dart`:
  - In `updateName()`: Add `rethrow` to propagate errors to UI
  - In `updateCurrency()`: Add `rethrow` and provider invalidation:
    ```dart
    await _apiClient.patch('/users/me', data: {'systemCurrency': currencyCode});
    _ref.invalidate(authStateProvider);
    _ref.invalidate(overallAnalyticsProvider);
    _ref.invalidate(invoicesProvider);
    ```

**Files**:
- `frontend/lib/features/settings/presentation/screens/settings_screen.dart`
- `frontend/lib/features/settings/presentation/providers/settings_provider.dart`

**Acceptance Criteria**:
- [ ] Name change saves and updates everywhere
- [ ] Currency change saves and updates everywhere
- [ ] Analytics refresh after currency change (< 2 seconds)
- [ ] Loading states visible during save operations
- [ ] Success/error snackbars shown appropriately

**Test Steps**:
- **Mobile**: Settings → Edit name → Enter new name → Save → Verify loading indicator → Verify success snackbar → Check display in profile → Name updated
- **Mobile**: Settings → Edit currency → Change to EUR → Save → Navigate to analytics → Verify EUR appears < 2 sec → Check invoices → Verify normalized amounts in EUR → Check charts → Verify € symbol on Y-axis
- **Mobile**: Test error: Disconnect network → Try save → Verify error with "Retry" option
- **Web**: Repeat all tests on desktop

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I12: Fix Mobile Dialog Positioning (Keyboard-Safe)

- [ ] **I12**: Make dialogs keyboard-safe on mobile - stay accessible when keyboard appears

**What to Change**:
- Update all dialogs to wrap content in `SingleChildScrollView`:
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

**Files**:
- `frontend/lib/features/home/presentation/screens/home_screen.dart` (add/edit business dialogs)
- `frontend/lib/features/settings/presentation/screens/settings_screen.dart` (edit name dialog)
- `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart` (edit dialogs)
- `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart` (if applicable)
- Any other dialogs

**Acceptance Criteria**:
- [ ] Dialogs remain on screen when keyboard appears
- [ ] Dialog content is scrollable with keyboard visible
- [ ] Action buttons accessible via scrolling
- [ ] Keyboard dismisses without closing dialog

**Test Steps**:
- **Mobile (actual device or simulator)**: Open add business dialog → Tap text field → Keyboard appears → Verify dialog still visible → Scroll → Verify can reach buttons → Tap outside keyboard → Keyboard dismisses, dialog stays open
- **Tablet**: Same verification

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I13: Implement CSV Export Functionality

- [x] **I13**: Implement working CSV export from invoices and analytics screens

**What to Change**:
- Add to `frontend/pubspec.yaml`: `csv: ^6.0.0`
- Create `frontend/lib/core/utils/export_utils.dart` with:
  - `generateInvoicesCsv(List<Invoice>)` → CSV string
  - `downloadCsv(String csvContent, String filename)` using `dart:html` Blob
  - `generateFilename(String prefix, {String? businessName})` with date
- Update `frontend/lib/features/invoices/presentation/providers/invoices_provider.dart`: Add `exportCsv()` method using `ExportUtils`
- Update `frontend/lib/features/invoices/presentation/screens/invoices_list_screen.dart`: Wire export button to provider
- Update `frontend/lib/features/vendors/presentation/providers/vendor_analytics_provider.dart`: Add `exportCsv()` method
- Update `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`: Wire export button

**Files**:
- `frontend/pubspec.yaml` (add csv package)
- `frontend/lib/core/utils/export_utils.dart` (NEW)
- `frontend/lib/features/invoices/presentation/providers/invoices_provider.dart`
- `frontend/lib/features/invoices/presentation/screens/invoices_list_screen.dart`
- `frontend/lib/features/vendors/presentation/providers/vendor_analytics_provider.dart`
- `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`

**Acceptance Criteria**:
- [ ] Export button on all invoices downloads CSV file
- [ ] CSV contains headers: Date, Business, Amount, Currency, Invoice #, Status
- [ ] Export from vendor analytics downloads vendor-specific CSV
- [ ] Success snackbar after download
- [ ] Error message if no data to export: "No invoices to export"

**Test Steps**:
- **Mobile**: All invoices screen → Click export → Verify CSV downloads → Open CSV → Verify headers and data correct
- **Mobile**: Vendor analytics → Click export → Verify vendor-specific CSV downloads
- **Mobile**: With 0 invoices → Click export → Verify error message
- **Web**: Repeat all tests → Check Downloads folder → Open CSV in Excel/Sheets → Verify formatting

**Automated Validation**:
```bash
cd frontend && flutter pub get  # Install csv package
cd frontend && flutter analyze
cd frontend && flutter build web
```

---

### I14: Fix Type Error in All Invoices Screen

- [x] **I14**: Fix runtime type error: type 'minified:y0' is not a subtype of type 'String'

**What to Change**:
- In `frontend/lib/features/invoices/presentation/providers/invoices_provider.dart`:
  - Add `_parseString()` static helper method to `Invoice` class:
    ```dart
    static String _parseString(dynamic value, String? defaultValue) {
      if (value == null) return defaultValue ?? '';
      if (value is String) return value;
      return value.toString();
    }
    ```
  - Update `Invoice.fromJson()` to use safe parsing for all string fields:
    ```dart
    id: _parseString(json['id'], 'unknown-id'),
    vendorName: _parseString(json['vendor']?['name'], 'Unknown'),
    originalCurrency: _parseString(json['originalCurrency'], 'USD'),
    invoiceNumber: json['invoiceNumber'] != null 
      ? _parseString(json['invoiceNumber'], null) 
      : null,
    // ... other fields with safe parsing
    ```

**Files**:
- `frontend/lib/features/invoices/presentation/providers/invoices_provider.dart`

**Acceptance Criteria**:
- [ ] All invoices screen loads without errors
- [ ] Console shows 0 type errors
- [ ] All invoice fields display correctly
- [ ] Fields with unexpected types show fallback values (e.g., "Unknown" for vendor)

**Test Steps**:
- **Mobile**: Open Chrome DevTools console (F12) → Navigate to "All Invoices" screen → Verify console shows 0 errors → Scroll through invoice list → All data displays → Click on invoices → Details open without errors
- **Web**: Open DevTools console → Navigate to all invoices → Verify 0 errors → Test with various invoices

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I15: Validate Currency Change Propagation

- [ ] **I15**: Ensure currency changes immediately propagate to all displays (analytics, invoices, charts)

**What to Change**:
- In `frontend/lib/features/settings/presentation/providers/settings_provider.dart`:
  - In `updateCurrency()` method, after successful API call, add:
    ```dart
    await _apiClient.patch('/users/me', data: {'systemCurrency': currencyCode});
    _ref.invalidate(authStateProvider);
    _ref.invalidate(overallAnalyticsProvider);  // Add this
    _ref.invalidate(invoicesProvider);          // Add this
    state = const AsyncValue.data(null);
    ```
  - Add necessary imports: `overall_analytics_provider.dart`, `invoices_provider.dart`

**Files**:
- `frontend/lib/features/settings/presentation/providers/settings_provider.dart`

**Acceptance Criteria**:
- [ ] Currency change in settings triggers analytics refresh
- [ ] Analytics KPIs show new currency within 2 seconds
- [ ] Invoice list shows updated normalized amounts in new currency
- [ ] Chart Y-axis labels show correct currency symbol (e.g., $, €, ₪)
- [ ] All updates happen consistently

**Test Steps**:
- **Mobile**: Note current currency (e.g., USD) → Navigate to analytics → Note KPI values → Settings → Change currency to EUR → Save → Navigate back to analytics → Verify values updated to EUR < 2 seconds → Navigate to invoices → Verify amounts show EUR → View charts → Verify € symbol on Y-axis → Change back to USD → Verify all update again
- **Web**: Repeat all tests on desktop

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I16: Validate Image File Size (Reject Heavy Images)

- [x] **I16**: Add file size validation before upload - reject images > 10MB with clear error message

**What to Change**:
- In `frontend/lib/features/home/presentation/providers/home_provider.dart`:
  - In `uploadFromGallery()` and `uploadPdf()` methods, add size check:
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

**Files**:
- `frontend/lib/features/home/presentation/providers/home_provider.dart`

**Acceptance Criteria**:
- [ ] Files ≤ 10MB upload normally
- [ ] Files > 10MB show error: "File too large (max 10MB). Selected file: X.XMB"
- [ ] User can select different file after rejection

**Test Steps**:
- **Mobile**: Select 5MB image → Verify upload proceeds → Select 15MB image → Verify error message with actual file size → Select 8MB image → Verify upload proceeds
- **Web**: Repeat all tests on desktop

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I17: Add Analytics Loading Message (Demo Resources)

- [ ] **I17**: Show message explaining slow loading due to demo resources when analytics screen has 0 invoices

**What to Change**:
- In `frontend/lib/features/analytics/presentation/screens/overall_analytics_screen.dart`:
  - Add conditional info card at top when `invoiceCount == 0`:
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

**Files**:
- `frontend/lib/features/analytics/presentation/screens/overall_analytics_screen.dart`

**Acceptance Criteria**:
- [ ] Message visible when `invoiceCount == 0`
- [ ] Message explains demo resource limits clearly
- [ ] Message disappears after uploading first invoice

**Test Steps**:
- **Mobile**: With no invoices → Navigate to analytics → Verify message shows → Upload invoice → Navigate to analytics → Verify message gone
- **Web**: Repeat test on desktop

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I18: Add Loading Indicators to All Dialogs

- [ ] **I18**: Show immediate loading feedback in all add/edit/delete dialogs during save operations

**What to Change**:
- For each dialog in the following files, wrap in `Consumer` widget and add loading states:
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
  - Set `barrierDismissible: !isLoading` to prevent dismissing during save

**Files**:
- `frontend/lib/features/home/presentation/screens/home_screen.dart` (add/edit business, delete dialogs)
- `frontend/lib/features/settings/presentation/screens/settings_screen.dart` (edit name, currency dialogs)
- `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart` (edit invoice, line items, delete dialogs)
- `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart` (if applicable)

**Acceptance Criteria**:
- [ ] All save buttons show loading indicator immediately on click
- [ ] Delete buttons show loading indicator during operation
- [ ] All buttons disabled during loading
- [ ] Dialog cannot be dismissed during loading

**Test Steps**:
- **Mobile**: Add business → Click save → Verify immediate loading indicator → Verify buttons disabled → Edit business → Click save → Verify loading → Delete business → Click confirm → Verify loading on delete button → Try tap outside during loading → Dialog stays open
- **Web**: Repeat all tests on desktop

**Automated Validation**:
```bash
cd frontend && flutter analyze
```

---

### I19: Improve AI Insights Copy (Plain Language)

- [ ] **I19**: Make AI insights screen show 3-5 plain language sentences instead of JSON or technical language

**What to Change**:
- Update `frontend/lib/features/insights/presentation/screens/insights_screen.dart`:
  - Update AI prompt to request "3-5 short, friendly sentences" (if prompt is in frontend)
  - Parse response as plain text (split by newlines, not JSON)
  - Display in simple list format with icons (e.g., bullet points or numbered list)
- If backend prompt needs updating:
  - Update `backend/src/insights/insights.service.ts` prompt to request plain language output

**Files**:
- `frontend/lib/features/insights/presentation/screens/insights_screen.dart`
- `backend/src/insights/insights.service.ts` (optional, if prompt is backend-side)

**Acceptance Criteria**:
- [ ] Insights screen shows 3-5 readable sentences
- [ ] No JSON visible to user
- [ ] No technical jargon or code-like output
- [ ] Non-technical users can understand insights

**Test Steps**:
- **Mobile**: Open insights screen → Count insights → Should be 3-5 sentences → Read each → Plain English, no JSON → Ask non-technical person → They understand meaning
- **Web**: Repeat test on desktop

**Automated Validation**:
```bash
cd frontend && flutter analyze
cd backend && npm run build  # If backend changed
```

---

### I20: Make Charts Responsive with Visible Axes

- [ ] **I20**: Ensure all line charts are responsive with visible X and Y axes at all screen sizes

**What to Change**:
- For all chart screens, wrap charts in `LayoutBuilder` and configure axes:
  ```dart
  LayoutBuilder(
    builder: (context, constraints) {
      return SizedBox(
        width: constraints.maxWidth - 32, // Minus padding
        height: 300,
        child: LineChart(
          LineChartData(
            titlesData: FlTitlesData(
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 40,
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
                  reservedSize: 30,
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
          ),
        ),
      );
    },
  )
  ```

**Files**:
- `frontend/lib/features/analytics/presentation/screens/overall_analytics_screen.dart`
- `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
- Any other screens with line charts

**Acceptance Criteria**:
- [ ] Charts fit within container on all devices
- [ ] X-axis labels visible and readable at all screen sizes
- [ ] Y-axis labels visible and readable at all screen sizes
- [ ] No axis label overlap

**Test Steps**:
- **Mobile (375px)**: View analytics charts → Verify X-axis labels visible → Verify Y-axis labels visible → No overlap
- **Tablet (768px)**: Same verification
- **Desktop (1440px)**: Same verification → Resize window → Charts respond smoothly

**Automated Validation**:
```bash
cd frontend && flutter analyze
cd frontend && flutter build web
```

---

## Execution Notes

### Safe Execution Order

**Recommended Approach**: Implement in priority phases to minimize regressions

#### Phase P0: Critical (5 items)
**Execute First** - Fixes broken core functionality
- I03 (Password validation)
- I11 (Profile settings)
- I13 (Export functionality)
- I14 (Type error fix)
- I15 (Currency validation)

**Why First**: These fix critical bugs that prevent users from completing essential tasks

**Validation After P0**:
```bash
cd frontend && flutter analyze  # Must pass: 0 errors
cd frontend && flutter build web  # Must succeed
```
Manual test: Signup, change profile, change currency, view all invoices, export CSV

---

#### Phase P1: UX Improvements (8 items)
**Execute Second** - Improves user experience and consistency
- I04 (Snackbar auto-dismiss)
- I05 (Home empty state)
- I06 (Monthly limit field)
- I07 (Home with businesses)
- I08 (App bar icons)
- I09 (Remove view file button)
- I10 (Line items edit)
- I18 (Dialog loading indicators)

**Why Second**: Improves UX but doesn't break existing functionality

**Validation After P1**:
```bash
cd frontend && flutter analyze
cd frontend && flutter build web
```
Manual test: All P0 items still work + all P1 items work

---

#### Phase P2: Responsiveness & Polish (7 items)
**Execute Last** - Makes app responsive and polished
- I01 (App background color)
- I02 (Responsive layout)
- I12 (Mobile dialog positioning)
- I16 (File size validation)
- I17 (Analytics loading message)
- I19 (AI insights)
- I20 (Charts responsive)

**Why Last**: These are polish items that don't affect core functionality

**Validation After P2**:
```bash
cd frontend && flutter analyze
cd frontend && flutter build web
```
Manual test: Full regression suite (all 20 items) on mobile (375px), tablet (768px), desktop (1440px)

---

### Verifying No Regressions

After implementing all 20 items, run full regression suite:

#### Automated Validation
```bash
# Frontend
cd frontend
flutter analyze        # MUST: 0 errors (info/warnings ok)
flutter build web      # MUST: Success
dart format --set-exit-if-changed lib/  # SHOULD: Formatted

# Backend (if touched)
cd backend
npm run build          # MUST: Success
npx prisma validate    # MUST: Success (if schema changed)
```

#### Manual Regression Tests

**Critical Flows** (must work without errors):
1. Signup → Login → Dashboard
2. Add business → View business
3. Upload invoice → View invoice
4. View analytics → Export CSV
5. Edit profile → Settings update

**Console Check**:
- Open Chrome DevTools (F12) → Console tab
- Navigate through all screens
- Perform all critical flows
- **MUST**: 0 errors during normal usage

**Cross-Browser Testing** (Web):
- Chrome Desktop (primary) - all items work
- Safari Desktop - all items work
- Firefox Desktop - all items work

**Device Testing** (Mobile):
- Mobile emulator (375px) - all items work
- Tablet (768px) - all items work
- Actual device - especially test I12 (keyboard behavior)

---

### Known Dependencies

**Item Dependencies** (must complete in order):
- I04 (Snackbar) before I11, I18 (uses SnackbarUtils)
- I11 (Profile) before I15 (Currency validation builds on profile provider)

**No Other Hard Dependencies**: Most items are independent and can be parallelized within phases

---

### Rollback Strategy

If critical regression discovered after phase:

1. **Identify affected item**: Check which item introduced regression
2. **Revert specific commit**: Use `git revert <commit-hash>`
3. **Re-test**: Run validation suite
4. **Fix and retry**: Fix issue, re-implement item

**Emergency Rollback** (full phase):
```bash
git revert HEAD~N  # N = number of commits in phase
git push origin 003-invoiceme-stabilization --force-with-lease
```

---

## Summary

**Total Tasks**: 20 (I01-I20)  
**All Unchecked**: Ready for implementation  
**Execution Time**: 7-10 days (2-3 days per phase)

**Key Metrics**:
- Frontend-only: 15 items
- Full-stack: 5 items
- Backend-only: 0 items

**Success Criteria**:
- [ ] All 20 items implemented
- [ ] All acceptance criteria met
- [ ] All manual tests passed (mobile + web)
- [ ] `flutter analyze` passes (0 errors)
- [ ] `flutter build web` succeeds
- [ ] No regressions in critical flows
- [ ] Cross-browser testing passed
- [ ] Mobile device testing passed

**Ready to implement!** 🚀
