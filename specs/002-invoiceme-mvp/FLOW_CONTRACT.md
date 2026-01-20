# Flow Contract: InvoiceMe (Version 002)

**Purpose**: Authoritative contract defining EXACT UI flows, navigation, and screen requirements  
**Created**: 2026-01-20  
**Version**: 002 (Stabilization)  
**Status**: AUTHORITATIVE - Implementation MUST match this contract exactly

---

## Document Purpose

This contract serves as the single source of truth for:
1. What UI elements MUST exist on each screen
2. What navigation edges ARE allowed
3. What features MUST NOT exist on each screen
4. Loading/error/empty states for each screen

**Compliance Requirement**: Any deviation from this contract is considered spec drift and must be corrected.

---

## Global Behaviors

### Session Expiry & Auto-Logout

**Purpose**: Handle Supabase session expiration gracefully and force logout with clear user notice.

**Detection Methods**:
1. **Supabase Auth State Listener**:
   - Listen to `onAuthStateChange` events
   - If event is `SIGNED_OUT` or `TOKEN_EXPIRED` → trigger auto-logout

2. **Backend 401/403 Response Interceptor**:
   - Globally intercept all API responses
   - If status is 401 or 403 → trigger auto-logout

**Auto-Logout Flow**:
1. Clear local session/tokens
2. Reset Riverpod auth state
3. Navigate to Login Screen (replace, no back stack)
4. Show notice:
   - **SnackBar** (preferred): "Session expired. Please log in again."
   - **OR Dialog**: "Your session has expired. Please log in again to continue." (with OK button)

**Timing**:
- Logout must happen **immediately** on detection
- User should never remain stuck in partially-authenticated state

**Must NOT Exist**:
- ❌ No silent failure (user must see notice)
- ❌ No "Re-authenticate" button with current screen (must navigate to Login)
- ❌ No retry logic for expired tokens (must login again)

---

## Screen Contracts

### 1. Welcome Screen

**Purpose**: Entry point for unauthenticated users to choose login or signup.

**Required UI Elements**:
- Text: "Welcome to InvoiceMe" (centered)
- Button: "Login" → navigates to Login Screen
- Button: "Sign Up" → navigates to Sign Up Screen

**Allowed Navigation**:
- Login button → Login Screen
- Sign Up button → Sign Up Screen

**Loading/Empty/Error States**:
- N/A (static screen)

**Required API Interactions**:
- None

**Must NOT Exist**:
- ❌ No additional text or content beyond "Welcome to InvoiceMe"
- ❌ No forgot password link (not in spec)
- ❌ No social auth buttons
- ❌ No app tour/onboarding

---

### 2. Login Screen

**Purpose**: Authenticate existing users with email and password.

**Required UI Elements**:
- Input: Email
- Input: Password (obscured)
- Button: "Enter" → submits login

**Allowed Navigation**:
- Enter button (on success) → Home Screen
- Back navigation → Welcome Screen

**Loading/Empty/Error States**:
- **Loading**: Circular progress indicator while authenticating
- **Error**: Display error message if credentials invalid (inline or snackbar)

**Required API Interactions**:
- POST /auth/login (email, password) → returns access token + user data

**Must NOT Exist**:
- ❌ No "Forgot Password" link
- ❌ No "Remember Me" checkbox
- ❌ No social auth buttons
- ❌ No inline validation errors (Version 002 adds this, but not in original flow)

---

### 3. Sign Up Screen

**Purpose**: Register new users with required profile information.

**Required UI Elements**:
- Input: Full Name
- Input: Email
- Input: Password (obscured)
- Input: Business/Personal ID
- Selector: System Currency (uses currency_picker package, shows all currencies)
- Button: "Enter" → submits registration

**Allowed Navigation**:
- Enter button (on success) → Home Screen
- Back navigation → Welcome Screen

**Loading/Empty/Error States**:
- **Loading**: Circular progress indicator while creating account
- **Error**: Display error message if email exists or validation fails

**Required API Interactions**:
- POST /auth/signup (fullName, email, password, personalBusinessId, systemCurrency) → returns access token + user data

**Must NOT Exist**:
- ❌ No password confirmation field
- ❌ No terms & conditions checkbox
- ❌ No email verification step
- ❌ No inline validation (Version 002 adds this, but not in original flow)

---

### 4. Home Screen

**Purpose**: Central hub showing user's businesses and invoices with quick access to upload.

**Required UI Elements**:

**Header**:
- Text: "Welcome {User's Full Name}" (top of screen)
- Icon: Settings (right side) → navigates to Settings Screen

**Empty State** (no businesses exist):
- Button: "Add Business" → opens Add/Edit Business dialog
- Button: "Upload an Invoice" → opens upload modalBottomSheet

