# Feature Specification: InvoiceMe Stabilization (20 Items)

**Feature Branch**: `003-invoiceme-stabilization`  
**Created**: 2026-01-21  
**Status**: Active Implementation  
**Type**: Bug Fixes & UX Improvements

## Overview

This specification addresses 20 specific issues and improvements to the InvoiceMe MVP. The focus is on fixing broken functionality, improving responsive design, and enhancing user experience across mobile, tablet, and desktop platforms.

**Scope**: ONLY the 20 items listed in SCOPE_LOCK.md. No deployment work unless required for these items.

---

## User Stories & Requirements

### Item 1: Fix App Background Color

**As a** user  
**I want** the app background to remain consistent regardless of my browser/OS dark mode settings  
**So that** I have a predictable visual experience

**Current Problem**: App background changes when browser is in dark mode

**Required Change**:
- Set Flutter `themeMode` to `ThemeMode.light` (not `ThemeMode.system`)
- File: `frontend/lib/main.dart`

**Acceptance Criteria**:
- [ ] App background is light even with browser dark mode enabled
- [ ] App background is light even with OS dark mode enabled
- [ ] Theme is consistent across all pages

**Manual Test**:
- **Mobile**: Enable iOS dark mode → Open app → Verify light background
- **Web**: Enable browser dark mode → Open app → Verify light background

---

### Item 2: Fix Responsive Layout (Mobile)

**As a** mobile user  
**I want** all UI elements to fit within my screen  
**So that** I can interact with all features without horizontal scrolling

**Current Problem**: Buttons and charts overflow the screen on mobile

**Required Changes**:
- Wrap charts in `LayoutBuilder` for responsive sizing
- Use `Expanded`/`Flexible` for button rows
- Add `SingleChildScrollView` where needed
- Files: All screens with charts and button rows

**Acceptance Criteria**:
- [ ] No horizontal scrolling on any screen (375px width)
- [ ] All buttons visible and tappable on mobile
- [ ] Charts fit within screen with visible axes
- [ ] No `RenderFlex overflowed` errors

**Manual Test**:
- **Mobile (375px)**: Navigate all screens → Verify no overflow
- **Web (1440px)**: Navigate all screens → Verify proper layout

---

### Item 3: Fix Password Validation Mismatch

**As a** user creating an account  
**I want** consistent password validation  
**So that** I don't get conflicting error messages

**Current Problem**: Validation says 6 chars but rejects 6-char passwords, requires 8

**Required Changes**:
- Create `validation_constants.dart` with `minPasswordLength = 8`
- Update signup screen validator to use constant
- Update any password-related messaging
- Files: `frontend/lib/core/constants/validation_constants.dart`, `frontend/lib/features/auth/presentation/screens/signup_screen.dart`

**Acceptance Criteria**:
- [ ] 7-char password shows error: "Password must be at least 8 characters"
- [ ] 8-char password is accepted
- [ ] Consistent messaging across all auth screens

**Manual Test**:
- **Mobile**: Try signup with 6, 7, 8 char passwords
- **Web**: Same test on desktop

---

### Item 4: Auto-Dismiss Snackbars

**As a** user  
**I want** snackbars to auto-dismiss after 5 seconds  
**So that** they don't stay on screen indefinitely

**Current Problem**: Snackbars don't auto-dismiss

**Required Changes**:
- Create `SnackbarUtils` class with standard snackbar methods
- Set `duration: Duration(seconds: 5)`
- Add "Dismiss" button action
- Enable tap-outside to dismiss (`SnackBarBehavior.floating`)
- Files: `frontend/lib/shared/utils/snackbar_utils.dart`, update all screens using snackbars

**Acceptance Criteria**:
- [ ] Snackbars auto-dismiss after 5 seconds
- [ ] "Dismiss" button immediately closes snackbar
- [ ] Tap outside snackbar dismisses it
- [ ] Swipe gesture dismisses snackbar

**Manual Test**:
- **Mobile**: Trigger action → Wait 5 sec → Verify auto-dismiss
- **Mobile**: Trigger action → Tap dismiss → Verify immediate close
- **Web**: Same tests on desktop

---

### Item 5: Fix Home Empty State

**As a** new user with no businesses  
**I want** a clean, simple interface  
**So that** I know exactly what actions are available

**Current Problem**: Too many duplicate buttons in empty state

**Required Changes**:
- Remove add business icon from app bar (empty state only)
- Remove floating upload button (empty state only)
- Keep only 2 centered buttons: "Add Business" and "Upload Invoice"
- Files: `frontend/lib/features/home/presentation/screens/home_screen.dart`, `frontend/lib/features/home/presentation/widgets/empty_state.dart`

