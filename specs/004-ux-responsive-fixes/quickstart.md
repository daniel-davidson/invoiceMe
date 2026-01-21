# Quickstart Testing Guide: UX & Responsive Fixes

**Feature**: 004-ux-responsive-fixes  
**Purpose**: Manual testing procedures for all phases  
**Updated**: 2026-01-21

## Prerequisites

### Backend Setup
```bash
cd backend
npm install
npm run start:dev
# Backend should be running on http://localhost:3000
```

### Frontend Setup
```bash
cd frontend
flutter pub get
flutter run -d chrome --dart-define=API_URL=http://localhost:3000
```

### Test Account
- Email: test@invoiceme.app
- Password: testpass123
- Or create new account during testing

---

## Phase 0: Critical Fixes Testing

### Test 0.1: Runtime Errors

**Goal**: Verify no type errors or crashes

**Commands**:
```bash
cd frontend
flutter analyze
flutter build web --release
```

**Manual Steps**:
1. Open app in browser
2. Open browser console (F12)
3. Navigate through all screens:
   - Home
   - Analytics
   - Business Analytics
   - Settings
   - Invoice Detail
4. Check console for errors
5. Look for: "type 'minified:y0' is not a subtype"

**Success Criteria**:
- ✅ `flutter analyze` returns 0 errors
- ✅ `flutter build web` completes
- ✅ No type errors in console
- ✅ App navigable without crashes

---

### Test 0.2: Auth Validation

**Goal**: Consistent 8+ character password requirement

**Test Registration**:
1. Go to registration screen
2. Enter email: testuser@test.com
3. Enter name: Test User
4. Enter password: `1234567` (7 chars)
5. Click Register
6. **Expect**: Error "Password must be at least 8 characters"
7. Change password: `12345678` (8 chars)
8. Click Register
9. **Expect**: Registration succeeds

**Test Password Change**:
1. Log in
2. Go to Settings
3. Click "Change Password"
4. Enter new password: `1234567` (7 chars)
5. **Expect**: Same error message
6. Change to: `newpass123` (10 chars)
7. **Expect**: Password changes successfully

**Success Criteria**:
- ✅ Registration rejects 7-char password
- ✅ Password change rejects 7-char password
- ✅ Error message identical in both places
- ✅ 8+ char passwords accepted

---

### Test 0.3: Profile Settings

**Goal**: Name and currency updates work end-to-end

**Test Name Update**:
1. Go to Settings
2. Note current name in app header
3. Change name field to: "New Test Name"
4. Click Save
5. **Expect**: Loading state on Save button
6. **Expect**: Success snackbar appears
7. Check app header
8. **Expect**: Name shows "New Test Name"
9. Reload page (Cmd+R / Ctrl+R)
10. **Expect**: Name still "New Test Name"

**Test Currency Update**:
1. Note current amounts on home screen (e.g., ₪50.00)
2. Go to Settings
3. Change System Currency from ILS to USD
4. Click Save
5. **Expect**: Success snackbar
6. Go to home screen
7. **Expect**: Amounts now in USD (e.g., $15.79)
8. Reload page
9. **Expect**: Amounts still in USD

**Success Criteria**:
- ✅ Name saves and persists
- ✅ Name updates in UI within 2 seconds
- ✅ Currency saves and persists
- ✅ All amounts update to new currency
- ✅ Changes survive page reload

---

### Test 0.4: Export/Share

**Goal**: Working CSV download functionality

**Test Overall Export**:
1. Go to Overall Analytics screen
2. Ensure you have at least 2 invoices from different businesses
3. Click Export / Download button
4. **Expect**: CSV file downloads
5. Open CSV in Excel or Google Sheets
6. **Expect**: File opens correctly
7. Verify columns: Date, Business, Amount, Currency, Invoice #, Status
8. Verify all your invoices are present

**Test Per-Business Export**:
1. Go to Business Analytics for "Business A"
2. Note how many invoices "Business A" has
3. Click Export button
4. **Expect**: CSV file downloads
5. Open CSV
6. **Expect**: Only "Business A" invoices present
7. Count rows (excluding header)
8. **Expect**: Count matches Business A invoice count

