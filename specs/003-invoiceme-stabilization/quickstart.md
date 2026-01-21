# Developer Quickstart: 003-invoiceme-stabilization

**Feature**: InvoiceMe Stabilization & UX Refinement  
**Branch**: `003-invoiceme-stabilization`  
**Date**: 2026-01-21

## Overview

This quickstart guide helps developers set up, test, and validate the 20 bug fixes and UX improvements for the InvoiceMe stabilization phase. Follow this guide to ensure your local environment matches the expected configuration and all changes work correctly.

---

## Prerequisites

- **Flutter SDK**: 3.10.7 or higher
- **Dart SDK**: 3.10.7 or higher (included with Flutter)
- **Node.js**: 18+ (for backend)
- **npm**: 8+ (for backend package management)
- **Git**: Latest version
- **IDE**: VS Code or Cursor (recommended) with Flutter and Dart extensions
- **Browsers**: Chrome (desktop + mobile emulation), Safari (if on macOS), Firefox
- **Mobile Testing**: iOS Simulator (macOS) or Android Emulator, or physical device

---

## Initial Setup

### 1. Clone and Checkout Branch

```bash
# Navigate to project root
cd /path/to/invoiceMe

# Fetch latest branches
git fetch --all

# Checkout the stabilization branch
git checkout 003-invoiceme-stabilization

# Pull latest changes
git pull origin 003-invoiceme-stabilization
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
flutter pub get

# Verify Flutter installation
flutter doctor

# Clean previous builds (if needed)
flutter clean
```

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Verify Node version
node --version  # Should be 18+

# If Prisma schema changed, run migration
npx prisma migrate dev

# Verify Prisma schema
npx prisma validate
```

### 4. Environment Variables

Ensure environment files are configured (if not already):

**Backend** (`backend/.env`):
```env
DATABASE_URL="postgresql://..."
SUPABASE_URL="https://..."
SUPABASE_ANON_KEY="..."
GROQ_API_KEY="..."
PORT=3000
```

**Frontend** (`frontend/lib/core/config/` or environment-specific):
- Backend API URL configured correctly
- Supabase URL and keys configured

---

## Running the Application

### Frontend (Flutter Web)

```bash
cd frontend

# Run on Chrome (web)
flutter run -d chrome

# Or run on mobile simulator/emulator
flutter run

# Or run with specific device
flutter devices  # List available devices
flutter run -d <device-id>
```

**Hot Reload**: Press `r` in terminal after making changes (for quick iteration).

### Backend (NestJS)

```bash
cd backend

# Development mode (with hot reload)
npm run start:dev

# Or production mode
npm run build
npm run start:prod
```

**Backend will run on**: `http://localhost:3000`

---

## Testing Each Phase

### Phase 0 (P0): Critical Correctness

**Items**: 3, 11, 13, 14, 15 (Auth, Profile, Export, Type Error, Currency)

#### Test 1: Password Validation (Item 3)

**Steps**:
1. Navigate to signup screen
2. Enter username/email
3. Enter 6-character password → Should show error: "Password must be at least 8 characters"
4. Enter 7-character password → Should still show error
5. Enter 8-character password → Error clears, form submits
6. Navigate to login screen
7. Repeat password validation tests → Same behavior expected

**Expected Results**:
- [ ] 6-char password rejected on signup
- [ ] 7-char password rejected on signup
- [ ] 8-char password accepted on signup
- [ ] Same validation on login
- [ ] Error message clearly states "8 characters"

#### Test 2: Profile Settings (Item 11)

**Steps**:
1. Navigate to settings/profile screen
2. Click "Edit Name"
3. Change name → Should see loading indicator in save button
4. Save completes → Should see green success snackbar "Name updated successfully"
5. Click "Edit Currency"
6. Change currency (e.g., USD to EUR)
7. Save completes → Should see success snackbar + analytics immediately refresh

**Expected Results**:
- [ ] Edit name shows loading indicator
- [ ] Success snackbar after name save
- [ ] Currency change shows loading indicator
- [ ] Success snackbar after currency save
- [ ] Analytics refresh automatically (< 2 seconds)
- [ ] Error handling: Disconnect network → retry shows error snackbar with "Retry" button