**Acceptance Criteria**:
- [ ] Empty state shows exactly 2 centered buttons
- [ ] No add business icon in app bar (empty state)
- [ ] No floating button at bottom (empty state)

**Manual Test**:
- **Mobile**: Delete all businesses → Verify 2 centered buttons only
- **Web**: Same test on desktop

---

### Item 6: Add Monthly Limit to Business Dialog

**As a** user managing business budgets  
**I want** to set monthly spending limits  
**So that** I can track my budget per business

**Current Problem**: Monthly limit field is missing from add/edit business dialogs

**Required Changes**:
- Add `TextField` for monthly limit in add business dialog
- Add monthly limit field in edit business dialog
- Make field required with number validation
- Update API calls to include `monthlyLimit`
- Files: `frontend/lib/features/home/presentation/screens/home_screen.dart`

**Acceptance Criteria**:
- [ ] Add business dialog has "Monthly Limit" field
- [ ] Field is required (blocks save if empty)
- [ ] Field accepts only positive numbers
- [ ] Edit dialog pre-fills existing limit
- [ ] Limit saves successfully

**Manual Test**:
- **Mobile**: Add business → Verify monthly limit field → Enter value → Save
- **Web**: Edit business → Verify limit shows → Update → Save

---

### Item 7: Fix Home Screen With Businesses

**As a** user with existing businesses  
**I want** a clean interface focused on uploading invoices  
**So that** the main action is prominent

**Current Problem**: Too many add business buttons, upload button not centered

**Required Changes**:
- Remove add business icon button (with businesses state)
- Center the floating "Upload Invoice" button
- Set `floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat`
- Files: `frontend/lib/features/home/presentation/screens/home_screen.dart`

**Acceptance Criteria**:
- [ ] No add business icon button when businesses exist
- [ ] Single centered "Upload Invoice" floating button
- [ ] Button is at bottom center of screen

**Manual Test**:
- **Mobile**: With businesses → Verify centered upload button only
- **Web**: Same verification on desktop

---

### Item 8: Update App Bar Icons

**As a** user navigating the app  
**I want** clear, non-redundant navigation  
**So that** I can access features without confusion

**Current Problem**: Duplicate analytics icon, no business icon on home

