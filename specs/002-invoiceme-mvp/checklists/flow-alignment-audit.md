# Flow Alignment Audit Checklist: InvoiceMe (Version 002)

**Purpose**: Verify implementation matches FLOW_CONTRACT exactly  
**Created**: 2026-01-20  
**Version**: 002 (Stabilization)  
**Status**: Audit Checklist

---

## Audit Instructions

For each screen:
1. Open the screen in the running application
2. Check each requirement in the checklist
3. Mark items as complete (✅) or failed (❌)
4. Document any discrepancies in the "Issues" section
5. Re-audit after fixes are applied

**Compliance Standard**: All items must be ✅ for release.

---

## Screen 1: Welcome Screen

### Required UI Elements
- [ ] Text: "Welcome to InvoiceMe" (centered)
- [ ] Button: "Login"
- [ ] Button: "Sign Up"

### Must-Have Navigation
- [ ] Login button → Login Screen
- [ ] Sign Up button → Sign Up Screen

### Loading/Empty/Error States
- [ ] N/A (static screen, no states needed)

### Route Parameters
- [ ] N/A (no parameters)

### Must-NOT-Exist (Forbidden Items)
- [ ] ❌ No additional text beyond "Welcome to InvoiceMe"
- [ ] ❌ No "Forgot Password" link
- [ ] ❌ No social auth buttons (Google, Facebook, etc.)
- [ ] ❌ No app tour/onboarding

### Issues Found
```
(Document any discrepancies here)
```

---

## Screen 2: Login Screen

### Required UI Elements
- [ ] Input: Email
- [ ] Input: Password (obscured)
- [ ] Button: "Enter"

### Must-Have Navigation
- [ ] Enter button (on success) → Home Screen
- [ ] Back navigation → Welcome Screen

### Loading/Empty/Error States
- [ ] **Loading**: Circular progress indicator while authenticating
- [ ] **Loading**: "Enter" button is disabled during loading
- [ ] **Loading**: Email and password inputs are disabled during loading
- [ ] **Error**: SnackBar (red, white text) for invalid credentials
- [ ] **Error**: Error message is user-friendly ("Invalid email or password. Please try again.")
- [ ] **Success**: Silent success (no snackbar), immediate navigation to Home

### Route Parameters
- [ ] N/A (no parameters)

### Must-NOT-Exist (Forbidden Items)
- [ ] ❌ No "Forgot Password" link
- [ ] ❌ No "Remember Me" checkbox
- [ ] ❌ No social auth buttons

### Issues Found
```
(Document any discrepancies here)
```

---

## Screen 3: Sign Up Screen

### Required UI Elements
- [ ] Input: Full Name
- [ ] Input: Email
- [ ] Input: Password (obscured)
- [ ] Input: Business/Personal ID
- [ ] Selector: System Currency (uses currency_picker package)
- [ ] Button: "Enter"

### Must-Have Navigation
- [ ] Enter button (on success) → Home Screen
- [ ] Back navigation → Welcome Screen

### Loading/Empty/Error States
- [ ] **Loading**: Circular progress indicator while creating account
- [ ] **Loading**: "Enter" button is disabled during loading
- [ ] **Loading**: All input fields are disabled during loading
- [ ] **Error**: SnackBar (red, white text) for validation failures
- [ ] **Error**: User-friendly messages (e.g., "Email already exists. Please log in instead.")
- [ ] **Success**: Silent success, immediate navigation to Home

### Route Parameters
- [ ] N/A (no parameters)

### Must-NOT-Exist (Forbidden Items)
- [ ] ❌ No password confirmation field
- [ ] ❌ No terms & conditions checkbox
- [ ] ❌ No email verification step

### Issues Found
```
(Document any discrepancies here)
```

---

## Screen 4: Home Screen

### Required UI Elements - Header
- [ ] Text: "Welcome {User's Full Name}" (top of screen)
- [ ] Icon: Settings (right side)

### Required UI Elements - Empty State (No Businesses)
- [ ] Empty state icon (large, grey)
- [ ] Text: "No businesses yet"
- [ ] Text: "Start by adding a business or uploading an invoice"
- [ ] Button: "Add Business"
- [ ] Button: "Upload an Invoice"