#### Test 3: CSV Export (Item 13)

**Steps**:
1. Navigate to "All Invoices" screen
2. Click export/download button
3. CSV file downloads → Check Downloads folder
4. Open CSV → Verify headers: Date, Business, Amount, Currency, Invoice #, Status
5. Verify data matches screen
6. Navigate to a specific vendor analytics screen
7. Click export → CSV downloads with only that vendor's invoices
8. Try export with 0 invoices → Should show message "No invoices to export"

**Expected Results**:
- [ ] Export from all invoices downloads CSV
- [ ] CSV contains correct headers
- [ ] CSV data matches UI display
- [ ] Vendor-specific export works
- [ ] Clear error message when no data

#### Test 4: Fix Type Error (Item 14)

**Steps**:
1. Navigate to "All Invoices" screen
2. Scroll through invoice list
3. Open browser DevTools console (F12)
4. Check for errors → Should be 0 errors
5. Click on invoices → Details open without errors
6. Check console again → Still 0 errors

**Expected Results**:
- [ ] All invoices screen loads without console errors
- [ ] No "type 'minified:y0' is not a subtype of String" errors
- [ ] All invoice fields display correctly
- [ ] Fields with null/unexpected data show fallback values (e.g., "Unknown" for vendor)

#### Test 5: Currency Validation (Item 15)

**Steps**:
1. Note current system currency (e.g., USD)
2. Navigate to analytics screen → Note KPI values and currency symbols
3. Navigate to settings → Change currency to EUR
4. Immediately return to analytics → Values should update to EUR
5. Navigate to invoices list → Normalized amounts should show EUR
6. View charts → Y-axis labels should show EUR symbol (€)
7. Change currency back to original → All displays update again

**Expected Results**:
- [ ] Currency change triggers analytics refresh
- [ ] Analytics KPIs update to new currency
- [ ] Invoice normalized amounts update
- [ ] Chart axes show correct currency symbol
- [ ] All updates happen within 2 seconds of save

---

### Phase 1 (P1): UX Correctness

**Items**: 4, 5, 6, 7, 8, 9, 10, 18 (Snackbar, Home UI, Dialogs, Buttons, Loading)

#### Test 6: Snackbar Behavior (Item 4)

**Steps**:
1. Perform any successful action (e.g., save business name)
2. Green snackbar appears → Wait 5 seconds → Snackbar auto-dismisses
3. Perform another action → Snackbar appears → Click "Dismiss" button → Immediately disappears
4. Perform action → Snackbar appears → Tap/click outside snackbar → Dismisses
5. Perform action → Snackbar appears → Swipe horizontally → Dismisses
6. Trigger error (e.g., disconnect network, try save) → Red error snackbar with "Retry" button

**Expected Results**:
- [ ] Snackbars auto-dismiss after exactly 5 seconds
- [ ] "Dismiss" button immediately closes snackbar
- [ ] Tap/click outside dismisses snackbar
- [ ] Swipe gesture dismisses snackbar
- [ ] Success = green, Error = red, Info = blue
- [ ] Error snackbars show "Retry" (where applicable)

#### Test 7: Home Empty State (Item 5)

**Steps**:
1. Delete all businesses (or start fresh)
2. Navigate to home screen
3. Count visible buttons → Should see exactly 2: "Add Business" and "Upload Invoice"
4. Buttons should be centered
5. Check app bar → No add business icon
6. Check bottom of screen → No floating action button

**Expected Results**:
- [ ] Exactly 2 centered buttons visible
- [ ] "Add Business" button present
- [ ] "Upload Invoice" button present
- [ ] No add business icon in app bar
- [ ] No floating button at bottom

#### Test 8: Monthly Limit Field (Item 6)

**Steps**:
1. Click "Add Business"
2. Dialog opens → Verify "Monthly Limit" field present
3. Try to save without entering monthly limit → Should show validation error
4. Enter non-numeric value → Should show validation error
5. Enter negative number → Should show validation error
6. Enter positive number (e.g., 5000) → Save succeeds
7. Edit existing business → Monthly limit field pre-filled with current value
8. Update monthly limit → Save succeeds