**With State** (businesses exist):
- Input: Search (with icon, placeholder "Search businesses...") → filters business list by name (client-side)
- Icon Button: Add (next to search) → opens Add/Edit Business dialog
- Icon Button: Analytics → navigates to Businesses Analysis Screen
- List: Business Cards (draggable for reordering)
  - Each Business Card contains:
    - Text: Business name (center)
    - Icon: Edit (left corner) → opens Add/Edit Business dialog for this business
    - Icon: Analytics (next to edit) → navigates to Single Business Analytics Screen
    - Icon: Expander (right corner) → expands/collapses invoice list
    - When expanded:
      - Text: "The latest 5 invoices"
      - List: Up to 5 Invoice Cards (sorted by latest datetime)
        - Each Invoice Card contains:
          - Icon: Edit (left corner) → navigates to Edit Invoice Screen
          - Text: Invoice name (center) - default is upload datetime (day, month, year, time)
- Card: "See All" (below business cards) → navigates to Invoices List Screen
- Button: "Upload an Invoice" (bottom of screen) → opens upload modalBottomSheet

**Allowed Navigation**:
- Settings icon → Settings Screen
- Add Business button/icon → Add/Edit Business dialog (modal)
- Analytics icon (header) → Businesses Analysis Screen
- Business card edit icon → Add/Edit Business dialog (modal) for specific business
- Business card analytics icon → Single Business Analytics Screen (with businessId)
- Invoice card edit icon → Edit Invoice Screen (with invoiceId)
- "See All" card → Invoices List Screen
- Upload button → Upload Invoice modalBottomSheet

**Loading/Empty/Error States**:
- **Loading**: Circular progress indicator while fetching businesses/invoices
- **Empty State**: Show "Add Business" and "Upload an Invoice" buttons
- **Error**: Display error message if businesses/invoices fail to load

**Required API Interactions**:
- GET /vendors?includeLatestInvoices=true → returns businesses with latest 5 invoices each
- POST /vendors/reorder (vendorIds[]) → updates business display order (on drag-and-drop)

**Must NOT Exist**:
- ❌ No tabs or tab navigation
- ❌ No "All Businesses" navigation beyond the analytics button
- ❌ No filters or sorting options beyond the search
- ❌ No business logo/image
- ❌ No invoice preview/thumbnail

---

### 5. Add/Edit Business Dialog

**Purpose**: Create new business or edit existing business name/order.

**Required UI Elements**:
- Input: Business name
- Input: Business order (default: last position)
- Input: Monthly Limit (numeric, required, > 0)
  - Label: "Monthly spending limit"
  - Validation: Must be a positive number
  - Error message: "Monthly limit is required and must be greater than 0"
- Button: "Save" → saves changes (disabled until all validations pass), closes dialog, returns to Home Screen with updated list
- Button: "Delete" (only if editing existing business) → opens Delete Confirmation dialog

**Allowed Navigation**:
- Save button → closes dialog, returns to Home Screen
- Delete button → opens Delete Confirmation dialog
- Close/Cancel (implicit) → closes dialog, returns to Home Screen

**Loading/Empty/Error States**:
- **Loading**: Circular progress indicator while saving/deleting
- **Error**: Display error message if save/delete fails

**Required API Interactions**:
- POST /vendors (name, displayOrder) → creates new business (if adding)
- PATCH /vendors/:id (name, displayOrder) → updates business (if editing)
- DELETE /vendors/:id → deletes business (if delete confirmed)

**Must NOT Exist**:
- ❌ No business logo upload
- ❌ No monthly limit field (added in analytics screen, not here)
- ❌ No address/contact fields
- ❌ No category/tags

---

### 4a. Upload Invoice Modal → Post-Upload Assignment Modal (NEW)

**Purpose**: Upload invoice file and immediately assign to business (MANDATORY flow)

**Upload Modal** (modalBottomSheet on "Upload an Invoice" button):

**Required UI Elements**:
- Radio buttons / Segmented control:
  - "Upload Image" (file picker, gallery only)
  - "Upload PDF" (file picker, PDF only)
- Button: "Upload" → triggers file picker based on selection

**Allowed Navigation**:
- Upload button → triggers file picker → uploads file → opens Post-Upload Assignment Modal (MANDATORY)
- Cancel/Close → closes modal, returns to previous screen

**Loading/Empty/Error States**:
- **Loading**: Progress indicator with stages (uploading → OCR → extracting → saving)
- **Error**: Display error message if upload fails, allow retry

**Required API Interactions**:
- POST /invoices/upload (file) → returns invoice + extracted vendor + confidence

**Must NOT Exist**:
- ❌ No camera capture option (removed, gallery + PDF only)
- ❌ No direct vendor selection in upload modal (use post-upload assignment instead)

---

**Post-Upload Assignment Modal** (MANDATORY, always shown after successful upload):

**Purpose**: Assign uploaded invoice to a business (always required, even if vendor extracted)

**Required UI Elements**:
- Text: "Assign invoice to business" (header)
- Text: "Extracted: [Vendor Name]" (if LLM extracted vendor with confidence > 0.7, show pre-selected)
- Dropdown/Autocomplete: Existing businesses (typeahead search)
  - Pre-selected: Extracted vendor (if exists and confident)
  - Placeholder: "Search or select business..."
- Button: "+ Create New Business" (inline) → shows input field below dropdown:
  - Input: Business name
  - Button: "Create" → creates vendor, selects it, enables Confirm
  - Button: "Cancel" → hides input field