### Required UI Elements - With Businesses State
- [ ] Input: Search (with icon)
- [ ] Icon Button: Add (next to search)
- [ ] Icon Button: Analytics (navigates to Businesses Analysis)
- [ ] List: Business Cards (draggable for reordering)
- [ ] **Each Business Card contains:**
  - [ ] Text: Business name (center)
  - [ ] Icon: Edit (left corner)
  - [ ] Icon: Analytics (next to edit)
  - [ ] Icon: Expander (right corner)
  - [ ] When expanded:
    - [ ] Text: "The latest 5 invoices"
    - [ ] Up to 5 Invoice Cards (sorted by latest datetime)
- [ ] **Each Invoice Card (in expanded business) contains:**
  - [ ] Icon: Edit (left corner)
  - [ ] Text: Invoice name (center) - default is upload datetime
- [ ] Card: "See All" (below business cards)
- [ ] Button: "Upload an Invoice" (bottom of screen)

### Must-Have Navigation
- [ ] Settings icon → Settings Screen
- [ ] Add Business button/icon → Add/Edit Business dialog (modal)
- [ ] Analytics icon (header) → Businesses Analysis Screen
- [ ] Business card edit icon → Add/Edit Business dialog (with businessId)
- [ ] Business card analytics icon → Single Business Analytics Screen (with businessId)
- [ ] Invoice card edit icon → Edit Invoice Screen (with invoiceId)
- [ ] "See All" card → Invoices List Screen
- [ ] Upload button → Upload Invoice modalBottomSheet

### Loading/Empty/Error States
- [ ] **Loading**: Full-screen CircularProgressIndicator (centered) while fetching businesses
- [ ] **Empty State**: Shows empty state UI when no businesses exist
- [ ] **Error**: SnackBar (red) "Failed to load businesses. Pull to refresh or try again later."
- [ ] **Error**: Pull-to-refresh or retry button available

### Route Parameters
- [ ] N/A (no parameters)

### API Interactions
- [ ] GET /vendors?includeLatestInvoices=true (called on screen load)
- [ ] Business list refreshes after upload success

### Must-NOT-Exist (Forbidden Items)
- [ ] ❌ NO tabs or tab navigation
- [ ] ❌ NO filters or sorting options beyond search
- [ ] ❌ NO business logo/image
- [ ] ❌ NO invoice preview/thumbnail

### Issues Found
```
(Document any discrepancies here)
```

---

## Screen 5: Add/Edit Business Dialog

### Required UI Elements
- [ ] Input: Business name
- [ ] Input: Business order (default: last position)
- [ ] Button: "Save"
- [ ] Button: "Delete" (only if editing existing business)

### Must-Have Navigation
- [ ] Save button → closes dialog, returns to Home Screen
- [ ] Delete button → opens Delete Business Confirmation dialog
- [ ] Close/Cancel (implicit) → closes dialog, returns to Home Screen

### Loading/Empty/Error States
- [ ] **Loading (Save)**: "Save" button shows CircularProgressIndicator (small)
- [ ] **Loading (Save)**: "Save" and "Delete" buttons are disabled
- [ ] **Loading (Save)**: Business name input is disabled
- [ ] **Loading (Delete)**: "Ok" button shows CircularProgressIndicator (small)
- [ ] **Loading (Delete)**: Both "Ok" and "Cancel" buttons are disabled
- [ ] **Error (Save)**: SnackBar (red) "Failed to save business. Please try again."
- [ ] **Error (Save)**: Dialog remains open
- [ ] **Error (Delete)**: SnackBar (red) "Failed to delete business. Please try again."
- [ ] **Error (Delete)**: Both dialogs remain open
- [ ] **Success (Save)**: Dialogs dismiss, Home Screen refreshes, no snackbar
- [ ] **Success (Delete)**: Dialogs dismiss, Home Screen refreshes, SnackBar (green) "Business and related invoices deleted."

### Route Parameters
- [ ] `businessId` (UUID, optional) - If null: create mode; if provided: edit mode

### API Interactions
- [ ] POST /vendors (if creating new business)
- [ ] PATCH /vendors/:id (if editing existing business)
- [ ] DELETE /vendors/:id (if delete confirmed)

### Must-NOT-Exist (Forbidden Items)
- [ ] ❌ NO business logo upload
- [ ] ❌ NO monthly limit field (set in analytics screen)
- [ ] ❌ NO address/contact fields
- [ ] ❌ NO category/tags

### Issues Found
```
(Document any discrepancies here)
```

---

## Screen 5a: Delete Business Confirmation Dialog

### Required UI Elements
- [ ] Text: "Are you sure you want to delete the business? If you do it all of the related invoices will be deleted as well."
- [ ] Button: "Cancel"
- [ ] Button: "Ok"

