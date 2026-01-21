# Implementation Plan: UX & Responsive Fixes

**Branch**: `004-ux-responsive-fixes` | **Date**: 2026-01-21 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/004-ux-responsive-fixes/spec.md`

**Note**: This plan structures UX refinement work into phases with validation gates. Each phase must pass validation before proceeding to the next.

## Summary

This implementation addresses 8 critical UX and responsiveness issues in the InvoiceMe MVP through phased delivery. Phase 0 fixes crashes and broken core functionality. Phase 1 ensures mobile/tablet responsiveness. Phase 2 improves analytics presentation. All work maintains existing screen structure and user flows.

## Technical Context

**Languages/Versions**:
- Flutter/Dart: 3.38.6 (Dart SDK 3.10.7+)
- Node.js: 18.x
- TypeScript: 5.x (strict mode)

**Primary Dependencies**:
- **Frontend**: Flutter Web, Riverpod, go_router, fl_chart (charts), csv (export)
- **Backend**: NestJS, Prisma (minimal changes expected)
- **Infrastructure**: Existing deployment pipeline (Render + Cloudflare Pages)

**Storage**: 
- PostgreSQL (Supabase-hosted) - No schema changes
- Local file system (uploads directory) - No changes

**Testing**: 
- Frontend: Flutter analyzer, manual testing, web build validation
- Backend: TypeScript compiler, Prisma validate (if schema touched)
- Integration: Manual testing on multiple breakpoints (320px, 375px, 768px, 1024px, 1920px)

**Target Platform**: 
- Web (Flutter web) - Chrome, Edge, Firefox, Safari
- Mobile web (iOS Safari, Chrome Mobile)
- Tablet web (iPad Safari, tablet Chrome)

**Project Type**: Web application (frontend + backend monorepo)

**Performance Goals**:
- Perceived load time: < 1 second (via loading skeletons)
- Snackbar timing: 5 seconds ±500ms
- Button loading state: < 100ms response
- Export generation: < 3 seconds for typical dataset

**Constraints**:
- **STRICT**: No new screens or features
- **STRICT**: Preserve existing routes and navigation
- **STRICT**: No breaking changes to data model or APIs
- **STRICT**: Must work on existing Flutter web platform
- Small, focused commits per task group
- Validation required after each phase

**Scale/Scope**:
- 8 user stories
- 30 functional requirements
- 6 files expected to change (estimate):
  - Frontend: 4-6 screen files, 2-3 widget files, 1 export utility
  - Backend: 0-2 files (only if export needs backend support)

## Constitution Check

*GATE: Must pass before Phase 0. Re-check after each phase.*

**Constitution Status**: N/A - Constitution template is placeholder-only

**Compliance Notes**:
- ✅ Multi-tenancy: No changes to tenant scoping logic
- ✅ Data model: No schema changes
- ✅ API contracts: No new endpoints, only fixes to existing
- ✅ Complexity: Minimal new dependencies (csv package if not present)

**Phase-Specific Gates**:

**Phase 0 Gate** (before starting P1):
- [ ] All runtime errors eliminated (0 type errors in console)
- [ ] Settings save/load working end-to-end
- [ ] Export buttons generate valid CSV
- [ ] Auth validation consistent (8+ chars everywhere)
- [ ] `flutter analyze` shows 0 errors
- [ ] `flutter build web` succeeds

**Phase 1 Gate** (before starting P2):
- [ ] No RenderFlex overflow on mobile (320px-768px)
- [ ] All dialogs keyboard-safe on mobile
- [ ] Snackbars auto-dismiss in 5 seconds
- [ ] All buttons show loading state
- [ ] Touch targets ≥44x44px
- [ ] Manual testing passed on 3+ breakpoints

**Phase 2 Gate** (completion criteria):
- [ ] Charts render with visible axes on all breakpoints
- [ ] Demo data clearly indicated
- [ ] KPIs calculate correctly
- [ ] Loading skeletons show before data
- [ ] All acceptance criteria met
- [ ] Full regression testing passed

## Project Structure

### Documentation (this feature)

```text
specs/004-ux-responsive-fixes/
├── spec.md              # Feature specification (8 user stories)
├── plan.md              # This file (implementation plan)
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── [to be created during planning]
    ├── research.md      # Not needed (using existing tech stack)
    ├── data-model.md    # Not needed (no entity changes)
    ├── contracts/       # Not needed (no API changes)
    └── quickstart.md    # Testing guide (will create)
```

**Note**: Research, data-model, and contracts not needed for this bug-fix iteration. We'll create quickstart.md for testing procedures.

### Source Code (repository root)

```text
backend/
├── src/
│   └── [minimal or no changes]
└── package.json