- Button: "Confirm" (primary, enabled when business selected/created) → assigns invoice, closes modal, returns to Home Screen
- Button: "Skip for Now" (secondary) → leaves invoice with extracted vendor (may set needsReview=true if extraction failed), closes modal

**Allowed Navigation**:
- Confirm button → assigns invoice to selected business, closes modal, returns to Home Screen with success message
- Skip button → closes modal, returns to Home Screen (invoice assigned to extracted vendor or marked needsReview)
- Back/Cancel → closes modal, invoice remains with extracted vendor, returns to Home Screen

**Loading/Empty/Error States**:
- **Loading**: Circular progress indicator while loading business list
- **Loading**: Circular progress indicator on Confirm/Create buttons while saving
- **Error**: Display error message if business creation or assignment fails

**Required API Interactions**:
- GET /vendors → fetches business list for dropdown (with search/typeahead)
- POST /vendors (if creating inline) → creates new business
- PATCH /invoices/:id (vendorId) → assigns invoice to selected business (if different from extracted)

**Must NOT Exist**:
- ❌ No "Don't show again" option (assignment is MANDATORY UX, always shown)
- ❌ No multi-select or batch assignment

**Business Logic (CRITICAL - Updated v2.0)**:
- **NEVER auto-create business** during upload:
  - Backend DOES NOT create Vendor record automatically
  - Invoice is saved with `vendorId = null` + `needsReview = true`
  - Backend returns `extractedVendorNameCandidate` in upload response
- Post-upload modal behavior:
  - If LLM extracted vendor name: prefill "Create New Business" input with extracted name
  - Dropdown shows existing businesses only (no auto-match)
  - User MUST explicitly:
    1. Select existing business from dropdown, OR
    2. Create new business (uses prefilled name or custom name)
  - Only after Confirm: assign invoice.vendorId via PATCH /invoices/:id
- "Skip for Now" → invoice stays with `vendorId = null` + `needsReview = true`
- After assignment: invoice can always be reassigned later in Edit Invoice Screen

---

### 5a. Delete Business Confirmation Dialog

**Purpose**: Confirm business deletion with warning about cascading invoice deletion.

**Required UI Elements**:
- Text: "Are you sure you want to delete the business? If you do it all of the related invoices will be deleted as well."
- Button: "Cancel" → closes dialog, returns to Add/Edit Business dialog
- Button: "Ok" → deletes business, closes dialogs, returns to Home Screen with updated list

**Allowed Navigation**:
- Cancel button → closes dialog, returns to Add/Edit Business dialog
- Ok button → closes dialogs, returns to Home Screen

**Loading/Empty/Error States**:
- **Loading**: On "Ok" button press:
  1. Immediately disable both Cancel and Ok buttons
  2. Show CircularProgressIndicator INSIDE the dialog (below text, centered)
  3. Keep dialog open until DELETE request completes
  4. On success: close dialog + navigate to Home Screen with updated list
  5. On error: hide progress indicator, re-enable buttons, show error text in dialog
- **Error**: Display error message inline in dialog if delete fails, allow retry

**Required API Interactions**:
- DELETE /vendors/:id → deletes business and cascades to invoices

**Must NOT Exist**:
- ❌ No "Move invoices to another business" option
- ❌ No "Archive instead of delete" option

---

### 6. Upload Invoice modalBottomSheet (DEPRECATED - See §4a)

**Note**: This section is deprecated. Upload flow is now defined in §4a (Upload Modal → Post-Upload Assignment Modal).

For backwards compatibility reference:
- Upload is now triggered via "Upload an Invoice" button on Home Screen
- Opens Upload Modal (§4a) with Image/PDF selection
- On success, ALWAYS opens Post-Upload Assignment Modal (§4a)
- Camera capture removed (gallery + PDF only)

---

### 6a. Duplicate Invoice Detection Dialog (NEW v2.0)

**Purpose**: Prevent duplicate invoice uploads by detecting previously uploaded files via SHA-256 hash comparison.

**Trigger**: Before upload starts, after user selects file (image or PDF)

**Detection Flow**:
1. Frontend computes SHA-256 hash of selected file bytes
2. Frontend calls `POST /invoices/check-duplicate` with fileHash
3. If duplicate detected (200 OK response): show Duplicate Invoice Dialog
4. If not duplicate (404 Not Found response): proceed with normal upload flow

**Required UI Elements**:
- Dialog: "Invoice Already Exists"
- Icon: Warning icon (orange/yellow)
- Text (primary): "This invoice was already uploaded on {date}"
- Text (secondary): Details of existing invoice:
  - "Business: {vendorName}"
  - "Amount: {originalAmount} {originalCurrency}"
  - "Date: {invoiceDate formatted}"
  - "Invoice #: {invoiceNumber or 'N/A'}"
- Button: "View Existing Invoice" (primary) → closes dialog, navigates to Invoice Detail Screen with existingInvoiceId
- Button: "Cancel" (secondary) → closes dialog, returns to previous screen

**Allowed Navigation**:
- View Existing Invoice button → Invoice Detail Screen (with existingInvoiceId from API response)
- Cancel button → closes dialog, returns to Home Screen or previous screen
- Back/Close → closes dialog, returns to Home Screen