### Must-Have Navigation
- [ ] Cancel button → closes dialog, returns to Add/Edit Business dialog
- [ ] Ok button → deletes business, closes both dialogs, returns to Home Screen

### Loading/Empty/Error States
- [ ] **Loading**: "Ok" button shows CircularProgressIndicator (small)
- [ ] **Loading**: "Ok" and "Cancel" buttons are disabled
- [ ] **Error**: SnackBar (red) "Failed to delete business. Please try again."

### Route Parameters
- [ ] Inherits businessId from Add/Edit Business Dialog

### API Interactions
- [ ] DELETE /vendors/:id (cascades to invoices)

### Must-NOT-Exist (Forbidden Items)
- [ ] ❌ NO "Move invoices to another business" option
- [ ] ❌ NO "Archive instead of delete" option

### Issues Found
```
(Document any discrepancies here)
```

---

## Screen 6: Upload Invoice modalBottomSheet

### Required UI Elements
- [ ] Option: "Upload Image"
- [ ] Option: "Upload PDF"

### Must-Have Navigation
- [ ] Upload Image → device image picker → processing → closes modalBottomSheet, returns to Home Screen
- [ ] Upload PDF → device PDF picker → processing → closes modalBottomSheet, returns to Home Screen

### Loading/Empty/Error States
- [ ] **Upload Stage 1 (File Selection)**: modalBottomSheet with two options
- [ ] **Upload Stage 2 (Uploading)**: Overlay (semi-transparent dark background)
- [ ] **Upload Stage 2**: CircularProgressIndicator (center)
- [ ] **Upload Stage 2**: Text "Uploading..." (below spinner)
- [ ] **Upload Stage 2**: modalBottomSheet dismisses
- [ ] **Upload Stage 3 (OCR)**: Text "Processing OCR..." (below spinner)
- [ ] **Upload Stage 4 (Extracting)**: Text "Extracting data..." (below spinner)
- [ ] **Upload Stage 5 (Saving)**: Text "Saving invoice..." (below spinner)
- [ ] **Success**: Overlay dismissed
- [ ] **Success**: SnackBar (green) with vendor name and review status
- [ ] **Success (needsReview=false)**: Message "Invoice uploaded successfully! Added to {Vendor Name}."
- [ ] **Success (needsReview=true)**: Message "Invoice uploaded but needs review. Please check {Vendor Name}."
- [ ] **Success**: Action button "VIEW" → navigates to /invoices
- [ ] **Success**: Business list refreshes (new invoice appears)
- [ ] **Failure**: Overlay dismissed
- [ ] **Failure**: SnackBar (red) with specific error message

### Route Parameters
- [ ] N/A (modal, no route)

### API Interactions
- [ ] POST /invoices/upload (multipart file)
- [ ] Processing: OCR → LLM extraction → Currency conversion → Vendor matching → DB save

### Must-NOT-Exist (Forbidden Items)
- [ ] ❌ NO "Take Photo" option (only upload existing files)
- [ ] ❌ NO manual data entry fields
- [ ] ❌ NO preview before upload
- [ ] ❌ NO batch upload (one file at a time)

### Issues Found
```
(Document any discrepancies here)
```

---

## Screen 7: Edit Invoice Screen

### Required UI Elements
- [ ] **Invoice Name Card:**
  - [ ] Text: Current invoice name
  - [ ] Icon: Edit (left)
- [ ] **Amount Card:**
  - [ ] Text: Amount number
  - [ ] Text: Currency (next to amount)
  - [ ] Icon: Edit (left)
- [ ] **Invoice Date Card:**
  - [ ] Text: Current date
  - [ ] Icon: Calendar (next to date)
