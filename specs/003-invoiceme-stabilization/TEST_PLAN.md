# Test Plan: InvoiceMe Stabilization

**Feature**: 003-invoiceme-stabilization  
**Date**: 2026-01-21  
**Scope**: 20 specific bug fixes and improvements

## Test Strategy

- **Manual Testing**: Required for all 20 items (mobile + web)
- **Automated Testing**: `flutter analyze` + `flutter build web` after each phase
- **Devices**: Mobile (375px), Tablet (768px), Desktop (1440px)
- **Browsers**: Chrome (primary), Safari, Firefox (cross-browser)

---

## Test Matrix: Items I01-I20

### I01: App Background Color

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile iOS (dark mode) | Open app | Light background | ⬜ |
| Mobile Android (dark mode) | Open app | Light background | ⬜ |
| Web Chrome (dark mode) | Open app | Light background | ⬜ |
| Web Safari (dark mode) | Open app | Light background | ⬜ |

---

### I02: Responsive Layout

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile (375px) | View all screens | No horizontal scrolling | ⬜ |
| Mobile (375px) | View analytics | Charts fit, axes visible | ⬜ |
| Tablet (768px) | View all screens | Proper adaptation | ⬜ |
| Desktop (1440px) | Resize window | Smooth reflow | ⬜ |
| Console | Check errors | 0 RenderFlex errors | ⬜ |

---

### I03: Password Validation

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Signup with 6-char password | Error: "must be at least 8 characters" | ⬜ |
| Mobile | Signup with 7-char password | Same error | ⬜ |
| Mobile | Signup with 8-char password | No error, form submits | ⬜ |
| Web | Same as mobile tests | Same results | ⬜ |

---

### I04: Snackbar Auto-Dismiss

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Save business → Wait 5 sec | Auto-dismisses | ⬜ |
| Mobile | Save business → Tap dismiss | Immediately closes | ⬜ |
| Mobile | Save business → Tap outside | Dismisses | ⬜ |
| Mobile | Save business → Swipe | Dismisses | ⬜ |
| Web | Same tests | Same results | ⬜ |

---

### I05: Home Empty State

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Delete all businesses | See 2 centered buttons only | ⬜ |
| Mobile | Check app bar | No add business icon | ⬜ |
| Mobile | Check bottom | No floating button | ⬜ |
| Web | Same tests | Same results | ⬜ |

---

### I06: Monthly Limit Field

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Add business dialog | "Monthly Limit" field present | ⬜ |
| Mobile | Save without limit | Validation error | ⬜ |
| Mobile | Enter negative number | Validation error | ⬜ |
| Mobile | Enter positive number | Saves successfully | ⬜ |
| Web | Edit business | Limit pre-filled | ⬜ |

---

### I07: Home With Businesses

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | With ≥1 business | Single centered upload button | ⬜ |
| Mobile | Check for duplicates | No add business floating button | ⬜ |
| Web | Same tests | Same results | ⬜ |

---

### I08: App Bar Icons

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Home screen app bar | No analytics icon | ⬜ |
| Mobile | Home screen app bar | Business icon present | ⬜ |
| Mobile | Click business icon | Add business dialog opens | ⬜ |
| Web | Same tests | Same results | ⬜ |

---

### I09: Remove View File Button

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Open invoice details | No "View Original File" button | ⬜ |
| Web | Open invoice details | Same (no button) | ⬜ |

---

### I10: Line Items Edit

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Edit line items | Dialog matches invoice edit pattern | ⬜ |
| Mobile | Click save | Loading indicator shows | ⬜ |
| Mobile | Save completes | Success snackbar | ⬜ |
| Web | Same tests | Same results | ⬜ |

---

### I11: Profile Settings

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Edit name | Dialog opens, loading states work | ⬜ |
| Mobile | Save name | Success snackbar, name updates | ⬜ |
| Mobile | Change currency | Success snackbar | ⬜ |
| Mobile | After currency change | Analytics refresh < 2 sec | ⬜ |
| Web | Same tests | Same results | ⬜ |

---

### I12: Mobile Dialog Positioning

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile (device) | Open dialog, tap field | Keyboard appears, dialog accessible | ⬜ |
| Mobile (device) | With keyboard visible | Can scroll to see buttons | ⬜ |
| Mobile (device) | Tap outside keyboard | Keyboard dismisses, dialog stays | ⬜ |

---

### I13: Export Functionality

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Click export on all invoices | CSV downloads | ⬜ |
| Mobile | Check CSV content | Correct headers and data | ⬜ |
| Mobile | Export from vendor analytics | Vendor-specific CSV | ⬜ |
| Mobile | Export with no data | Error message | ⬜ |
| Web | Same tests | Same results | ⬜ |

---