**Loading/Empty/Error States**:
- **Loading (hash computation)**: Small inline spinner next to file picker while computing hash (< 100ms for typical files)
- **Loading (API check)**: Small inline spinner while checking duplicate via API (< 500ms)
- **Error (API check fails)**: Proceed with upload anyway (fail-open for UX, backend will catch duplicate on upload)

**Required API Interactions**:
- POST /invoices/check-duplicate → body: `{ "fileHash": "sha256:abc123..." }`
  - Response 200 OK if duplicate exists: `{ "isDuplicate": true, "existingInvoice": { "id": "...", "name": "...", "vendorName": "...", "originalAmount": 150.00, "originalCurrency": "USD", "invoiceDate": "2026-01-15", "createdAt": "2026-01-10T10:00:00Z" } }`
  - Response 404 Not Found if not duplicate: `{ "isDuplicate": false }`

**Must NOT Exist**:
- ❌ No "Upload Anyway" option (duplicate detection is absolute)
- ❌ No "This is a different invoice" override
- ❌ No duplicate detection bypass

**Business Logic**:
- Hash computation uses SHA-256 algorithm (standard crypto library)
- Hash comparison is case-insensitive (backend normalizes to lowercase)
- Duplicate detection is per-tenant (backend scopes by tenantId)
- If API check fails (network error, timeout): proceed with upload (backend will catch duplicate and return 409 Conflict)
- If upload returns 409 Conflict: show same Duplicate Invoice Dialog with existing invoice details from error response

**Performance Requirements**:
- Hash computation: < 200ms for 10MB file
- API check: < 500ms (backend query is indexed lookup)
- Total dedupe UX overhead: < 1 second

---

### 7. Edit Invoice Screen (UPDATED v2.0)

**Purpose**: Edit invoice details (name, amount, date, number, business, LINE ITEMS) or delete invoice.

**Required UI Elements**:

**Header Fields**:
- Card: Invoice Name
  - Text: Current invoice name
  - Icon: Edit (left) → opens centered popup:
    - Input: Invoice name
    - Button: "Save" → updates locally, closes popup
- Card: Invoice Number (NEW)
  - Text: Invoice number (or "Not set")
  - Icon: Edit (left) → opens centered popup:
    - Input: Invoice number
    - Button: "Save" → updates locally, closes popup
- Card: Invoice Date
  - Text: Current date (formatted)
  - Icon: Calendar (next to date) → opens calendar picker → updates locally
- Card: Amount
  - Text: Amount number + currency (e.g., "$150.00")
  - Toggle: "Use Items Total" (NEW, below amount)
    - ON (default if items exist): Amount = SUM(items.total), greyed out, edit disabled
    - OFF: Amount editable via edit icon
  - Icon: Edit (left, disabled if toggle ON) → opens centered popup:
    - Input: Amount (number)
    - Button: "Save" → updates locally, closes popup
- Card: Currency (NEW, read-only)
  - Text: Currency code (e.g., "USD")
  - Icon: Info → tooltip "Currency from original invoice, cannot be changed"
- Card: Business Assignment
  - Text: Current assigned business name
  - Icon: Expander (right) → expands to show:
    - Input: Search businesses (typeahead filter)
    - List: Filtered businesses (scrollable)
    - Card: "+ Create New Business" (at bottom):
      - Click → shows inline input:
        - Input: Business name
        - Button: "Create" → creates business, auto-selects, collapses
        - Button: "Cancel" → hides input
    - On select: updates locally, collapses dropdown

**Invoice Items Section** (NEW):
- Section Header: "Line Items" + Badge (e.g., "Line Items (3)" or "Line Items (0)")
- Empty State (no items):
  - Text: "No line items extracted. Add items to itemize this invoice."
  - Button: "+ Add Item" (prominent)
- With Items:
  - List: Invoice Item Cards (each card):
    - Text: Description (main, bold)
    - Text: Details (sub-text): "Qty: X × $Y.YY = $Z.ZZ" (or just "$Z.ZZ" if qty/unitPrice null)
    - Icon: Edit (left) → opens inline edit form below card:
      - Input: Description (required)
      - Input: Quantity (number, nullable, placeholder "e.g., 2.5")
      - Input: Unit Price (number, nullable, placeholder "e.g., 50.25")
      - Input: Total (number, required)
      - Input: Currency (defaults to invoice currency, optional override)
      - Button: "Save" → updates item in local state
      - Button: "Cancel" → closes form, discards changes
    - Icon: Delete (right) → shows inline confirmation:
      - Text: "Delete this item?"
      - Button: "Cancel" / "Delete" → removes from local state
  - Button: "+ Add Item" (at bottom of list) → opens inline add form:
    - Same fields as edit form
    - Button: "Add" → adds to local items array
    - Button: "Cancel" → closes form
  - Text: "Calculated total from items: $XXX.XX" (below list, bold)
  - Note: "Tip: Turn off 'Use Items Total' above to manually override the total"

**Bottom Actions**:
- Button: "Save All Changes" (primary, bottom, prominent) → saves invoice header + items atomically
  - Shows circular indicator while saving
  - On success: returns to Home Screen with success snackbar
  - On error: shows error snackbar, stays on screen