frontend/
├── lib/
│   ├── features/
│   │   ├── home/
│   │   │   └── presentation/
│   │   │       └── screens/
│   │   │           └── home_screen.dart              # P1: Responsive fixes
│   │   ├── auth/
│   │   │   └── presentation/
│   │   │       └── screens/
│   │   │           ├── login_screen.dart             # P0: Auth validation
│   │   │           └── register_screen.dart          # P0: Auth validation
│   │   ├── invoices/
│   │   │   └── presentation/
│   │   │       ├── screens/
│   │   │       │   ├── invoice_detail_screen.dart    # P1: Dialog fixes
│   │   │       │   └── edit_invoice_screen.dart      # P1: Dialog fixes
│   │   │       └── widgets/
│   │   │           └── upload_widget.dart            # P0: Upload reliability
│   │   ├── vendors/
│   │   │   └── presentation/
│   │   │       └── screens/
│   │   │           └── vendor_analytics_screen.dart  # P2: Analytics
│   │   ├── settings/
│   │   │   └── presentation/
│   │   │       └── screens/
│   │   │           └── settings_screen.dart          # P0: Profile fixes
│   │   └── analytics/
│   │       └── presentation/
│   │           └── screens/
│   │               └── analytics_screen.dart         # P2: Analytics
│   ├── shared/
│   │   └── widgets/
│   │       ├── responsive_container.dart             # P1: Create if needed
│   │       └── loading_snackbar.dart                 # P1: Snackbar utility
│   └── core/
│       └── utils/
│           └── export_utils.dart                     # P0: CSV export
├── pubspec.yaml                                      # Add csv package if needed
└── web/
    └── index.html                                    # Already has viewport tag

.github/
└── workflows/
    └── deploy-frontend.yml                           # No changes expected