**Expected Results**:
- [ ] "Monthly Limit" field present in add dialog
- [ ] Field is required (empty submission blocked)
- [ ] Only positive numbers accepted
- [ ] Edit dialog pre-fills current value
- [ ] Updates save successfully

#### Test 9: Home With Businesses (Item 7)

**Steps**:
1. Add at least one business
2. Navigate to home screen
3. Count floating action buttons → Should see exactly 1: "Upload Invoice" (centered)
4. Verify no separate "Add Business" floating button
5. Check button position → Should be centered at bottom

**Expected Results**:
- [ ] Single centered "Upload Invoice" floating button
- [ ] No separate add business floating button
- [ ] Button is centered (FloatingActionButtonLocation.centerFloat)

#### Test 10: Navigation Cleanup (Item 8)

**Steps**:
1. Navigate to home screen
2. Check app bar icons
3. Verify analytics icon is NOT present
4. Verify business icon IS present
5. Click business icon → Add business dialog opens

**Expected Results**:
- [ ] No analytics icon in app bar
- [ ] Business icon present in app bar
- [ ] Clicking business icon opens add business dialog

#### Test 11: Remove View File Button (Item 9)

**Steps**:
1. Navigate to any invoice details screen
2. Scroll through screen
3. Verify "View Original File" button is NOT present
4. Only edit and delete buttons should be visible

**Expected Results**:
- [ ] No "View Original File" button visible
- [ ] Only functional buttons present (edit, delete)

#### Test 12: Line Items Edit Consistency (Item 10)

**Steps**:
1. Open invoice with line items
2. Click edit on line items
3. Dialog/screen opens → Should match pattern of edit invoice name/number/date
4. Make changes → Click save
5. Save button shows loading indicator
6. Save completes → Success snackbar appears
7. Dialog closes automatically
8. Try invalid input → Clear validation errors shown

**Expected Results**:
- [ ] Edit dialog matches other edit patterns
- [ ] Save button shows loading indicator
- [ ] Success snackbar after save
- [ ] Validation errors clear and specific

#### Test 13: Dialog Loading Indicators (Item 18)

**Steps**:
1. Open any add/edit dialog (business, invoice field, etc.)
2. Fill in data → Click save
3. Immediately observe save button → Should show CircularProgressIndicator
4. Observe other buttons → Should be disabled (grayed out)
5. Try to dismiss dialog during loading → Should be blocked (barrierDismissible: false)
6. After response → Loading stops, snackbar appears, dialog closes
7. Test delete button → Same loading behavior

**Expected Results**:
- [ ] All save buttons show loading indicator immediately on click
- [ ] All buttons disabled during loading
- [ ] Dialog cannot be dismissed during loading
- [ ] Delete buttons show loading indicator
- [ ] Loading stops after response (success or error)

---

### Phase 2 (P2): Responsiveness & Analytics UX

**Items**: 1, 2, 12, 16, 17, 19, 20 (Theme, Responsive, Mobile Dialogs, File Size, Analytics, AI, Charts)

#### Test 14: Theme Independence (Item 1)