- Button: "Delete Invoice" (bottom, destructive color) → opens Delete Invoice Confirmation dialog

**Allowed Navigation**:
- Edit icons → inline popups (modal)
- Calendar icon → date picker (modal)
- Business expander → dropdown (inline)
- "+ Create New Business" → inline form (in dropdown)
- Item edit → inline form (in list)
- "+ Add Item" → inline form (in list)
- Save button → Home Screen (after successful save)
- Delete button → Delete Invoice Confirmation dialog (modal)
- Back navigation → if unsaved changes: show "Discard changes?" confirmation dialog

**Loading/Empty/Error States**:
- **Loading (on enter)**: Circular progress indicator while fetching invoice + items from API
- **Loading (on save)**: Circular progress indicator on "Save All Changes" button, disable button
- **Error (fetch)**: Error message + "Retry" button if invoice fails to load
- **Error (save)**: Error snackbar with specific message (e.g., "Total mismatch: items total $150 ≠ invoice total $160")
- **Empty Items**: Show "+ Add Item" button prominently with explanatory text

**Required API Interactions**:
- GET /invoices/:id → fetches invoice details including items array: `{ invoice: {...}, items: [{id, description, quantity, unitPrice, total, currency}, ...] }`
- GET /vendors → fetches business list for dropdown (on expander click)
- PATCH /invoices/:id → saves all changes atomically:
  ```json
  {
    "name": "Updated Name",
    "invoiceNumber": "INV-123",
    "originalAmount": 150.00,
    "invoiceDate": "2026-01-15",
    "vendorId": "uuid",
    "useItemsTotal": true,
    "items": [
      {"id": "uuid", "description": "Product A", "quantity": 2, "unitPrice": 50, "total": 100},
      {"description": "Product B", "total": 50} // New item (no id)
    ]
  }
  ```
  - Backend validates: if `useItemsTotal = true`, `originalAmount` must equal `SUM(items.total)`
  - Backend full-replaces items array (DELETE old items not in array, CREATE new items without id, UPDATE items with id)

**Must NOT Exist**:
- ❌ No currency editing (immutable)
- ❌ No file re-upload (delete and upload new instead)
- ❌ No OCR re-run button
- ❌ No notes/tags/attachments
- ❌ No item reordering (saved in array order)
- ❌ No batch editing (one invoice at a time)
- ❌ No inline invoice preview/PDF viewer

**Validation Rules** (enforced by backend, shown as errors to user):
- If `useItemsTotal = true` and items exist: `originalAmount` MUST equal `SUM(items.total)` (within $0.01 tolerance)
- Item description is required
- Item total is required
- Quantity and unitPrice are optional (nullable)
- If item has quantity and unitPrice: total should approximately equal `quantity * unitPrice` (warn if mismatch > 5%)

---

### 7a. Delete Invoice Confirmation Dialog (UPDATED v2.0)

**Purpose**: Confirm invoice deletion with instant loading feedback.

**Required UI Elements**:
- Text: "Are you sure you want to delete this invoice? This action cannot be undone."
- Button: "Cancel" → closes dialog, returns to Edit Invoice Screen
- Button: "Delete" (destructive color) → deletes invoice, closes dialog, returns to previous screen

**Allowed Navigation**:
- Cancel button → closes dialog, returns to Edit Invoice Screen
- Delete button → closes dialog, navigates back to previous screen (Home or Invoices List)

**Loading/Empty/Error States**:
- **Loading**: On "Delete" button press:
  1. Immediately disable both Cancel and Delete buttons
  2. Show CircularProgressIndicator INSIDE the dialog (below text, centered)
  3. Keep dialog open until DELETE request completes
  4. On success: close dialog + navigate back with success snackbar
  5. On error: hide progress indicator, re-enable buttons, show error text in dialog
- **Error**: Display error message inline in dialog if delete fails, allow retry

**Required API Interactions**:
- DELETE /invoices/:id → deletes invoice

**Must NOT Exist**:
- ❌ No "Archive instead of delete" option
- ❌ No "Move to another business" option

---

### 8. Invoices List Screen (UPDATED v2.0)

**Purpose**: View all invoices grouped by month/year with search and pagination.

**Required UI Elements**:
- Input: "Search invoices" (top, with search icon, placeholder "Search by business, amount, number...")
  - Debounced search (300ms delay)
  - Filters invoices by:
    - Vendor/business name (partial match, case-insensitive)
    - Invoice number (partial match)
    - Amount (as string match, e.g., "150" matches "$150.00")
    - Date (as formatted string match, e.g., "Jan" matches "January 2026")
  - Shows loading indicator while searching (server-side search if > 100 invoices, client-side otherwise)
- List: Invoice Cards (grouped by month/year, collapsed by default)
  - Each Month/Year Group:
    - Text: Month and Year + Count (e.g., "January 2026 (5)")
    - Icon: Expander (right) → expands/collapses invoices for that month
    - When expanded:
      - List: Invoice Cards (sorted by date descending)
        - Each Invoice Card:
          - Icon: Edit (left) → navigates to Edit Invoice Screen
          - Text: Invoice name (center, primary)
          - Text: Business name + Amount (sub-text, e.g., "Acme Corp • $150.00")