```

**Structure Decision**: Existing web application structure maintained. All changes within existing files or new utility files only.

## Complexity Tracking

> **No significant complexity added** - This is a refinement iteration

| Aspect | Status | Notes |
|--------|--------|-------|
| Architecture Changes | None | Existing patterns maintained |
| New Dependencies | Minimal | csv package (if not present) |
| Breaking Changes | None | All changes backward compatible |
| New Screens | None | Only fix existing screens |
| New APIs | None | Only improve existing functionality |

---

## Phase 0: Critical Fixes & Foundations 🚨

**Purpose**: Fix crashes, broken functionality, and critical UX blockers

**Priority**: P0 - MUST complete before P1

**Duration Estimate**: 2-3 days

**Gate Criteria**: All runtime errors fixed, core features working, validation passing

### Phase 0.1: Runtime Error Fixes

**Goal**: Eliminate all type errors and crashes

**Tasks**:

1. **Identify all type error sources**
   - Run `flutter build web` and capture all type errors
   - Check console for "type 'minified:y0' is not a subtype of type 'String'" errors
   - Document each error with file and line number

2. **Fix type casting issues**
   - Add null checks before type casts
   - Use `.toString()` for string conversions
   - Add default values for nullable types
   - Files likely affected:
     - `frontend/lib/features/analytics/`
     - `frontend/lib/features/vendors/`
     - `frontend/lib/features/invoices/`

3. **Validation**:
   ```bash
   cd frontend
   flutter analyze
   flutter build web --release
   # Should complete with 0 errors
   ```

**Acceptance Criteria**:
- [ ] `flutter analyze` returns 0 errors
- [ ] `flutter build web` completes successfully
- [ ] No type error warnings in browser console during manual testing
- [ ] App navigable across all screens without crashes

---

### Phase 0.2: Auth Validation Consistency

**Goal**: Standardize password validation to 8+ characters everywhere

**Tasks**:

1. **Audit current validation**
   - Check `login_screen.dart` validation
   - Check `register_screen.dart` validation
   - Check `settings_screen.dart` password change validation
   - Document inconsistencies

2. **Create shared validation constant**
   - Add to `frontend/lib/core/constants/validation_constants.dart`:
     ```dart
     const int minPasswordLength = 8;
     const String passwordRequirementMessage = 
       'Password must be at least 8 characters';
     ```

3. **Update all auth screens**
   - `frontend/lib/features/auth/presentation/screens/register_screen.dart`
     - Update validator to use minPasswordLength
     - Update error message to use passwordRequirementMessage
   - `frontend/lib/features/auth/presentation/screens/login_screen.dart`
     - Ensure consistent messaging (if validation exists)
   - `frontend/lib/features/settings/presentation/screens/settings_screen.dart`
     - Update password change validator
     - Use same constants

4. **Validation**:
   ```bash
   cd frontend
   flutter analyze
   # Manual test: Try 7-char and 8-char passwords in all 3 places
   ```

**Acceptance Criteria**:
- [ ] Registration rejects 7-char password with clear message
- [ ] Password change rejects 7-char password with same message
- [ ] 8-character passwords accepted in all auth flows
- [ ] Error message identical across all screens
- [ ] No conflicting validation rules

**Manual Test Steps**:
1. Go to registration → enter `1234567` → see error
2. Go to login (if validated) → same behavior
3. Go to settings → change password to `1234567` → see same error
4. Try `12345678` in all places → should succeed

---

### Phase 0.3: Profile Settings Fix

**Goal**: Name and currency updates work end-to-end

**Tasks**:

1. **Debug current settings flow**
   - Check `settings_screen.dart` save logic
   - Verify API call to backend
   - Check if state updates after save
   - Document what's broken

2. **Fix name update**
   - `frontend/lib/features/settings/presentation/screens/settings_screen.dart`
     - Add loading state to save button
     - Ensure API call includes updated name
     - Update local state after successful save
     - Show success snackbar
   - Verify name reflects in app header/profile

3. **Fix currency update**
   - Ensure currency change API call works
   - Update all currency displays after save
   - Use Riverpod to propagate currency change globally
   - Verify invoice amounts update to new currency

4. **Add error handling**
   - Catch API errors
   - Show specific error messages
   - Allow retry on failure

5. **Validation**:
   ```bash
   cd frontend
   flutter analyze
   # Manual test: Change name and currency, verify persistence
   ```

**Acceptance Criteria**:
- [ ] Name change saves successfully
- [ ] Name updates in UI within 2 seconds
- [ ] Name persists after page reload
- [ ] Currency change saves successfully
- [ ] All amounts update to new currency
- [ ] Currency persists after page reload
- [ ] Errors show actionable messages with retry option

**Manual Test Steps**:
1. Go to settings
2. Change name from "Test User" to "New Name"
3. Click save → see loading state → see success snackbar
4. Check app header → name shows "New Name"
5. Reload page → name still "New Name"
6. Change currency from ILS to USD
7. Click save → see success
8. Check home screen amounts → now in USD
9. Reload page → amounts still in USD

---

### Phase 0.4: Export/Share Implementation

**Goal**: Working CSV download and share functionality

**Tasks**:

1. **Create CSV export utility**
   - Add `csv` package to `pubspec.yaml` (if not present)
   - Create `frontend/lib/core/utils/export_utils.dart`
   - Function: `generateInvoicesCsv(List<Invoice> invoices)`
     - Columns: Date, Business, Amount, Currency, Invoice #, Status
     - Return CSV string

2. **Implement overall export**
   - `frontend/lib/features/analytics/presentation/screens/analytics_screen.dart`
     - Add export button handler
     - Get all user invoices
     - Generate CSV
     - Trigger download (web_download or similar)
     - Show success/error snackbar

3. **Implement per-business export**
   - `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
     - Add export button handler
     - Get invoices for current business only
     - Generate CSV
     - Trigger download
     - Show success/error snackbar

4. **Add share functionality (mobile web)**
   - Check for Web Share API support
   - If supported, show share option
   - If not, fallback to download
   - Use `share_plus` package if available

5. **Validation**:
   ```bash
   cd frontend
   flutter pub get
   flutter analyze
   flutter build web
   # Manual test: Click export buttons, verify CSV downloads
   ```

**Acceptance Criteria**:
- [ ] Overall export button downloads CSV with all invoices
- [ ] Per-business export downloads CSV with only that business's invoices
- [ ] CSV file opens correctly in Excel/Google Sheets
- [ ] CSV contains correct columns and data
- [ ] File naming is descriptive (invoices_2026-01-21.csv)
- [ ] Share option appears on compatible mobile browsers
- [ ] Errors show actionable messages

**Manual Test Steps**:
1. Go to overall analytics
2. Click export button
3. Verify CSV downloads
4. Open CSV in Excel/Sheets
5. Verify all invoices present
6. Go to business analytics for "Business A"
7. Click export button
8. Verify CSV contains only "Business A" invoices
9. Test on mobile browser
10. Verify share sheet opens (if supported)

---

### Phase 0 Validation Gate

**Required Before Phase 1**:

```bash
# Run all validation commands
cd frontend
flutter analyze                    # Must show 0 errors
flutter build web --release        # Must complete successfully
cd ..
cd backend
npm run build                      # Must complete (if backend changes)
npx prisma validate               # Must pass (if schema touched)
```