**Steps**:
1. Enable dark mode in your OS (macOS System Preferences → Appearance → Dark)
2. Open app in Chrome
3. Verify app background is light (not dark)
4. Enable dark mode in Chrome browser (chrome://flags → Dark mode)
5. Refresh app → Background remains light
6. Open in Safari with dark mode → Background remains light
7. Disable all dark modes → Background still light

**Expected Results**:
- [ ] App background light despite OS dark mode
- [ ] App background light despite browser dark mode
- [ ] Theme consistent across all browsers
- [ ] No jarring theme switches

#### Test 15: Responsive Layout (Item 2)

**Steps**:
1. Open Chrome DevTools (F12) → Device emulation
2. Test at 375px width (iPhone 12 Pro) → No horizontal scrolling
3. View analytics charts → Charts fit screen, axes visible
4. Click buttons → All buttons visible and tappable
5. Test at 768px width (iPad) → Layout adapts properly
6. Test at 1440px width (desktop) → No awkward stretching
7. Resize window gradually → Content reflows smoothly
8. Check console for "RenderFlex overflowed" errors → Should be 0

**Expected Results**:
- [ ] No horizontal scrolling at any width
- [ ] No "RenderFlex overflowed" errors
- [ ] Buttons fit screen on mobile (375px)
- [ ] Charts fit screen on all sizes
- [ ] Content reflows on window resize
- [ ] X and Y axes visible on all chart sizes

#### Test 16: Mobile Dialog Positioning (Item 12)

**Steps**:
1. Open app on iOS Simulator or Android Emulator (or physical device)
2. Open any edit dialog (e.g., edit business name)
3. Tap into text field → Keyboard appears
4. Verify dialog remains visible (not pushed off-screen)
5. Scroll dialog content → Action buttons should be accessible
6. Type in field → Verify you can see what you're typing
7. Tap outside keyboard area (but not on dialog) → Keyboard dismisses, dialog stays open

**Expected Results**:
- [ ] Dialog stays on screen when keyboard appears
- [ ] Dialog content scrolls with keyboard visible
- [ ] Action buttons accessible via scrolling
- [ ] Keyboard dismisses without closing dialog

#### Test 17: File Size Validation (Item 16)

**Steps**:
1. Prepare test files: 5MB, 10MB, 15MB images
2. Navigate to upload screen
3. Select 5MB file → Upload proceeds normally
4. Select 10MB file → Upload proceeds (boundary test)
5. Select 15MB file → Error snackbar: "File too large (max 10MB). Selected file: 15.0MB"
6. Verify error message shows actual file size
7. After rejection, select different file → Upload works

**Expected Results**:
- [ ] Files ≤10MB accepted
- [ ] Files >10MB rejected
- [ ] Error message shows max limit (10MB)
- [ ] Error message shows actual file size
- [ ] Can select different file after rejection

#### Test 18: Analytics Demo Message (Item 17)

**Steps**:
1. Delete all invoices (or test with fresh account)
2. Navigate to analytics screen
3. Verify demo message visible: "Using demo resources - loading may be slower..."
4. Upload first invoice
5. Return to analytics → Message should not appear (or should update)

**Expected Results**:
- [ ] Demo message visible with 0 invoices
- [ ] Message explains slow loading
- [ ] Message disappears with real data
- [ ] Message dismissible (optional)

#### Test 19: AI Insights Copy (Item 19)

**Steps**:
1. Navigate to AI insights screen
2. Count visible insights → Should see 3-5 insights
3. Read each insight → Should be plain English, no JSON visible
4. Verify insights are complete sentences
5. Ask non-technical user to read → They should understand without help

**Expected Results**:
- [ ] 3-5 insights displayed
- [ ] No JSON visible
- [ ] No technical jargon
- [ ] Complete sentences
- [ ] Conversational, friendly language
- [ ] Non-technical users understand insights

#### Test 20: Responsive Charts (Item 20)

**Steps**:
1. Navigate to any screen with line charts (analytics, vendor analytics)
2. Test on mobile (375px) → Chart fits, X and Y axes visible and readable
3. Test on tablet (768px) → Chart uses space efficiently, axes visible
4. Test on desktop (1440px) → Chart fits container, axes visible
5. Resize window → Chart responds, axes remain visible
6. Check for axis label overlap → Labels should be spaced properly

**Expected Results**:
- [ ] Charts fit container on all devices
- [ ] X-axis labels visible on mobile/tablet/desktop
- [ ] Y-axis labels visible on mobile/tablet/desktop
- [ ] No axis label overlap
- [ ] Charts respond to window resize

---

## Validation Commands

Run these commands after implementing each phase to ensure code quality:

### Frontend Validation

```bash
cd frontend

# Static analysis (MUST PASS)
flutter analyze

# Build web (MUST SUCCEED)
flutter build web

# Run tests (if tests exist)
flutter test

# Check for any TODO or FIXME comments
grep -r "TODO\|FIXME" lib/
```

**Expected**: 
- `flutter analyze`: 0 errors, 0 warnings
- `flutter build web`: Completes successfully, no errors
- `flutter test`: All tests pass (if applicable)

### Backend Validation (if touched)

```bash
cd backend

# TypeScript compilation (MUST SUCCEED)
npm run build

# Prisma schema validation (MUST PASS)
npx prisma validate

# Run tests (if tests exist)
npm test

# Check for type errors
npx tsc --noEmit
```

**Expected**:
- `npm run build`: Compiles successfully
- `npx prisma validate`: Schema valid
- `npm test`: All tests pass (if applicable)

---

## Manual Testing Checklist

Use this checklist to verify all 20 items across devices:

### Mobile (375px, iPhone 12 Pro emulation or actual device)
- [ ] Item 1: Theme independence ✅
- [ ] Item 2: Responsive layout ✅
- [ ] Item 3: Password validation ✅
- [ ] Item 4: Snackbar behavior ✅
- [ ] Item 5: Home empty state ✅
- [ ] Item 6: Monthly limit field ✅
- [ ] Item 7: Home with businesses ✅
- [ ] Item 8: Navigation cleanup ✅
- [ ] Item 9: View file button removed ✅
- [ ] Item 10: Line items edit ✅
- [ ] Item 11: Profile settings ✅
- [ ] Item 12: Mobile dialog positioning ✅
- [ ] Item 13: CSV export ✅
- [ ] Item 14: Type error fixed ✅
- [ ] Item 15: Currency validation ✅
- [ ] Item 16: File size validation ✅
- [ ] Item 17: Analytics demo message ✅
- [ ] Item 18: Loading indicators ✅
- [ ] Item 19: AI insights copy ✅
- [ ] Item 20: Responsive charts ✅

### Web (1440px, Chrome desktop)
- [ ] All 20 items verified on desktop ✅
- [ ] No console errors in DevTools ✅
- [ ] Responsive behavior on window resize ✅

### Cross-Browser (Safari, Firefox)
- [ ] Theme independence across browsers ✅
- [ ] All features work in Safari ✅
- [ ] All features work in Firefox ✅

---

## Troubleshooting

### Flutter analyze errors

**Problem**: "The value of the local variable 'x' isn't used"  
**Solution**: Remove unused variable or prefix with `_` if intentionally unused

**Problem**: "unused_import"  
**Solution**: Remove unused import statements

**Problem**: "The getter 'x' isn't defined for the type 'Y'"  
**Solution**: Check property names, ensure correct model/class being accessed

### Flutter build web fails

**Problem**: "Failed to compile application"  
**Solution**: Run `flutter clean`, then `flutter pub get`, then retry build

**Problem**: "Missing dependencies"  
**Solution**: Verify `pubspec.yaml` has all required packages, run `flutter pub get`

### Backend build fails

**Problem**: "Cannot find module 'x'"  
**Solution**: Run `npm install` to ensure all dependencies installed

**Problem**: "Prisma schema errors"  
**Solution**: Run `npx prisma validate`, check for syntax errors in `schema.prisma`

### Mobile testing issues

**Problem**: "No devices available"  
**Solution**: Start iOS Simulator or Android Emulator, run `flutter devices` to verify

**Problem**: "Keyboard covers dialog on mobile"  
**Solution**: Ensure `SingleChildScrollView` is wrapping dialog content with `shrinkWrap: true`

---

## Performance Benchmarks

After all changes, verify performance targets:

- **Chart rendering**: < 2 seconds for 100 data points
- **Snackbar dismiss**: < 500ms response time
- **Dialog open/close**: < 300ms animation time
- **Currency change refresh**: < 2 seconds for analytics update
- **CSV export**: < 5 seconds for 1000 invoices

---

## Next Steps

1. **Complete Phase 0 (P0)**: Implement and test critical items first
2. **Complete Phase 1 (P1)**: Implement and test UX items
3. **Complete Phase 2 (P2)**: Implement and test responsive and analytics items
4. **Run full validation**: All commands + all manual tests
5. **Cross-browser testing**: Chrome, Safari, Firefox
6. **Sign-off**: Complete final checklist in `plan.md`
7. **Deploy**: Merge to main and deploy to staging/production

---

## Support

For questions or issues:
- Review `specs/003-invoiceme-stabilization/spec.md` for requirements
- Review `specs/003-invoiceme-stabilization/research.md` for technical decisions
- Review `specs/003-invoiceme-stabilization/plan.md` for implementation details
- Check `DECISIONS.md` for project-specific decisions