**Test Mobile Share** (if on mobile browser):
1. Open app on iOS Safari or Chrome Mobile
2. Go to Analytics
3. Click Share button (if present)
4. **Expect**: Native share sheet opens
5. Verify CSV file is attached

**Success Criteria**:
- ✅ Overall export includes all invoices
- ✅ Per-business export filtered correctly
- ✅ CSV opens in spreadsheet apps
- ✅ CSV has correct columns and data
- ✅ Share works on compatible browsers

---

## Phase 1: Responsive UI Testing

### Test 1.1: Responsive Layout

**Goal**: No overflow on mobile/tablet

**Test Mobile (375px)**:
1. Open browser DevTools (F12)
2. Toggle device toolbar
3. Select iPhone SE or custom 375px x 667px
4. Navigate to Home screen
5. **Expect**: No horizontal scroll
6. **Expect**: No "RenderFlex overflow" in console
7. Repeat for:
   - Analytics screen
   - Business Analytics screen
   - Settings screen
   - Invoice Detail screen

**Test Small Mobile (320px)**:
1. Set viewport to 320px x 568px (iPhone SE in portrait)
2. Repeat navigation through all screens
3. **Expect**: Everything fits, no overflow

**Test Tablet (768px)**:
1. Set viewport to 768px x 1024px (iPad Mini)
2. Navigate through all screens
3. **Expect**: Content properly sized for tablet
4. **Expect**: No wasted space, no overflow

**Touch Target Test**:
1. On mobile viewport (375px)
2. Check all buttons are easily tappable
3. Measure button height (should be ≥44px)
4. Try tapping buttons with finger-sized cursor

**Success Criteria**:
- ✅ 0 overflow errors at 320px
- ✅ 0 overflow errors at 375px
- ✅ 0 overflow errors at 768px
- ✅ All buttons ≥44x44px
- ✅ No horizontal scrolling needed

---

### Test 1.2: Upload Reliability

**Goal**: Immediate feedback and error handling

**Test Normal Upload**:
1. Go to Upload Invoice screen
2. Select a small invoice image (<1MB)
3. **Expect**: Loading indicator appears within 1 second
4. Wait for upload to complete
5. **Expect**: Success snackbar shows
6. **Expect**: Invoice appears in list

**Test Large Upload**:
1. Select a large invoice image (5-10MB)
2. **Expect**: Progress indicator shows
3. Wait for upload to complete
4. **Expect**: Success snackbar

**Test Too Large File**:
1. Select a very large file (>10MB)
2. **Expect**: Error message "File too large (max 10MB)"
3. **Expect**: No upload attempted

**Test Network Error**:
1. Open browser DevTools → Network tab
2. Set throttling to "Offline"
3. Try to upload invoice
4. **Expect**: Error message "Network error, please retry"
5. **Expect**: Retry button appears
6. Set throttling back to "Online"
7. Click Retry button
8. **Expect**: Upload succeeds

**Success Criteria**:
- ✅ Loading shows within 100ms
- ✅ Large files upload with progress
- ✅ Too-large files rejected with clear message
- ✅ Network errors handled gracefully
- ✅ Retry works without reselecting file

---

### Test 1.3: Dialog UX

**Goal**: Consistent loading states and keyboard safety

**Test Edit Business Dialog**:
1. Set viewport to mobile (375px)
2. Go to Home screen
3. Click edit icon on any business
4. Dialog opens
5. Tap business name field
6. **Expect**: Keyboard appears (simulated in DevTools)
7. **Expect**: Dialog remains fully visible
8. **Expect**: Save button still reachable
9. Type new business name
10. Click Save
11. **Expect**: Save button shows loading spinner
12. Wait for save to complete
13. **Expect**: Success snackbar

**Test Edit Invoice Dialog**:
1. Go to Invoice Detail screen
2. Click Edit button
3. Tap any field
4. **Expect**: Dialog keyboard-safe
5. Click Save
6. **Expect**: Loading spinner on Save button
7. Click Delete instead
8. **Expect**: Confirmation dialog
9. Confirm delete
10. **Expect**: Loading spinner during deletion