**Manual Testing Checklist**:
- [ ] Navigate entire app without crashes
- [ ] No type errors in browser console
- [ ] Password validation consistent (try 7-char and 8-char in all auth screens)
- [ ] Settings: Name saves and persists
- [ ] Settings: Currency saves and all amounts update
- [ ] Analytics: Export button downloads valid CSV
- [ ] Business Analytics: Export button downloads valid CSV for that business only
- [ ] All snackbars appear and are readable

**Gate Decision**: Only proceed to Phase 1 if ALL checklist items pass.

---

## Phase 1: Responsive UI & Dialog UX 📱

**Purpose**: Ensure mobile/tablet responsiveness and consistent dialog behavior

**Priority**: P1 - Start after Phase 0 gate passes

**Duration Estimate**: 3-4 days

**Gate Criteria**: No overflow errors, consistent dialog UX, responsive on all breakpoints

### Phase 1.1: Responsive Layout Foundation

**Goal**: Create responsive utilities and fix overflow errors

**Tasks**:

1. **Create responsive container utility** (if not exists)
   - `frontend/lib/shared/widgets/responsive_container.dart`
     - Breakpoint constants (mobile: <600px, tablet: 600-1024px, desktop: >1024px)
     - ResponsiveBuilder widget
     - Helper methods for responsive sizing

2. **Audit and fix RenderFlex overflows**
   - Test app on mobile simulator (375px width)
   - Note all screens with overflow errors
   - Common fixes:
     - Wrap Row/Column with Flexible or Expanded
     - Use SingleChildScrollView where needed
     - Replace fixed widths with flexible layouts
   - Files likely affected:
     - `home_screen.dart`
     - `analytics_screen.dart`
     - `vendor_analytics_screen.dart`
     - `invoice_detail_screen.dart`

3. **Ensure minimum touch targets**
   - Check all buttons are ≥44x44px on mobile
   - Add padding if needed
   - Use Material Design specs

4. **Validation**:
   ```bash
   cd frontend
   flutter analyze
   flutter run -d chrome --dart-define=FLUTTER_WEB_USE_SKIA=false
   # Resize browser to 375px width
   # Navigate all screens, check console for overflow errors
   ```

**Acceptance Criteria**:
- [ ] 0 RenderFlex overflow errors at 320px width
- [ ] 0 RenderFlex overflow errors at 375px width
- [ ] 0 RenderFlex overflow errors at 768px width
- [ ] All buttons ≥44x44px on mobile
- [ ] All content fits viewport without horizontal scroll

**Manual Test Steps**:
1. Open dev tools, set viewport to 375px x 667px
2. Navigate to home screen → no overflow
3. Navigate to analytics → no overflow
4. Navigate to business analytics → no overflow
5. Navigate to invoice detail → no overflow
6. Navigate to settings → no overflow
7. Repeat at 320px width (iPhone SE)
8. Repeat at 768px width (iPad Mini)

---

### Phase 1.2: Upload Reliability & Loading States

**Goal**: Improve upload UX with immediate feedback

**Tasks**:

1. **Add upload loading indicator**
   - `frontend/lib/features/invoices/presentation/widgets/upload_widget.dart`
     - Show loading indicator immediately on file select
     - Show progress indicator during upload
     - Handle large files gracefully

2. **Improve upload error handling**
   - Catch file size errors (>10MB)
   - Catch network errors
   - Catch server errors
   - Show specific error messages:
     - "File too large (max 10MB)"
     - "Network error, please retry"
     - "Processing failed, please try again"

3. **Add retry mechanism**
   - On error, show retry button
   - Preserve selected file for retry
   - Clear error on successful retry

4. **Validation**:
   ```bash
   cd frontend
   flutter analyze
   # Manual test: Upload various file sizes
   ```

**Acceptance Criteria**:
- [ ] Loading indicator shows within 100ms of file selection
- [ ] Large files (up to 10MB) upload with progress
- [ ] Files >10MB show size error
- [ ] Network errors show specific message
- [ ] Retry button works without reselecting file
- [ ] Success snackbar shows after upload completes

**Manual Test Steps**:
1. Select small invoice image (<1MB)
2. Verify loading indicator appears immediately
3. Verify success snackbar after upload
4. Select large image (5-10MB)
5. Verify progress indicator shows
6. Verify upload completes
7. Try uploading with network disabled
8. Verify error message shows
9. Re-enable network
10. Click retry → upload succeeds

---

### Phase 1.3: Dialog UX Consistency

**Goal**: Consistent dialog behavior across all edit flows

**Tasks**:

1. **Create reusable loading button**
   - `frontend/lib/shared/widgets/loading_button.dart`
     - Shows spinner when loading
     - Disables interaction when loading
     - Consistent across all dialogs