- Pagination: Lazy loading (scroll to load more, backend pagination with page size 20)

**Allowed Navigation**:
- Edit icon → Edit Invoice Screen (with invoiceId)
- Back navigation → Home Screen (or previous screen)

**Loading/Empty/Error States**:
- **Loading**: Circular progress indicator while fetching invoices
- **Empty State**: "No invoices found" message
- **Error**: Display error message if invoices fail to load

**Required API Interactions**:
- GET /invoices?search=...&page=...&groupByMonth=true → returns invoices grouped by month/year with pagination

**Must NOT Exist**:
- ❌ No filters (date range, amount range, business filter) - only search
- ❌ No sorting options (always sorted by date descending within groups)
- ❌ No bulk actions (select multiple, bulk delete)
- ❌ No invoice preview/details inline

---

### 9. Settings Screen

**Purpose**: Edit user profile (name, system currency).

**Required UI Elements**:
- Card: User Name
  - Text: Current user name
  - Icon: Edit (left) → opens edit dialog with:
    - Input: User name
    - Button: "Save" → updates name, closes dialog
- Card: System Currency
  - Text: Current system currency
  - Icon: Edit → opens modalBottomSheet with:
    - Currency Picker (using currency_picker package, shows all currencies)
    - Select currency → updates system currency, closes modalBottomSheet

**Allowed Navigation**:
- Edit name icon → name edit dialog (modal)
- Edit currency icon → currency picker modalBottomSheet
- Back navigation → Home Screen

**Loading/Empty/Error States**:
- **Loading**: Circular progress indicator while saving
- **Error**: Display error message if save fails

**Required API Interactions**:
- PATCH /users/me (fullName?) → updates user name
- PATCH /settings/currency (systemCurrency) → updates system currency

**Must NOT Exist**:
- ❌ No email change option
- ❌ No password change option
- ❌ No profile picture upload
- ❌ No notification settings
- ❌ No theme/appearance settings
- ❌ No language settings

---

### 10. Single Business Analytics Screen

**Purpose**: Display analytics for a single business (KPIs, pie chart, line chart) with export capability.

**Route Parameter**: `businessId` (required)

**Required UI Elements**:
- Icon Button: Share/Export (right top corner) → export data to email/FTP/other systems

**KPI Cards** (Grid layout: 2 cards per row):
- Card 1: Current Monthly Spent
  - Text: Amount spent in current month for this business
  - **If amount > monthly limit**: Show error message in red indicating overage
- Card 2: Monthly Limit
  - Text: Current monthly limit value
  - Icon: Edit (next to limit) → opens edit popup with:
    - Input: Monthly limit value
    - Button: "Save" → updates limit, closes popup
- Card 3: Monthly AVG
  - Text: Average monthly spend (calculated from current invoices data)
- Card 4: Yearly AVG
  - Text: Average yearly spend (calculated from current invoices data)

**Charts**:
- Pie Chart: "5 most spent items in the current month"
  - Shows top 5 invoice amounts for this business in current month
  - Legend: Show labels with colors

- Line Chart: "Spending by months" (UPDATED v2.0 - Axis Requirements):
  - **X-axis (horizontal)**: Month labels
    - Format: "Jan 25", "Feb 25", ... (short month + 2-digit year)
    - Density: Adjust based on screen width:
      - Mobile (<600px): Show every 2nd or 3rd label to prevent overlap
      - Tablet/Desktop (≥600px): Show all labels
    - Style: Rotated 0° or 45° if needed for readability
    - Must be visible and not overflow chart bounds
  
  - **Y-axis (vertical)**: Amount with currency
    - Format: Include currency symbol (e.g., "₪100", "$50")
    - Scale: Auto-scale based on data range (min to max)
    - Grid lines: Show horizontal grid lines for readability
    - Must be visible and not overflow chart bounds
  
  - **Responsive sizing**:
    - Chart must fit screen width minus padding (16px each side)
    - Height: Fixed 300px or dynamic based on content
    - Must NOT overflow horizontally or vertically
    - Padding: Ensure labels don't get cut off at edges

**Allowed Navigation**:
- Share/Export button → (export functionality, UI TBD)
- Edit monthly limit icon → monthly limit edit popup (modal)
- Back navigation → Home Screen

**Loading/Empty/Error States**:
- **Loading**: Circular progress indicator while fetching analytics
- **Empty State**: "No data available" for charts if no invoices
- **Error**: Display error message if analytics fail to load

**Required API Interactions**:
- GET /analytics/vendor/:businessId → returns:
  - kpis: { currentMonthSpend, monthlyLimit, monthlyAverage, yearlyAverage }
  - pieChart: { segments: [{ label, value, percentage }] }
  - lineChart: { labels: [...months], datasets: [{ data: [...amounts] }] }
- PATCH /analytics/vendor/:businessId/limit (monthlyLimit) → updates monthly limit

**Must NOT Exist**:
- ❌ **NO "Invoices" tab** (CRITICAL: This violates spec)
- ❌ **NO tabs of any kind** on this screen
- ❌ NO invoice list embedded in this screen
- ❌ NO drill-down to individual invoices from charts
- ❌ NO date range filters
- ❌ NO comparison to other businesses