**Success Criteria**:
- ✅ Save buttons show loading within 100ms
- ✅ Delete buttons show loading during deletion
- ✅ Dialogs stay visible with keyboard open
- ✅ Save always reachable on mobile
- ✅ Loading prevents double-clicks

---

### Test 1.4: Snackbars

**Goal**: Auto-dismiss in 5 seconds, manually dismissible

**Test Auto-Dismiss**:
1. Trigger a success action (e.g., save settings)
2. Success snackbar appears
3. Start a stopwatch/timer
4. Watch snackbar
5. **Expect**: Snackbar disappears at ~5 seconds (4.5-5.5s acceptable)

**Test Manual Dismiss**:
1. Trigger another success action
2. Snackbar appears
3. Locate dismiss action (X button or similar)
4. Click dismiss
5. **Expect**: Snackbar closes immediately

**Test Error Snackbar**:
1. Trigger an error (e.g., invalid upload)
2. **Expect**: Error snackbar is red/error colored
3. **Expect**: Has dismiss action
4. **Expect**: Auto-dismisses after 5 seconds

**Success Criteria**:
- ✅ All snackbars auto-dismiss in 5s ±0.5s
- ✅ All snackbars have dismiss action
- ✅ Dismiss closes immediately
- ✅ Success = green, Error = red

---

## Phase 2: Analytics Testing

### Test 2.1: Chart Responsiveness

**Goal**: Charts with visible axes at all breakpoints

**Test Mobile (320px)**:
1. Set viewport to 320px x 568px
2. Go to Overall Analytics
3. Scroll to chart section
4. **Expect**: Chart fits width without overflow
5. **Expect**: X-axis labels visible and readable
6. **Expect**: Y-axis labels visible and readable
7. **Expect**: No label overlap

**Test Mobile (375px)**:
1. Set viewport to 375px x 667px
2. Repeat chart checks
3. **Expect**: All axes and labels visible

**Test Tablet (768px)**:
1. Set viewport to 768px x 1024px
2. Go to Analytics
3. **Expect**: Chart properly sized for tablet
4. **Expect**: Axes clear and readable

**Test Desktop (1920px)**:
1. Set viewport to 1920px x 1080px
2. **Expect**: Chart doesn't stretch too wide
3. **Expect**: Axes properly scaled

**Test Business Analytics Charts**:
1. Repeat above tests on Business Analytics screen
2. Verify same behavior

**Success Criteria**:
- ✅ Charts render at all breakpoints
- ✅ X-axis labels visible 320px-1920px
- ✅ Y-axis labels visible 320px-1920px
- ✅ No label overlap
- ✅ No horizontal scrolling

---

### Test 2.2: Demo Data

**Goal**: Clear indication when using demo data

**Test with No Invoices**:
1. Use account with 0 invoices (or delete all)
2. Go to Overall Analytics
3. **Expect**: Banner at top: "ℹ️ Using demo resources"
4. **Expect**: Subtitle: "Upload your first invoice to see real analytics"
5. **Expect**: Chart shows sample data (lighter colors?)
6. **Expect**: KPIs show sample numbers
7. Click X to dismiss banner
8. **Expect**: Banner disappears
9. Reload page
10. **Expect**: Banner appears again

**Test with Real Invoices**:
1. Upload at least 1 invoice
2. Go to Analytics
3. **Expect**: No demo banner
4. **Expect**: Charts show real data
5. **Expect**: KPIs show real calculations

**Success Criteria**:
- ✅ Demo banner shows when 0 invoices
- ✅ Banner text clear and actionable
- ✅ Banner dismissible
- ✅ Banner reappears on reload (until real data)
- ✅ Banner disappears when invoices exist
- ✅ Real data replaces demo data

---

### Test 2.3: KPIs and Loading

**Goal**: Accurate calculations with loading states