2. **Fix business edit dialog**
   - `frontend/lib/features/home/presentation/screens/home_screen.dart`
     - Use loading button for Save/Delete
     - Ensure keyboard doesn't push dialog too high
     - Add proper loading states

3. **Fix invoice edit dialog**
   - `frontend/lib/features/invoices/presentation/screens/edit_invoice_screen.dart`
     - Use loading button for Save/Delete
     - Keyboard-safe positioning
     - Consistent loading states

4. **Add keyboard-safe dialog utility**
   - Detect when keyboard appears
   - Adjust dialog position to stay visible
   - Ensure Save button always reachable

5. **Validation**:
   ```bash
   cd frontend
   flutter analyze
   # Manual test on mobile: Edit business/invoice with keyboard open
   ```

**Acceptance Criteria**:
- [ ] Save button shows loading state within 100ms of click
- [ ] Delete button shows loading state during deletion
- [ ] Dialog remains fully visible when keyboard opens
- [ ] Save button reachable with keyboard open
- [ ] Loading states prevent double-clicks
- [ ] Behavior consistent across all edit dialogs

**Manual Test Steps**:
1. Open edit business dialog on mobile (375px)
2. Tap name field → keyboard appears
3. Verify dialog doesn't get pushed too high
4. Verify Save button still visible and reachable
5. Click Save → verify loading spinner shows
6. Wait for save to complete
7. Repeat for edit invoice dialog
8. Repeat for delete actions

---

### Phase 1.4: Snackbar Standardization

**Goal**: All snackbars auto-dismiss and are manually dismissible

**Tasks**:

1. **Create snackbar utility**
   - `frontend/lib/shared/widgets/loading_snackbar.dart`
     - Standard duration: 5 seconds
     - Manual dismiss action
     - Success/error/info variants
     - Consistent styling

2. **Replace all snackbar calls**
   - Search codebase for `ScaffoldMessenger.of(context).showSnackBar`
   - Replace with utility function calls
   - Ensure 5-second duration everywhere
   - Add dismiss action to all

3. **Validation**:
   ```bash
   cd frontend
   flutter analyze
   # Manual test: Trigger various snackbars
   ```

**Acceptance Criteria**:
- [ ] All snackbars auto-dismiss after 5 seconds ±500ms
- [ ] All snackbars have visible dismiss action
- [ ] Dismiss action closes snackbar immediately
- [ ] Success snackbars are green
- [ ] Error snackbars are red
- [ ] Info snackbars are blue/gray

**Manual Test Steps**:
1. Trigger success snackbar (save settings)
2. Start timer → verify dismisses at ~5 seconds
3. Trigger another success snackbar
4. Click dismiss action → verify immediate close
5. Trigger error snackbar (invalid upload)
6. Verify red color and dismiss button
7. Verify auto-dismiss after 5 seconds

---

### Phase 1 Validation Gate

**Required Before Phase 2**:

```bash
# Run all validation commands
cd frontend
flutter analyze                    # Must show 0 errors
flutter build web --release        # Must complete successfully
```

**Manual Testing Checklist** (Test at 320px, 375px, 768px, 1024px):
- [ ] No RenderFlex overflow at any tested width
- [ ] All content fits viewport without horizontal scroll
- [ ] All buttons ≥44x44px on mobile
- [ ] Upload shows loading within 100ms
- [ ] Upload errors are specific and actionable
- [ ] Edit dialogs show loading on Save/Delete
- [ ] Dialogs remain fully visible with keyboard open
- [ ] All snackbars auto-dismiss in 5 seconds
- [ ] All snackbars can be manually dismissed
- [ ] Regression: Phase 0 features still work

**Gate Decision**: Only proceed to Phase 2 if ALL checklist items pass.

---

## Phase 2: Analytics Improvements 📊

**Purpose**: Improve analytics presentation, charts, and KPIs

**Priority**: P2 - Start after Phase 1 gate passes

**Duration Estimate**: 2-3 days

**Gate Criteria**: Charts render correctly, KPIs accurate, demo data indicated

### Phase 2.1: Chart Responsiveness

**Goal**: Charts render with visible axes on all breakpoints

**Tasks**:

1. **Audit current chart implementation**
   - Check `analytics_screen.dart` charts
   - Check `vendor_analytics_screen.dart` charts
   - Note what chart library is used (fl_chart?)
   - Identify axis visibility issues

2. **Fix chart sizing**
   - Make charts responsive to screen width
   - Ensure axes labels don't overflow
   - Use responsive sizing:
     - Mobile: Chart width = screen width - 32px padding
     - Tablet: Chart width = 80% of screen width
     - Desktop: Chart width = 600px max