---

### 11. Businesses Analysis Screen

**Purpose**: Display aggregate analytics across all businesses (balance, pie chart, line chart) with export capability.

**Required UI Elements**:
- Icon Button: Share/Export (right top corner) → export data to email/FTP/other systems

**KPI Card**:
- Card: Remaining Balance
  - Text: Total money left in balance (calculated as: sum of all business limits - sum of all business spent)

**Charts**:
- Pie Chart: "5 most expensive businesses"
  - Shows top 5 businesses by total spend
- Line Chart: "Overall Spending by months"
  - X-axis: Months
  - Y-axis: Total spend amount (across all businesses)
  - Data: Aggregate monthly spend totals

**Allowed Navigation**:
- Share/Export button → (export functionality, UI TBD)
- Back navigation → Home Screen

**Loading/Empty/Error States**:
- **Loading**: Circular progress indicator while fetching analytics
- **Empty State**: "No data available" for charts if no invoices
- **Error**: Display error message if analytics fail to load

**Required API Interactions**:
- GET /analytics/overall → returns:
  - kpis: { totalSpend, totalLimits, remainingBalance, vendorCount, invoiceCount }
  - pieChart: { segments: [{ label, value, percentage }] }
  - lineChart: { labels: [...months], datasets: [{ data: [...amounts] }] }

**Must NOT Exist**:
- ❌ NO tabs
- ❌ NO per-business drill-down (use Single Business Analytics instead)
- ❌ NO invoice list
- ❌ NO date range filters
- ❌ NO budget projections

---

## Navigation Graph

**Format**: `SourceScreen.Action → TargetScreen`

### From Welcome Screen
- `WelcomeScreen.LoginButton → LoginScreen`
- `WelcomeScreen.SignUpButton → SignUpScreen`

### From Login Screen
- `LoginScreen.EnterButton → HomeScreen` (on success)
- `LoginScreen.Back → WelcomeScreen`

### From Sign Up Screen
- `SignUpScreen.EnterButton → HomeScreen` (on success)
- `SignUpScreen.Back → WelcomeScreen`

### From Home Screen
- `HomeScreen.SettingsIcon → SettingsScreen`
- `HomeScreen.AddBusinessButton → AddEditBusinessDialog`
- `HomeScreen.AddBusinessIcon → AddEditBusinessDialog`
- `HomeScreen.AnalyticsIcon → BusinessesAnalysisScreen`
- `HomeScreen.BusinessCard.EditIcon → AddEditBusinessDialog(businessId)`
- `HomeScreen.BusinessCard.AnalyticsIcon → SingleBusinessAnalyticsScreen(businessId)`
- `HomeScreen.InvoiceCard.EditIcon → EditInvoiceScreen(invoiceId)`
- `HomeScreen.SeeAllCard → InvoicesListScreen`
- `HomeScreen.UploadButton → UploadInvoiceModalBottomSheet`

### From Add/Edit Business Dialog
- `AddEditBusinessDialog.SaveButton → HomeScreen` (closes dialog)
- `AddEditBusinessDialog.DeleteButton → DeleteBusinessConfirmationDialog`
- `AddEditBusinessDialog.Cancel → HomeScreen` (closes dialog)

### From Delete Business Confirmation Dialog
- `DeleteBusinessConfirmationDialog.CancelButton → AddEditBusinessDialog`
- `DeleteBusinessConfirmationDialog.OkButton → HomeScreen` (closes both dialogs)

### From Upload Invoice modalBottomSheet
- `UploadInvoiceModal.UploadImage → DeviceImagePicker → HomeScreen` (after processing)
- `UploadInvoiceModal.UploadPDF → DevicePDFPicker → HomeScreen` (after processing)

### From Edit Invoice Screen
- `EditInvoiceScreen.EditNameIcon → NameEditPopup (modal)`
- `EditInvoiceScreen.EditAmountIcon → AmountEditPopup (modal)`
- `EditInvoiceScreen.CalendarIcon → DatePicker (modal)`
- `EditInvoiceScreen.BusinessExpander → BusinessListDropdown`
- `EditInvoiceScreen.BusinessList.AddBusinessCard → AddEditBusinessDialog`
- `EditInvoiceScreen.SaveButton → HomeScreen`
- `EditInvoiceScreen.DeleteButton → DeleteInvoiceConfirmationDialog`
- `EditInvoiceScreen.Back → HomeScreen`

### From Delete Invoice Confirmation Dialog
- `DeleteInvoiceConfirmationDialog.CancelButton → EditInvoiceScreen`
- `DeleteInvoiceConfirmationDialog.OkButton → HomeScreen` (closes dialog)

### From Invoices List Screen
- `InvoicesListScreen.InvoiceCard.EditIcon → EditInvoiceScreen(invoiceId)`
- `InvoicesListScreen.Back → HomeScreen`

### From Settings Screen
- `SettingsScreen.EditNameIcon → NameEditDialog (modal)`
- `SettingsScreen.EditCurrencyIcon → CurrencyPickerModalBottomSheet`
- `SettingsScreen.Back → HomeScreen`