- [ ] **Business Name Card:**
  - [ ] Text: Assigned business name
  - [ ] Icon: Expander
  - [ ] When expanded: List of user's businesses
  - [ ] When expanded: "Add Business" card (if business doesn't exist)
- [ ] Button: "Save" (bottom)
- [ ] Button: "Delete Invoice" (bottom)

### Must-Have Navigation
- [ ] Edit name icon → name edit popup (centered dialog)
- [ ] Edit amount icon → amount edit popup (centered dialog)
- [ ] Calendar icon → date picker (modal)
- [ ] Business expander → business list dropdown
- [ ] Add Business card (in dropdown) → Add/Edit Business dialog
- [ ] Save button → Home Screen
- [ ] Delete button → Delete Invoice Confirmation dialog
- [ ] Back navigation → Home Screen

### Loading/Empty/Error States
- [ ] **Loading (Initial)**: Full-screen CircularProgressIndicator (centered)
- [ ] **Error (Load Failure)**: SnackBar (red) "Failed to load invoice. Please try again."
- [ ] **Error (Load Failure)**: Automatic back navigation to Home Screen
- [ ] **Loading (Save)**: "Save" button shows CircularProgressIndicator (small)
- [ ] **Loading (Save)**: "Save" and "Delete" buttons are disabled
- [ ] **Loading (Save)**: All input fields are disabled
- [ ] **Loading (Delete)**: "Ok" button shows CircularProgressIndicator (small)
- [ ] **Loading (Delete)**: "Ok" and "Cancel" buttons are disabled
- [ ] **Error (Save)**: SnackBar (red) "Failed to save invoice. Please try again."
- [ ] **Error (Save)**: Screen remains open
- [ ] **Error (Delete)**: SnackBar (red) "Failed to delete invoice. Please try again."
- [ ] **Error (Delete)**: Dialog remains open
- [ ] **Success (Save)**: Navigate to Home Screen, SnackBar (green) "Invoice updated successfully."
- [ ] **Success (Delete)**: Navigate to Home Screen, SnackBar (green) "Invoice deleted successfully."

### Route Parameters
- [ ] `invoiceId` (UUID, required) - Must exist in database for current tenant

### API Interactions
- [ ] PATCH /invoices/:id (for updates)
- [ ] DELETE /invoices/:id (for deletion)

### Must-NOT-Exist (Forbidden Items)
- [ ] ❌ NO file re-upload option
- [ ] ❌ NO OCR re-run option
- [ ] ❌ NO line items editing
- [ ] ❌ NO notes/tags fields

### Issues Found
```
(Document any discrepancies here)
```

---

## Screen 7a: Delete Invoice Confirmation Dialog

### Required UI Elements
- [ ] Text: "Are you sure you want to delete the invoice?"
- [ ] Button: "Cancel"
- [ ] Button: "Ok"

### Must-Have Navigation
- [ ] Cancel button → closes dialog, returns to Edit Invoice Screen
- [ ] Ok button → deletes invoice, closes dialog, returns to Home Screen

### Loading/Empty/Error States
- [ ] **Loading**: "Ok" button shows CircularProgressIndicator (small)
- [ ] **Loading**: "Ok" and "Cancel" buttons are disabled
- [ ] **Error**: SnackBar (red) "Failed to delete invoice. Please try again."

### Route Parameters
- [ ] Inherits invoiceId from Edit Invoice Screen

### API Interactions
- [ ] DELETE /invoices/:id

### Must-NOT-Exist (Forbidden Items)
- [ ] ❌ NO "Archive instead of delete" option

### Issues Found
```
(Document any discrepancies here)
```

---

## Screen 8: Invoices List Screen

### Required UI Elements
- [ ] Input: "Search invoices" (top)
- [ ] List: Invoice Cards (grouped by month/year)
- [ ] **Each Month/Year Group:**
  - [ ] Text: Month and Year (e.g., "January 2026")
  - [ ] Icon: Expander (right)
  - [ ] When expanded: List of Invoice Cards
- [ ] **Each Invoice Card:**
  - [ ] Icon: Edit (left)
  - [ ] Text: Invoice name (center)
- [ ] Pagination: Lazy loading (scroll to load more)

### Must-Have Navigation
- [ ] Edit icon → Edit Invoice Screen (with invoiceId)
- [ ] Back navigation → Home Screen

### Loading/Empty/Error States
- [ ] **Loading (Initial)**: Full-screen CircularProgressIndicator (centered)
- [ ] **Loading (Refresh)**: Small spinner at top (pull-to-refresh indicator)
- [ ] **Empty State**: Icon (large, grey), "No invoices yet", "Upload your first invoice to get started", Upload button
- [ ] **Error**: SnackBar (red) "Failed to load invoices. Pull to refresh or try again later."
- [ ] **Error**: Pull-to-refresh or retry button available
- [ ] **Loading (Pagination)**: Small CircularProgressIndicator at bottom of list
- [ ] **Loading (Pagination)**: Existing invoices remain visible

### Route Parameters
- [ ] N/A (no parameters)

### API Interactions
- [ ] GET /invoices?search=...&page=...&groupByMonth=true

### Must-NOT-Exist (Forbidden Items)
- [ ] ❌ NO filters (date range, amount range, business filter) - only search
- [ ] ❌ NO sorting options (always sorted by date descending)
- [ ] ❌ NO bulk actions (select multiple, bulk delete)
- [ ] ❌ NO invoice preview/details inline

### Issues Found
```
(Document any discrepancies here)
```

---

## Screen 9: Settings Screen

### Required UI Elements
- [ ] **User Name Card:**
  - [ ] Text: Current user name
  - [ ] Icon: Edit (left)
- [ ] **System Currency Card:**
  - [ ] Text: Current system currency
  - [ ] Icon: Edit

### Must-Have Navigation
- [ ] Edit name icon → name edit dialog (centered modal)
- [ ] Edit currency icon → currency picker modalBottomSheet
- [ ] Back navigation → Home Screen

### Loading/Empty/Error States
- [ ] **Loading (Initial)**: Full-screen CircularProgressIndicator (centered)
- [ ] **Error (Load Failure)**: SnackBar (red) "Failed to load settings. Please try again."
- [ ] **Error (Load Failure)**: Retry button available
- [ ] **Loading (Save Name)**: "Save" button shows CircularProgressIndicator (small)
- [ ] **Loading (Save Name)**: "Save" button is disabled, name input is disabled
- [ ] **Loading (Save Currency)**: Currency picker sheet dismisses, small spinner next to currency field
- [ ] **Error (Save)**: SnackBar (red) "Failed to update settings. Please try again."
- [ ] **Success (Save)**: SnackBar (green) "Settings updated successfully.", updated value appears in UI

### Route Parameters
- [ ] N/A (no parameters)

### API Interactions
- [ ] PATCH /users/me (for name update)
- [ ] PATCH /settings/currency (for currency update)

### Must-NOT-Exist (Forbidden Items)
- [ ] ❌ NO email change option
- [ ] ❌ NO password change option
- [ ] ❌ NO profile picture upload
- [ ] ❌ NO notification settings
- [ ] ❌ NO theme/appearance settings
- [ ] ❌ NO language settings

### Issues Found
```
(Document any discrepancies here)
```

---

## Screen 10: Single Business Analytics Screen

### Required UI Elements
- [ ] Icon Button: Share/Export (right top corner)
- [ ] **KPI Cards (Grid layout: 2 cards per row):**
  - [ ] Card 1: Current Monthly Spent (with overage warning in red if > limit)
  - [ ] Card 2: Monthly Limit (with Edit icon)
  - [ ] Card 3: Monthly AVG
  - [ ] Card 4: Yearly AVG
- [ ] **Pie Chart**: "5 most spent items in the current month"
- [ ] **Line Chart**: "Spending by months"

### Must-Have Navigation
- [ ] Share/Export button → (export functionality, UI TBD)
- [ ] Edit monthly limit icon → monthly limit edit popup (centered modal)
- [ ] Back navigation → Home Screen

### Loading/Empty/Error States
- [ ] **Loading (Initial)**: Full-screen CircularProgressIndicator (centered)
- [ ] **Error (Load Failure)**: SnackBar (red) "Failed to load analytics. Pull to refresh or try again later."
- [ ] **Error (Load Failure)**: Retry button or pull-to-refresh available
- [ ] **Loading (Update Limit)**: "Save" button shows CircularProgressIndicator (small)
- [ ] **Loading (Update Limit)**: "Save" button is disabled, limit input is disabled
- [ ] **Error (Update Limit)**: SnackBar (red) "Failed to update limit. Please try again."
- [ ] **Error (Update Limit)**: Dialog remains open
- [ ] **Success (Update Limit)**: Dialog dismisses, KPI cards refresh, SnackBar (green) "Monthly limit updated."
- [ ] **Empty State (No Data)**: KPI cards show "0" or "N/A", charts show empty placeholders, text "No invoices for this business yet. Upload invoices to see analytics."

### Route Parameters
- [ ] `businessId` (UUID, required) - Must exist in database for current tenant

### API Interactions
- [ ] GET /analytics/vendor/:businessId (returns aggregated KPIs + charts)
- [ ] PATCH /analytics/vendor/:businessId/limit (updates monthly limit)

### Must-NOT-Exist (Forbidden Items) - CRITICAL
- [ ] ❌ **NO "Invoices" tab** (CRITICAL: This violates FLOW_CONTRACT)
- [ ] ❌ **NO tabs of any kind on this screen**
- [ ] ❌ NO invoice list embedded in this screen
- [ ] ❌ NO drill-down to individual invoices from charts
- [ ] ❌ NO date range filters
- [ ] ❌ NO comparison to other businesses

### Issues Found
```
(Document any discrepancies here)
```

---

## Screen 11: Businesses Analysis Screen

### Required UI Elements
- [ ] Icon Button: Share/Export (right top corner)
- [ ] **KPI Card:**
  - [ ] Card: Remaining Balance (total limits - total spent)
- [ ] **Pie Chart**: "5 most expensive businesses"
- [ ] **Line Chart**: "Overall Spending by months"

### Must-Have Navigation
- [ ] Share/Export button → (export functionality, UI TBD)
- [ ] Back navigation → Home Screen

### Loading/Empty/Error States
- [ ] **Loading (Initial)**: Full-screen CircularProgressIndicator (centered)
- [ ] **Error (Load Failure)**: SnackBar (red) "Failed to load analytics. Pull to refresh or try again later."
- [ ] **Error (Load Failure)**: Retry button or pull-to-refresh available
- [ ] **Empty State (No Data)**: Icon (large, grey), "No analytics available", "Add businesses and upload invoices to see your spending analytics", "Go to Home" button

### Route Parameters
- [ ] N/A (no parameters)

### API Interactions
- [ ] GET /analytics/overall (returns aggregated KPIs + charts)

### Must-NOT-Exist (Forbidden Items)
- [ ] ❌ NO tabs
- [ ] ❌ NO per-business drill-down (use Single Business Analytics instead)
- [ ] ❌ NO invoice list
- [ ] ❌ NO date range filters
- [ ] ❌ NO budget projections

### Issues Found
```
(Document any discrepancies here)
```

---

## Global Checks

### Forbidden Features (Application-Wide)
- [ ] ❌ **NO "Invoices" tab in Single Business Analytics Screen** (CRITICAL)
- [ ] ❌ NO tabs in Single Business Analytics Screen
- [ ] ❌ NO forgot password functionality
- [ ] ❌ NO social authentication
- [ ] ❌ NO multi-user collaboration
- [ ] ❌ NO business logo/image uploads
- [ ] ❌ NO invoice line items editing
- [ ] ❌ NO recurring invoice detection
- [ ] ❌ NO payment tracking
- [ ] ❌ NO invoice approval workflows
- [ ] ❌ NO notifications system
- [ ] ❌ NO dark mode toggle
- [ ] ❌ NO language switching

### Forbidden UI Patterns (Application-Wide)
- [ ] ❌ NO hamburger menu / drawer navigation
- [ ] ❌ NO bottom tab bar
- [ ] ❌ NO breadcrumbs
- [ ] ❌ NO wizards/multi-step forms
- [ ] ❌ NO drag-and-drop for invoices (only for businesses on Home Screen)

### Forbidden Data Modifications (Application-Wide)
- [ ] ❌ NO soft delete (hard delete only)
- [ ] ❌ NO invoice versioning/history
- [ ] ❌ NO undo/redo functionality
- [ ] ❌ NO batch operations

### Route Validation
- [ ] **Forbidden Routes NOT Implemented:**
  - [ ] ❌ /vendor/:id/invoices
  - [ ] ❌ /vendor/:id/analytics/invoices
  - [ ] ❌ /forgot-password
  - [ ] ❌ /reset-password
  - [ ] ❌ /profile
  - [ ] ❌ /notifications
  - [ ] ❌ /help or /support

### Back Navigation Behavior
- [ ] Welcome → Exit app
- [ ] Login → Welcome
- [ ] Sign Up → Welcome
- [ ] Home → Exit app
- [ ] Settings → Home
- [ ] Invoices List → Home
- [ ] Edit Invoice → Home
- [ ] Single Business Analytics → Home
- [ ] Businesses Analysis → Home

---

## Audit Summary

**Total Checks**: (Count upon completion)  
**Passed**: ___  
**Failed**: ___  
**Compliance Rate**: ____%

**Critical Issues** (must fix before release):
```
(List all ❌ critical failures here, especially "Invoices tab" in Single Business Analytics)
```

**Non-Critical Issues** (should fix):
```
(List all other failures here)
```

**Audit Status**:
- [ ] ✅ All checks passed (100% compliance)
- [ ] ❌ Failures detected (re-audit after fixes)

---

## Version Control

| Version | Date | Auditor | Status |
|---------|------|---------|--------|
| 002 | 2026-01-20 | (TBD) | Initial audit pending |

---

**END OF FLOW ALIGNMENT AUDIT CHECKLIST**