3. **Fix axis labels**
   - Ensure X-axis labels visible and readable
   - Ensure Y-axis labels visible and readable
   - Rotate labels if needed on mobile
   - Use abbreviations for long labels (Jan, Feb vs January, February)

4. **Test on all breakpoints**
   - Test at 320px (iPhone SE)
   - Test at 375px (iPhone standard)
   - Test at 768px (iPad Mini)
   - Test at 1024px (iPad Pro)
   - Test at 1920px (Desktop)

5. **Validation**:
   ```bash
   cd frontend
   flutter analyze
   # Manual test: View charts at each breakpoint
   ```

**Acceptance Criteria**:
- [ ] Charts render without overflow at all breakpoints
- [ ] X-axis labels visible and readable on all screens
- [ ] Y-axis labels visible and readable on all screens
- [ ] Chart data points are touchable/clickable
- [ ] Charts maintain aspect ratio
- [ ] No horizontal scrolling required to see full chart

**Manual Test Steps**:
1. Set viewport to 320px width
2. View overall analytics → check chart axes visible
3. View business analytics → check chart axes visible
4. Increase to 375px → verify still visible
5. Increase to 768px → verify still visible
6. Increase to 1920px → verify still visible
7. Verify labels are readable (not overlapping)

---

### Phase 2.2: Demo Data Indication

**Goal**: Clearly indicate when demo/sample data is shown

**Tasks**:

1. **Detect demo vs real data**
   - Check if user has 0 invoices
   - If 0 invoices, analytics should show demo data
   - Add state flag: `isUsingDemoData: bool`

2. **Add demo data banner**
   - At top of analytics screen:
     ```
     ℹ️ Using demo resources
     Upload your first invoice to see real analytics
     ```
   - Style: Info banner (blue background, white text)
   - Dismissible with X button
   - Re-appears on page reload until real data exists

3. **Update charts with demo data**
   - If no real data, generate sample chart data
   - Clearly show it's sample (lighter colors, pattern overlay?)
   - Ensure demo data is realistic

4. **Remove demo banner when real data exists**
   - Once user has ≥1 invoice, hide demo banner
   - Show real analytics
   - Store dismissed state in local storage

5. **Validation**:
   ```bash
   cd frontend
   flutter analyze
   # Manual test: View analytics with 0 invoices vs with invoices
   ```

**Acceptance Criteria**:
- [ ] Demo banner shows when user has 0 invoices
- [ ] Demo banner clearly states "Using demo resources"
- [ ] Demo banner is dismissible
- [ ] Demo banner disappears when user uploads first invoice
- [ ] Demo charts use sample data
- [ ] Real charts show actual invoice data
- [ ] Banner styling is consistent with app theme

**Manual Test Steps**:
1. Delete all invoices (or use test account with 0 invoices)
2. View overall analytics
3. Verify "Using demo resources" banner shows
4. Verify charts show sample data
5. Click X to dismiss banner
6. Verify banner disappears
7. Reload page
8. Verify banner appears again (not permanently dismissed)
9. Upload an invoice
10. View analytics
11. Verify banner no longer appears
12. Verify charts show real data

---

### Phase 2.3: KPI Accuracy & Loading States

**Goal**: Accurate KPI calculations with loading skeletons

**Tasks**:

1. **Add loading skeletons**
   - `frontend/lib/features/analytics/presentation/screens/analytics_screen.dart`
     - Show skeleton cards while loading
     - Show skeleton chart while loading
     - Animate skeletons (shimmer effect)

2. **Verify KPI calculations**
   - Total Spent: Sum of all invoice amounts
   - Average per Invoice: Total / Count
   - Monthly Average: Total / Number of months
   - Top Business: Business with highest total
   - Review calculation logic for bugs
   - Add unit tests for calculations (optional)

3. **Add data aggregation**
   - Group invoices by month for trends
   - Group by business for breakdowns
   - Calculate correctly across currencies (use normalized amounts)