### From Single Business Analytics Screen
- `SingleBusinessAnalyticsScreen.ShareButton → (Export UI, TBD)`
- `SingleBusinessAnalyticsScreen.EditLimitIcon → LimitEditPopup (modal)`
- `SingleBusinessAnalyticsScreen.Back → HomeScreen`

### From Businesses Analysis Screen
- `BusinessesAnalysisScreen.ShareButton → (Export UI, TBD)`
- `BusinessesAnalysisScreen.Back → HomeScreen`

---

## Route Parameters

### Screens Requiring Route Parameters

| Screen | Required Parameters | Type | Description |
|--------|-------------------|------|-------------|
| **AddEditBusinessDialog** | `businessId` | UUID (optional) | If provided: edit mode; if null: create mode |
| **SingleBusinessAnalyticsScreen** | `businessId` | UUID (required) | Business to display analytics for |
| **EditInvoiceScreen** | `invoiceId` | UUID (required) | Invoice to edit |
| **InvoicesListScreen** | N/A | N/A | No parameters (shows all invoices) |

### Route Format Examples

```
/home
/settings
/invoices
/invoices/:invoiceId/edit
/vendors/:businessId/analytics
/analytics/overall
/auth/welcome
/auth/login
/auth/signup
```

---

## Global "Must NOT Exist"

**Features that are FORBIDDEN across the entire application**:

### Forbidden Features
- ❌ **NO "Invoices" tab in Single Business Analytics Screen** (CRITICAL VIOLATION)
- ❌ NO tabs in Single Business Analytics Screen (only KPIs + charts)
- ❌ NO forgot password functionality
- ❌ NO social authentication (Google, Facebook, etc.)
- ❌ NO multi-user collaboration (single tenant = single user)
- ❌ NO business logo/image uploads
- ❌ NO invoice attachments beyond the original uploaded file
- ❌ NO invoice line items editing (extracted data only)
- ❌ NO recurring invoice detection
- ❌ NO payment tracking (invoice management only, not payment management)
- ❌ NO invoice approval workflows
- ❌ NO email/FTP export implementation (button exists but functionality TBD)
- ❌ NO notifications system
- ❌ NO dark mode toggle
- ❌ NO language switching

### Forbidden UI Patterns
- ❌ NO hamburger menu / drawer navigation
- ❌ NO bottom tab bar (use explicit navigation from Home)
- ❌ NO breadcrumbs
- ❌ NO wizards/multi-step forms (all forms are single-screen)
- ❌ NO drag-and-drop for invoices (only for businesses on Home Screen)

### Forbidden Data Modifications
- ❌ NO soft delete (hard delete only, per Version 001 spec)
- ❌ NO invoice versioning/history
- ❌ NO undo/redo functionality
- ❌ NO batch operations (no "select all" or bulk actions)

---

## Clarifications & Assumptions

### Assumed Behaviors (From Flow Source)

1. **Multi-Tenancy**: Each user is their own tenant (tenant = user). No shared data between users.

2. **"Business" Definition**: Represents a vendor/supplier extracted from invoice. User can rename/edit but it's fundamentally the vendor where money was spent.

3. **Default Invoice Name**: Upload datetime (day, month, year, time) - e.g., "15/01/2026 14:30"

4. **Business Order**: Display order is user-controlled via drag-and-drop on Home Screen. Default for new business is "last position".

5. **Extraction Failure Handling** (Version 002 enhancement): If invoice extraction is unclear, system saves invoice with `needsReview=true` rather than hard-failing the upload.

6. **Currency Conversion**: Automatic conversion if invoice currency ≠ user's system currency, using exchangeratesapi.io API.

7. **Vendor Auto-Creation**: If extracted vendor doesn't match existing business, automatically create new business.

8. **Invoice Grouping**: In Invoices List Screen, invoices are grouped by month/year with expandable groups.

9. **Pagination**: Backend-managed pagination with lazy loading on scroll.

10. **Export Functionality**: Export button exists in analytics screens but actual export implementation (email/FTP/other) is not specified in Flow Source (TBD).

### Open Questions

None at this time. All critical navigation and UI elements are defined in Flow Source.

---

## Validation Checklist

**For Implementers**: Before marking implementation complete, verify:

- [ ] All required UI elements exist on each screen (per contracts above)
- [ ] All navigation edges work as specified (per Navigation Graph)
- [ ] All forbidden features are absent (per "Must NOT Exist" sections)
- [ ] Route parameters are correctly passed and validated
- [ ] Loading/error/empty states are implemented for each screen
- [ ] API interactions match the specified endpoints
- [ ] **CRITICAL**: Single Business Analytics Screen has ZERO tabs

---

## Version Control

| Version | Date | Changes |
|---------|------|---------|
| 002 | 2026-01-20 | Initial flow contract for stabilization release |

---

## Compliance

**Deviation Policy**: Any screen implementation that deviates from this contract must be documented as a spec drift issue and corrected before release.

**Amendment Process**: Changes to this contract require:
1. Update to Flow Source (authoritative)
2. Update to this document
3. Notification to all implementers
4. Version increment

---

**END OF FLOW CONTRACT**