**Test Loading Skeleton**:
1. Go to Analytics while on slow network
2. **Expect**: Skeleton cards show immediately
3. **Expect**: Skeleton chart shows
4. **Expect**: Skeletons have shimmer animation
5. Wait for data to load
6. **Expect**: Skeletons replaced with real data

**Test KPI Accuracy**:
1. Note all your invoices and amounts
2. Calculate total manually: Invoice1 + Invoice2 + Invoice3...
3. Go to Analytics
4. Check "Total Spent" KPI
5. **Expect**: Total matches your calculation
6. Check "Average per Invoice"
7. Calculate manually: Total / Invoice Count
8. **Expect**: Average matches your calculation

**Test Per-Business KPIs**:
1. Go to Business Analytics for "Business A"
2. Note invoices for Business A only
3. Calculate total for Business A
4. Check displayed total
5. **Expect**: Total matches (only Business A invoices counted)

**Test Currency Handling**:
1. Ensure you have invoices in different currencies
2. Go to Analytics
3. **Expect**: Totals use normalized amounts
4. **Expect**: Display in system currency

**Success Criteria**:
- ✅ Loading skeleton shows
- ✅ Skeleton animates
- ✅ KPIs calculate correctly
- ✅ Per-business KPIs filter correctly
- ✅ Currency conversions accurate

---

### Test 2.4: AI Insights

**Goal**: Clear and actionable insights

**Test Insights Display**:
1. Go to Overall Analytics
2. Scroll to AI Insights section
3. **Expect**: Insights are easy to read
4. **Expect**: Insights mention specific patterns
5. **Expect**: Icons present (💡, ⚠️, etc.)
6. **Expect**: Key numbers highlighted
7. **Expect**: Bullet points for multi-part insights
8. **Expect**: Actionable recommendations

**Test Loading State**:
1. Reload Analytics page
2. **Expect**: "Analyzing your spending..." message while loading
3. Wait for insights to load
4. **Expect**: Message replaced with insights

**Test Error Handling**:
1. (If possible) Disable backend AI endpoint
2. Reload Analytics
3. **Expect**: Error message shown
4. **Expect**: Option to retry

**Success Criteria**:
- ✅ Insights are clear and specific
- ✅ Insights provide actionable advice
- ✅ Visual hierarchy (icons, bold, bullets)
- ✅ Loading state shown
- ✅ Error handling present

---

## Comprehensive Testing

### Full User Journey

**New User Flow**:
1. Register with 8-character password → succeeds
2. Upload invoice → loading shows → success
3. Assign to business
4. Go to Analytics → demo banner shows
5. Upload more invoices
6. Analytics → demo banner gone, real data
7. Export overall → CSV downloads
8. Go to business analytics
9. Export business → CSV filtered correctly
10. Go to Settings
11. Change name → saves and persists
12. Change currency → all amounts update
13. Test on mobile (375px) → everything responsive
14. Test on tablet (768px) → everything responsive

### Regression Testing

**After Each Phase**:
1. Test all features from previous phases
2. Verify nothing broke
3. Check for new errors in console
4. Verify validation still passes

**Critical Paths**:
- Registration → Upload → Analytics → Export
- Login → Edit Business → Edit Invoice → Settings
- Analytics (overall) → Analytics (per-business) → Export (both)

---

## Breakpoint Testing Matrix

| Screen | 320px | 375px | 768px | 1024px | 1920px |
|--------|-------|-------|-------|--------|--------|
| Home | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Business Analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Settings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Invoice Detail | ✅ | ✅ | ✅ | ✅ | ✅ |

Test each screen at each breakpoint and check:
- No overflow
- No horizontal scroll
- Content readable
- Buttons tappable
- Charts visible

---

## Browser Compatibility

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

---

## Validation Commands

Run after each phase:

```bash
cd frontend
flutter analyze
flutter build web --release

cd backend
npm run build
npx prisma validate
```

All commands must succeed with 0 errors.

---

## Status

**Guide Status**: ✅ Complete  
**Last Updated**: 2026-01-21  
**Phases Covered**: 0, 1, 2  
**Ready For**: Implementation Testing