4. **Implement per-business KPIs**
   - `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
     - Filter invoices to current business only
     - Calculate KPIs for that business
     - Show spending trends for that business

5. **Validation**:
   ```bash
   cd frontend
   flutter analyze
   # Manual test: Verify KPI calculations match raw data
   ```

**Acceptance Criteria**:
- [ ] Loading skeletons show before data loads
- [ ] Skeletons have shimmer animation
- [ ] KPIs calculate correctly from invoice data
- [ ] Total spent matches sum of all invoice amounts
- [ ] Monthly average accounts for actual months with invoices
- [ ] Per-business analytics filter correctly
- [ ] Currency conversions use normalized amounts
- [ ] 0 math errors in calculations

**Manual Test Steps**:
1. View analytics while loading
2. Verify skeleton appears
3. Verify skeleton animates (shimmer)
4. Wait for data to load
5. Verify skeleton is replaced with real data
6. Manually calculate Total Spent from invoices
7. Verify displayed Total matches calculation
8. Check Monthly Average calculation
9. View business analytics for specific business
10. Verify KPIs show only that business's data
11. Verify amounts in different currencies calculated correctly

---

### Phase 2.4: AI Insights Wording

**Goal**: Improve clarity and usefulness of AI-generated insights

**Tasks**:

1. **Review current AI insights**
   - Check what insights are currently shown
   - Identify confusing or unhelpful phrasing
   - Note where more context would help

2. **Improve insight prompts** (if backend-generated)
   - Update prompts to ask for:
     - Specific spending trends
     - Actionable recommendations
     - Comparison to previous periods
     - Budget suggestions

3. **Improve insight display** (frontend)
   - Add icons to insights (💡 for tips, ⚠️ for warnings)
   - Use bullet points for multi-part insights
   - Highlight key numbers
   - Make insights scannable

4. **Add insight loading state**
   - Show "Analyzing your spending..." while loading
   - Show error message if insights fail to load
   - Allow refresh/retry

5. **Validation**:
   ```bash
   cd frontend
   flutter analyze
   # Manual test: View analytics, read insights
   ```

**Acceptance Criteria**:
- [ ] Insights are easy to understand
- [ ] Insights provide actionable recommendations
- [ ] Insights use appropriate icons
- [ ] Key numbers are highlighted
- [ ] Loading state shows during analysis
- [ ] Error handling for failed insights
- [ ] Insights add value (not generic/obvious)

**Manual Test Steps**:
1. View overall analytics
2. Read AI insights section
3. Verify insights are clear and specific
4. Verify insights mention actual spending patterns
5. Verify insights have visual hierarchy (icons, bold)
6. Verify actionable recommendations present
7. Test with different data patterns
8. Verify insights change based on data

---

### Phase 2 Completion Gate

**Final Validation**:

```bash
# Run all validation commands
cd frontend
flutter analyze                    # Must show 0 errors
flutter build web --release        # Must complete successfully
cd ..
cd backend
npm run build                      # Must complete (if changes)
```

**Comprehensive Manual Testing** (All Breakpoints: 320px, 375px, 768px, 1024px, 1920px):

**Phase 0 Regression**:
- [ ] No runtime type errors
- [ ] Auth validation consistent (8+ chars)
- [ ] Settings save and persist
- [ ] Export downloads valid CSV

**Phase 1 Regression**:
- [ ] No RenderFlex overflow
- [ ] Dialogs keyboard-safe
- [ ] Snackbars auto-dismiss (5s)
- [ ] Upload shows loading
- [ ] Touch targets ≥44px

**Phase 2 Validation**:
- [ ] Charts render with visible axes at all breakpoints
- [ ] Chart labels readable (not overlapping)
- [ ] Demo data banner shows when 0 invoices
- [ ] Demo data banner disappears when invoices exist
- [ ] KPIs calculate correctly
- [ ] Loading skeletons show before data
- [ ] Per-business analytics filter correctly
- [ ] AI insights are clear and actionable

**Full User Journey** (End-to-End):
1. Register new account (8-char password works)
2. Upload invoice (loading shows, success snackbar)
3. Assign to business
4. Edit business name (loading, success, persists)
5. Change settings (name + currency, both persist)
6. View overall analytics (charts render, KPIs correct, no demo banner)
7. Export overall data (CSV downloads)
8. View business analytics (charts render, filtered correctly)
9. Export business data (CSV downloads, filtered)
10. Test on mobile (375px) - all screens responsive
11. Test on tablet (768px) - all screens responsive

**Gate Decision**: Deploy only if ALL acceptance criteria met and full user journey passes.

---

## Implementation Strategy

### Commit Strategy

**Small, Focused Commits**:
- One commit per task or small task group
- Each commit should be independently reviewable
- Commit message format:
  ```
  [Phase X.Y] Brief description
  
  - Change 1
  - Change 2
  
  Acceptance Criteria:
  - [ ] Criterion 1
  - [ ] Criterion 2
  
  Manual Test:
  1. Step 1
  2. Step 2
  ```

**Example Commits**:
- `[Phase 0.1] Fix type casting in analytics screens`
- `[Phase 0.2] Standardize password validation to 8+ characters`
- `[Phase 0.3] Fix profile settings name and currency updates`
- `[Phase 1.1] Fix RenderFlex overflow on home screen`
- `[Phase 1.2] Add upload loading indicator and error handling`
- `[Phase 2.1] Make analytics charts responsive with visible axes`

### Testing Strategy

**After Each Task**:
1. Run `flutter analyze`
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

**Final Testing**:
1. Run all validation commands
2. Complete Phase 2 completion gate
3. Test full user journey end-to-end
4. Test on all required breakpoints
5. Test on multiple browsers (Chrome, Firefox, Safari)

### Rollback Strategy

**If Phase Gate Fails**:
1. Identify failing criterion
2. Create hotfix commit for that item
3. Re-run phase gate checklist
4. If still failing, consider rolling back entire phase
5. Debug on separate branch before re-attempting

**If Regression Found**:
1. Immediately stop current work
2. Create hotfix for regression
3. Re-run affected phase gate
4. Resume current work only after regression fixed

---

## Quickstart Testing Guide

### Setup

```bash
# Start backend (if needed)
cd backend
npm run start:dev

