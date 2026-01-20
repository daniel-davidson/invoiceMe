# Version 2.0 Spec Changes Summary

**Date**: 2026-01-20  
**Status**: ✅ Spec updates complete, ready for implementation  
**Commits**: 5e5c501, a083794

---

## Overview

This document summarizes ALL spec changes for Version 2.0 stabilization features (1-5).

---

## Feature 1: Business Analytics Chart Axis + Responsive Sizing

### FLOW_CONTRACT.md §10 - Chart Requirements
- **X-axis**: Month labels ("Jan 25"), density adjusted for mobile/tablet/desktop
- **Y-axis**: Amount with currency symbol ("₪100"), auto-scale, grid lines
- **Responsive**: Width = screen - 32px, height 300px, no overflow
- **Labels**: Never cut off at edges, rotate 45° if needed

### UI_STATES.md (to be merged from _UI_STATES_ADDITIONS.md)
- Chart rendering states
- Overflow prevention rules
- Responsive breakpoints (< 600px, 600-1200px, > 1200px)

---

## Feature 2: Upload - Never Auto-Create Business

### FLOW_CONTRACT.md §4a - Post-Upload Assignment Modal
- **Backend**: NEVER creates Vendor record automatically
- **Upload response**: vendorId = null, needsReview = true, extractedVendorNameCandidate
- **User flow**: Must explicitly select existing OR create new business
- **Assignment**: Only after Confirm via PATCH /invoices/:id

### data-model.md - Invoice.vendorId
- **Changed**: String → String? (nullable)
- **Validation**: (vendorId != null) OR (needsReview == true)

### API_CONTRACTS.md (to be updated)
- POST /invoices/upload response includes:
  ```json
  {
    "vendorId": null,
    "needsReview": true,
    "extractionResult": {
      "extractedVendorNameCandidate": "קריאטיב סופטוור",
      "confidence": 0.85
    }
  }
  ```

---

## Feature 3: Add/Edit Business - monthlyLimit REQUIRED

### FLOW_CONTRACT.md §5 - Add/Edit Business Dialog
- **New field**: Monthly Limit (numeric, required, > 0)
- **Validation**: "Monthly limit is required and must be greater than 0"
- **Save button**: Disabled until all validations pass

### data-model.md - Vendor.monthlyLimit
- **Changed**: Decimal? → Decimal (non-nullable)
- **Validation**: Backend rejects if missing or ≤ 0

### UI_STATES.md (to be merged)
- Field validation states (empty, non-numeric, ≤ 0)
- Save button states (enabled/disabled)
- Error messages (inline red text)

### API_CONTRACTS.md (to be updated)
- POST /vendors validation:
  - 400: "Monthly limit is required"
  - 400: "Monthly limit must be greater than 0"
- PATCH /vendors/:id validation (same as POST)

---

## Feature 4: Delete Dialogs - Instant Progress Indicators

### FLOW_CONTRACT.md §5a, §7a - Delete Dialogs
- **On confirm button press**:
  1. Immediately disable both buttons
  2. Show CircularProgressIndicator INSIDE dialog (centered, below text)
  3. Keep dialog open until DELETE completes
  4. Success: Close dialog + navigate
  5. Error: Re-enable buttons, show error inline

### UI_STATES.md (to be merged)
- Delete Business Dialog: Instant feedback states
- Delete Invoice Dialog: Instant feedback states
- Error handling: Inline error text, retry option

---

## Feature 5: Session Expiry - Auto-Logout with Notice

### FLOW_CONTRACT.md §0 - Global Behaviors
- **Detection**:
  1. Supabase `onAuthStateChange` (SIGNED_OUT/TOKEN_EXPIRED)
  2. Global API interceptor (401/403 responses)
- **Auto-logout flow**:
  1. Clear session/tokens
  2. Reset Riverpod state
  3. Navigate to Login (replace, no back stack)
  4. Show SnackBar: "Session expired. Please log in again."
- **Timing**: < 500ms, no stuck state

### UI_STATES.md (to be merged)
- Session Expired Flow
- Auto-logout sequence
- User notice (SnackBar or Dialog)
- Deduplication (if both detection methods fire)

---

## Implementation Order

**NEXT STEPS** (code implementation):

1. **Feature (2)**: Never auto-create business on upload
   - Backend: Remove auto-create logic
   - Backend: Return extractedVendorNameCandidate
   - Frontend: Update upload flow + modal

2. **Feature (3)**: monthlyLimit required in Add/Edit Business
   - Backend: Validation (required, > 0)
   - Frontend: Field + validation + Save button logic
   - Migration: Make monthlyLimit non-nullable

3. **Feature (4)**: Instant delete dialog loading
   - Frontend: Update delete confirmation dialogs
   - Add loading state inside dialog
   - Error handling inline

4. **Feature (5)**: Session expiry auto-logout
   - Frontend: Auth state listener
   - Frontend: API interceptor
   - Auto-logout + navigate + notice

5. **Feature (1)**: Analytics chart axis + responsive
   - Frontend: Chart axis configuration
   - Responsive breakpoints
   - Label density adjustment

---

## Files Modified

### Spec Files (Committed):
- ✅ `FLOW_CONTRACT.md` (commit 5e5c501)
- ✅ `data-model.md` (commit a083794)
- ⚠️ `UI_STATES.md` (helper file created, needs manual merge)
- ⚠️ `API_CONTRACTS.md` (needs update)

### Implementation Files (Next):
- Backend: `invoices.service.ts`, `invoices.controller.ts`, `vendors.controller.ts`
- Frontend: `home_provider.dart`, `add_edit_vendor_dialog.dart`, delete dialogs, auth interceptor
- Migration: Prisma schema + migration for vendorId nullable, monthlyLimit required

---

## Migration Required

```prisma
// invoices table
ALTER TABLE invoices ALTER COLUMN "vendorId" DROP NOT NULL;

// vendors table
ALTER TABLE vendors ALTER COLUMN "monthlyLimit" SET NOT NULL;
-- WARNING: Existing vendors with NULL monthlyLimit will fail
-- Must set default or update existing records before migration
```

---

## Testing Checklist (After Implementation)

- [ ] Upload invoice → No business auto-created → Modal shows → Can create/assign
- [ ] Add/Edit Business → monthlyLimit required → Validation works → Save disabled until valid
- [ ] Delete Business → Click Ok → Buttons disable instantly → Progress shows → Success/error
- [ ] Delete Invoice → Click Delete → Buttons disable instantly → Progress shows → Success/error
- [ ] Session expires → Auto-logout → Navigate to Login → SnackBar shows
- [ ] Analytics chart → X-axis visible → Y-axis visible → No overflow → Responsive on mobile/tablet/desktop

---

**Status**: Ready for implementation Phase B
**Next Command**: Begin Feature (2) implementation