### I14: Fix Type Error

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Navigate to all invoices | Screen loads without errors | ⬜ |
| Mobile | Check console | 0 type errors | ⬜ |
| Mobile | Scroll invoice list | All data displays | ⬜ |
| Web | Same tests | Same results | ⬜ |

---

### I15: Currency Validation

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Change USD to EUR | Analytics show EUR | ⬜ |
| Mobile | Check invoices | Normalized amounts in EUR | ⬜ |
| Mobile | Check charts | Y-axis shows € symbol | ⬜ |
| Web | Same tests | Same results | ⬜ |

---

### I16: File Size Validation

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Upload 5MB image | Upload proceeds | ⬜ |
| Mobile | Upload 15MB image | Error: "File too large (max 10MB). Selected file: 15.0MB" | ⬜ |
| Mobile | After rejection | Can select different file | ⬜ |
| Web | Same tests | Same results | ⬜ |

---

### I17: Analytics Loading Message

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | With 0 invoices | Demo message visible | ⬜ |
| Mobile | Upload invoice | Message disappears | ⬜ |
| Web | Same tests | Same results | ⬜ |

---

### I18: Dialog Loading Indicators

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Add business → Save | Immediate loading indicator | ⬜ |
| Mobile | Edit business → Save | Loading indicator | ⬜ |
| Mobile | Delete business → Confirm | Loading on delete button | ⬜ |
| Mobile | During loading | Buttons disabled | ⬜ |
| Mobile | During loading | Dialog not dismissible | ⬜ |
| Web | Same tests | Same results | ⬜ |

---

### I19: AI Insights

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile | Open insights screen | 3-5 readable sentences | ⬜ |
| Mobile | Read insights | No JSON visible | ⬜ |
| Mobile | Comprehension test | Non-technical user understands | ⬜ |
| Web | Same tests | Same results | ⬜ |

---

### I20: Charts Responsive

| Platform | Test | Expected Result | Pass/Fail |
|----------|------|-----------------|-----------|
| Mobile (375px) | View analytics charts | X-axis labels visible | ⬜ |
| Mobile (375px) | View charts | Y-axis labels visible | ⬜ |
| Tablet (768px) | View charts | Axes visible, no overlap | ⬜ |
| Desktop (1440px) | View charts | Axes visible, proper sizing | ⬜ |
| Desktop | Resize window | Charts respond smoothly | ⬜ |

---

## Regression Testing

After implementing all 20 items, verify core functionality still works:

### Critical Flows
- [ ] Signup → Login → Dashboard
- [ ] Add business → View business
- [ ] Upload invoice → View invoice
- [ ] View analytics → Export CSV
- [ ] Edit profile → Settings update

### No Regressions
- [ ] Navigation still works
- [ ] All existing features functional
- [ ] No new errors introduced

---

## Automated Validation

Run after each phase:

```bash
# Static analysis
cd frontend && flutter analyze

# Build verification
cd frontend && flutter build web

# Backend (if touched)
cd backend && npm run build
cd backend && npx prisma validate
```

**Pass Criteria**:
- `flutter analyze`: 0 errors (info/warnings acceptable)
- `flutter build web`: Completes successfully
- No new console errors during runtime

---

## Test Execution Order

1. **Phase P0** (Critical - Items 3, 11, 13, 14, 15):
   - Test each item individually after implementation
   - Run validation commands
   - Verify no regressions

2. **Phase P1** (UX - Items 4, 5, 6, 7, 8, 9, 10, 18):
   - Test each item individually
   - Run validation commands
   - Cross-check interactions between items

3. **Phase P2** (Polish - Items 1, 2, 12, 16, 17, 19, 20):
   - Test each item individually
   - Run full regression suite
   - Final validation

4. **Final Validation**:
   - Complete matrix above (all checkboxes)
   - Cross-browser testing
   - Actual device testing (not just emulator)

---

## Test Environment Setup

### Mobile Testing
- **Chrome DevTools**: Device emulation at 375px (iPhone 12 Pro)
- **iOS Simulator**: If available on macOS
- **Android Emulator**: If available
- **Real Device**: Ideal for keyboard tests (Item 12)

### Web Testing
- **Chrome Desktop**: Primary browser at 1440px
- **Safari Desktop**: Cross-browser verification
- **Firefox Desktop**: Cross-browser verification

### Console Monitoring
- Open browser DevTools (F12)
- Watch Console tab for errors during all tests
- Document any errors that appear

---

## Success Criteria

**All 20 items**:
- [ ] Implemented
- [ ] Tested on mobile
- [ ] Tested on web
- [ ] Pass criteria met
- [ ] No regressions introduced

**Code Quality**:
- [ ] `flutter analyze` passes
- [ ] `flutter build web` succeeds
- [ ] 0 runtime errors in console

**User Experience**:
- [ ] All functionality works as expected
- [ ] Responsive on all devices
- [ ] Clear feedback for all actions