**Required Changes**:
- Remove analytics icon from app bar (it's already near search)
- Add business icon button to app bar on home screen
- Files: `frontend/lib/features/home/presentation/screens/home_screen.dart`

**Acceptance Criteria**:
- [ ] No analytics icon in app bar
- [ ] Business icon present in app bar on home screen
- [ ] Clicking business icon opens add business dialog

**Manual Test**:
- **Mobile**: Check app bar → No analytics icon → Business icon present
- **Web**: Same verification on desktop

---

### Item 9: Remove View Original File Button

**As a** user viewing invoice details  
**I want** to see only working features  
**So that** I'm not confused by non-functional buttons

**Current Problem**: "View Original File" button doesn't work

**Required Changes**:
- Remove `OutlinedButton` with "View Original File" text
- Files: `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart`

**Acceptance Criteria**:
- [ ] Invoice details screen has no "View Original File" button
- [ ] Only edit and delete buttons remain

**Manual Test**:
- **Mobile**: Open invoice details → Verify no view file button
- **Web**: Same verification on desktop

---

### Item 10: Fix Line Items Edit Behavior

**As a** user editing line items  
**I want** the same experience as editing other invoice fields  
**So that** the interface is consistent

**Current Problem**: Line items edit behaves differently than name/number/date edits

**Required Changes**:
- Use same dialog pattern as invoice field edits
- Add loading indicator during save
- Show success/error snackbar after save
- Files: `frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart` or separate edit screen

**Acceptance Criteria**:
- [ ] Line items edit uses consistent dialog pattern
- [ ] Loading indicator shows during save
- [ ] Success snackbar after save
- [ ] Validation errors shown clearly

**Manual Test**:
- **Mobile**: Edit line items → Verify dialog pattern matches other edits
- **Web**: Same verification on desktop

---

### Item 11: Fix Profile Settings

**As a** user updating my profile  
**I want** name and currency changes to work  
**So that** I can personalize my account

**Current Problem**: Changing name and system currency doesn't work

**Required Changes**:
- Fix `updateName()` in settings provider
- Fix `updateCurrency()` in settings provider
- Add loading states to dialogs
- Show success/error feedback
- Invalidate analytics providers after currency change
- Files: `frontend/lib/features/settings/presentation/screens/settings_screen.dart`, `frontend/lib/features/settings/presentation/providers/settings_provider.dart`

**Acceptance Criteria**:
- [ ] Name change saves and updates everywhere
- [ ] Currency change saves and updates everywhere
- [ ] Analytics refresh after currency change
- [ ] Loading states visible during save
- [ ] Success/error snackbars shown

**Manual Test**:
- **Mobile**: Change name → Verify save → Check display
- **Mobile**: Change currency → Verify analytics update
- **Web**: Same tests on desktop

---

### Item 12: Fix Mobile Dialog Positioning

**As a** mobile user editing content  
**I want** dialogs to stay accessible when keyboard appears  
**So that** I can see what I'm typing and reach action buttons

**Current Problem**: Dialogs get pushed too high when mobile keyboard appears

**Required Changes**:
- Wrap dialog content in `SingleChildScrollView` with `shrinkWrap: true`
- Ensure dialogs are scrollable when keyboard is visible
- Files: All dialog screens (home, settings, invoices, etc.)

**Acceptance Criteria**:
- [ ] Dialogs remain on screen when keyboard appears
- [ ] Dialog content is scrollable with keyboard visible
- [ ] Action buttons accessible via scrolling
- [ ] Keyboard dismisses without closing dialog

**Manual Test**:
- **Mobile (actual device or simulator)**: Open dialog → Type → Verify scrollable
- **Tablet**: Same verification

---

### Item 13: Implement Download/Share Export

**As a** user needing to export data  
**I want** working download/share functionality  
**So that** I can use my invoice data externally

**Current Problem**: Export/share buttons don't work

**Required Changes**:
- Add `csv` package to `pubspec.yaml`
- Create `ExportUtils` class with CSV generation
- Implement export in invoices list screen
- Implement export in analytics screens
- Use `dart:html` Blob for web downloads
- Files: `frontend/lib/core/utils/export_utils.dart`, update screens with export buttons, `frontend/pubspec.yaml`

**Acceptance Criteria**:
- [ ] Export button on all invoices downloads CSV
- [ ] CSV contains: date, business, amount, currency, invoice #, status
- [ ] Export from vendor analytics downloads vendor-specific CSV
- [ ] Success snackbar after download
- [ ] Error message if no data to export

**Manual Test**:
- **Mobile**: Click export → Verify file downloads
- **Web**: Click export → Check Downloads folder → Open CSV

---

### Item 14: Fix All Invoices Type Error

**As a** user viewing my invoices  
**I want** the list to load without errors  
**So that** I can see all my invoices

**Current Problem**: Runtime type error: type 'minified:y0' is not a subtype of type 'String'

**Required Changes**:
- Add safe type parsing in `Invoice.fromJson()`
- Create `_parseString()` helper method
- Handle null and dynamic types gracefully
- Files: `frontend/lib/features/invoices/presentation/providers/invoices_provider.dart`

**Acceptance Criteria**:
- [ ] All invoices screen loads without errors
- [ ] No type errors in console
- [ ] All invoices display correctly
- [ ] Fields with unexpected types show fallback values

**Manual Test**:
- **Mobile**: Open all invoices → Verify no errors in console
- **Web**: Same test → Check browser DevTools console

---

### Item 15: Validate Currency Change Propagation

**As a** user changing my system currency  
**I want** all displays to update immediately  
**So that** I see consistent currency throughout the app

**Current Problem**: Currency change doesn't propagate to all screens

**Required Changes**:
- In `updateCurrency()`, invalidate `overallAnalyticsProvider`
- Invalidate `invoicesProvider`
- Verify all screens show updated currency
- Files: `frontend/lib/features/settings/presentation/providers/settings_provider.dart`

**Acceptance Criteria**:
- [ ] Currency change triggers analytics refresh
- [ ] Invoice list shows updated normalized amounts
- [ ] Charts show correct currency symbol
- [ ] All updates happen within 2 seconds

**Manual Test**:
- **Mobile**: Change USD to EUR → Check analytics → Check invoices → Check charts
- **Web**: Same test on desktop

---

### Item 16: Validate Image File Size

**As a** user uploading invoice images  
**I want** clear error messages for oversized files  
**So that** I know to choose a smaller image

**Current Problem**: Heavy images cause upload to fail silently

**Required Changes**:
- Check file size before upload (max 10MB)
- Show error with actual file size
- Files: `frontend/lib/features/home/presentation/providers/home_provider.dart`

**Acceptance Criteria**:
- [ ] Files ≤10MB upload normally
- [ ] Files >10MB show error: "File too large (max 10MB). Selected file: X.XMB"
- [ ] User can select different file after rejection

**Manual Test**:
- **Mobile**: Select 15MB image → Verify error message
- **Web**: Select 5MB image → Verify upload proceeds

---

### Item 17: Add Analytics Loading Message

**As a** user waiting for analytics to load  
**I want** to understand why it's slow  
**So that** I'm not frustrated by delays

**Current Problem**: Long loading times with no explanation

**Required Changes**:
- Add info card when `invoiceCount == 0`
- Message: "Using demo resources - loading may be slower. Upload your first invoice to see real analytics."
- Files: `frontend/lib/features/analytics/presentation/screens/overall_analytics_screen.dart`

**Acceptance Criteria**:
- [ ] Message visible with 0 invoices
- [ ] Message explains demo resource limits
- [ ] Message disappears with real invoices

**Manual Test**:
- **Mobile**: With no invoices → Verify message shows
- **Mobile**: Upload invoice → Verify message disappears

---

### Item 18: Add Dialog Loading Indicators

**As a** user saving or deleting data  
**I want** immediate visual feedback  
**So that** I know my action is being processed

**Current Problem**: No loading indicators during save/delete operations

**Required Changes**:
- Wrap dialogs in `Consumer` widget
- Show `CircularProgressIndicator` in save/delete buttons
- Disable buttons during loading
- Set `barrierDismissible: !isLoading`
- Files: All dialogs (home, settings, invoices, vendors)

**Acceptance Criteria**:
- [ ] All save buttons show loading indicator immediately
- [ ] Delete buttons show loading indicator
- [ ] Buttons disabled during loading
- [ ] Dialog can't be dismissed during loading

**Manual Test**:
- **Mobile**: Click save in any dialog → Verify immediate loading indicator
- **Web**: Same test on desktop

---

### Item 19: Improve AI Insights Copy

**As a** user viewing AI insights  
**I want** insights in simple, friendly language  
**So that** I can understand spending patterns easily

**Current Problem**: Insights show JSON or technical language

**Required Changes**:
- Update AI prompt to request "3-5 short, friendly sentences"
- Parse response as plain text (not JSON)
- Display in simple list format
- Files: `frontend/lib/features/insights/presentation/screens/insights_screen.dart`, possibly backend prompt

**Acceptance Criteria**:
- [ ] Insights screen shows 3-5 readable sentences
- [ ] No JSON visible
- [ ] No technical jargon
- [ ] Non-technical users can understand

**Manual Test**:
- **Mobile**: Open insights → Verify plain language
- **Web**: Same verification on desktop

---

### Item 20: Make Charts Responsive with Axes

**As a** user viewing analytics  
**I want** charts to fit my screen with visible axes  
**So that** I can interpret the data

**Current Problem**: Charts not responsive, axes cut off

**Required Changes**:
- Wrap charts in `LayoutBuilder`
- Set chart size based on constraints
- Configure `titlesData` with `reservedSize` for axes
- Files: All chart screens (analytics, vendor analytics)

**Acceptance Criteria**:
- [ ] Charts fit within container on all devices
- [ ] X-axis labels visible and readable
- [ ] Y-axis labels visible and readable
- [ ] No axis label overlap

**Manual Test**:
- **Mobile (375px)**: View charts → Verify axes visible
- **Tablet (768px)**: Same verification
- **Web (1440px)**: Same verification

---

## Success Criteria

**Overall**:
- [ ] All 20 items implemented
- [ ] `flutter analyze` passes (0 errors)
- [ ] `flutter build web` succeeds
- [ ] No runtime errors in console
- [ ] Manual tests pass on mobile + web for each item

**User Experience**:
- [ ] App is responsive on mobile, tablet, desktop
- [ ] All broken functionality is fixed
- [ ] Consistent UX across all screens
- [ ] Clear feedback for all user actions

---

## Out of Scope

- New features beyond the 20 items
- Deployment/DevOps work (unless needed for items)
- Backend schema changes (unless needed for items)
- Performance optimization (beyond fixing items)
- New screens or navigation changes
- Design overhaul

---

## Dependencies

- Existing 002-invoiceme-mvp codebase
- Flutter SDK 3.10.7+
- `csv` package (to be added)
- Supabase backend
- Existing API endpoints

---

## References

- [SCOPE_LOCK.md](./SCOPE_LOCK.md) - Source of truth for 20 items
- [tasks.md](./tasks.md) - Implementation tasks (to be generated)
- [TEST_PLAN.md](./TEST_PLAN.md) - Detailed test procedures