# Start frontend
cd frontend
flutter run -d chrome --dart-define=API_URL=http://localhost:3000

# Or build and serve
flutter build web
# Serve build/web on local server
```

### Phase 0 Testing

**Runtime Errors**:
```bash
flutter analyze
flutter build web --release
# Check console for errors during manual navigation
```

**Auth Validation**:
1. Go to registration
2. Try password: `1234567` → should see error
3. Try password: `12345678` → should succeed
4. Go to settings → try changing password
5. Try `1234567` → should see same error
6. Try `12345678` → should succeed

**Settings**:
1. Go to settings
2. Change name → click save → verify success snackbar
3. Check app header → verify name updated
4. Reload page → verify name persists
5. Change currency ILS → USD
6. Click save → verify success
7. Check home screen amounts → verify in USD
8. Reload → verify still USD

**Export**:
1. Go to overall analytics
2. Click export button
3. Verify CSV downloads
4. Open in Excel/Sheets
5. Verify all invoice data present
6. Go to business analytics
7. Click export → verify CSV with only that business

### Phase 1 Testing

**Responsive UI** (Test at 320px, 375px, 768px):
1. Set browser width to 375px
2. Navigate home → check console for overflow
3. Navigate analytics → check console for overflow
4. Navigate settings → check console for overflow
5. Navigate invoice detail → check console for overflow
6. Repeat at 320px and 768px

**Upload**:
1. Select invoice image
2. Verify loading shows within 1 second
3. Verify success snackbar after upload
4. Try large file (5-10MB)
5. Verify progress indicator
6. Try network disabled → verify error message
7. Click retry → verify works

**Dialogs**:
1. Open edit business on mobile (375px)
2. Tap name field → keyboard appears
3. Verify Save button still visible
4. Click Save → verify loading spinner
5. Repeat for edit invoice

**Snackbars**:
1. Trigger success snackbar (save settings)
2. Start stopwatch → verify dismisses at ~5 seconds
3. Trigger error snackbar
4. Click dismiss → verify immediate close

### Phase 2 Testing

**Charts** (Test at 320px, 375px, 768px, 1024px, 1920px):
1. View overall analytics at each width
2. Verify chart renders without overflow
3. Verify X-axis labels visible
4. Verify Y-axis labels visible
5. Verify labels readable (not overlapping)
6. Repeat for business analytics

**Demo Data**:
1. Use account with 0 invoices
2. View analytics
3. Verify "Using demo resources" banner shows
4. Verify charts show sample data
5. Upload invoice
6. View analytics
7. Verify banner gone, real data shows

**KPIs**:
1. View analytics while loading → verify skeleton
2. Wait for load → verify data appears
3. Manually calculate Total Spent from invoices
4. Verify displayed total matches
5. View business analytics
6. Verify KPIs show only that business

**AI Insights**:
1. View analytics
2. Read AI insights
3. Verify insights are clear
4. Verify insights mention actual patterns
5. Verify icons present
6. Verify actionable recommendations

---

## Status

**Plan Status**: ✅ **READY FOR IMPLEMENTATION**

**Next Steps**:
1. Review this plan with team
2. Begin Phase 0 implementation
3. Complete Phase 0 gate before proceeding
4. Continue through phases sequentially
5. Final validation before deployment

**Branch**: `004-ux-responsive-fixes`  
**Spec**: [spec.md](./spec.md)  
**Expected Timeline**: 7-10 days (all 3 phases)

---

**Plan Created**: 2026-01-21  
**Status**: Ready for Implementation ✅  
**Phased Delivery**: P0 → P1 → P2 with validation gates
