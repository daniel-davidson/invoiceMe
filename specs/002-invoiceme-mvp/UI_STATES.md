# UI States: InvoiceMe (Version 002)

**Purpose**: Loading, error, empty, and success states for all screens  
**Created**: 2026-01-20  
**Based On**: FLOW_CONTRACT.md  
**Status**: Implementation Guide

---

## Document Purpose

This document defines the exact UI states that MUST exist for each screen:
1. Loading states (when data is being fetched/processed)
2. Empty states (when no data exists)
3. Error states (when operations fail)
4. Success states (confirmation feedback)

**Compliance Requirement**: All screens must implement their defined states exactly as specified.

---

## Global State Patterns

### Loading Indicator Style

**Primary**: `CircularProgressIndicator` (Material Design)
- Center-aligned for full-screen loading
- Inline for button/action loading

**Secondary**: Linear progress bar (for multi-stage processes like upload)

### Error Display Style

**Primary**: SnackBar (Material Design)
- **Error**: Red background, white text, 4-second duration
- **Success**: Green background, white text, 4-second duration

**Secondary**: Inline error text below input fields (for form validation)

### Empty State Style

**Pattern**:
```
[Icon - large, muted color]
[Primary text - what is empty]
[Secondary text - what action to take]
[Call-to-action button(s)]
```

---

## Screen-by-Screen State Definitions

### 1. Welcome Screen

**States**: N/A (static screen, no data loading)

---

### 2. Login Screen

#### Loading State

**Trigger**: User taps "Enter" button  
**UI Changes**:
- "Enter" button shows `CircularProgressIndicator` (small, white)
- "Enter" button is disabled
- Email and password inputs are disabled

**Duration**: Until API response or timeout

#### Error State

**Trigger**: Invalid credentials or API error  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message Examples**:
  - "Invalid email or password. Please try again."
  - "Network error. Please check your connection."
  - "Account not found. Did you mean to sign up?"

**User Action**: Dismiss snackbar, correct inputs, retry

#### Success State

**Trigger**: Successful authentication  
**UI Changes**:
- No snackbar (silent success)
- Immediate navigation to Home Screen
- Auth state updated globally

---

### 3. Sign Up Screen

#### Loading State

**Trigger**: User taps "Enter" button  
**UI Changes**:
- "Enter" button shows `CircularProgressIndicator` (small, white)
- "Enter" button is disabled
- All input fields are disabled

**Duration**: Until API response or timeout

#### Error State

**Trigger**: Validation failure or API error  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message Examples**:
  - "Email already exists. Please log in instead."
  - "Password must be at least 8 characters."
  - "Please fill in all required fields."
  - "Network error. Please try again."

**User Action**: Dismiss snackbar, correct inputs, retry

#### Success State

**Trigger**: Successful account creation  
**UI Changes**:
- No snackbar (silent success)
- Immediate navigation to Home Screen
- Auth state updated globally

---

### 4. Home Screen

#### Loading State (Initial Load)

**Trigger**: Screen first loads (fetching businesses and invoices)  
**UI Display**:
- Full-screen `CircularProgressIndicator` (centered)
- No other content visible

**Duration**: Until businesses data loaded or error

#### Empty State

**Trigger**: User has no businesses  
**UI Display**:
```
[Icon: Business building icon, large, grey]
"No businesses yet"
"Start by adding a business or uploading an invoice"
[Add Business Button] [Upload Invoice Button]
```

**User Action**: Tap either button to proceed

#### Error State (Data Load Failure)

**Trigger**: API error when fetching businesses  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message**: "Failed to load businesses. Pull to refresh or try again later."
- Show retry button or pull-to-refresh

**User Action**: Pull to refresh or tap retry

#### Success State (With Data)

**UI Display**:
- Welcome text: "Welcome {Full Name}"
- Settings icon (top right)
- Search input + Add icon + Analytics icon
- List of business cards (expandable)
- Upload button (bottom)

#### Search Input State (Idle)

**Trigger**: Screen loaded with businesses  
**UI Display**:
- Search input visible with placeholder "Search businesses..."
- Search icon (left)
- Clear icon (right, hidden until text entered)

**User Action**: Tap to enter search text

#### Search Input State (Typing)

**Trigger**: User types in search input  
**UI Display**:
- Search input shows entered text
- Clear icon (right) becomes visible
- Business list filters in real-time (client-side filter, no debounce needed)
- Filtered businesses update immediately as user types

**User Action**: Continue typing or tap clear icon

#### Search Input State (No Results)

**Trigger**: Search filter returns no matching businesses  
**UI Display**:
- Search input shows search text
- Business list area shows:
  - Icon: Search icon (large, grey)
  - Text: "No businesses found"
  - Text (secondary): "Try a different search term"
  - Clear button to reset search

**User Action**: Modify search or clear to see all businesses

#### Upload Flow States

##### Upload Stage 1: File Selection

**Trigger**: User taps "Upload an Invoice" button  
**UI Display**:
- **modalBottomSheet** appears with:
  - "Upload Image" option
  - "Upload PDF" option

**User Action**: Select one option or dismiss sheet

##### Upload Stage 2: Uploading

**Trigger**: User selects file  
**UI Display**:
- **Overlay**: Semi-transparent dark background
- **Center**: `CircularProgressIndicator`
- **Text**: "Uploading..." (below spinner)
- **Behavior**: modalBottomSheet dismisses

**Duration**: Until file uploaded to backend

##### Upload Stage 3: Processing (OCR)

**Trigger**: File uploaded, OCR starting  
**UI Display**:
- **Overlay**: Same as Stage 2
- **Text**: "Processing OCR..." (below spinner)
- **Optional**: Linear progress bar (if API supports progress updates)

**Duration**: Until OCR complete

##### Upload Stage 4: Extracting (LLM)

**Trigger**: OCR complete, LLM extraction starting  
**UI Display**:
- **Overlay**: Same as Stage 2
- **Text**: "Extracting data..." (below spinner)

**Duration**: Until LLM extraction complete

##### Upload Stage 5: Saving

**Trigger**: Extraction complete, saving to database  
**UI Display**:
- **Overlay**: Same as Stage 2
- **Text**: "Saving invoice..." (below spinner)

**Duration**: Until API response received

##### Upload Success

**Trigger**: Invoice saved successfully  
**UI Display**:
- **Overlay**: Dismissed
- **SnackBar**: Green background, white text
- **Message**:
  - If `needsReview = false`: "Invoice uploaded successfully! Added to {Vendor Name}."
  - If `needsReview = true`: "Invoice uploaded but needs review. Please check {Vendor Name}."
- **Action Button**: "VIEW" → navigates to `/invoices`

**State Changes**:
- Business list refreshes (new invoice appears)
- If new vendor created: vendor card appears in list

**Duration**: 4 seconds (auto-dismiss)

##### Upload Failure

**Trigger**: Upload/OCR/Extraction/Save fails  
**UI Display**:
- **Overlay**: Dismissed
- **SnackBar**: Red background, white text
- **Message Examples**:
  - "Upload failed. Please try again."
  - "OCR processing failed. Check file quality."
  - "Extraction failed. Invoice data unclear."
  - "Network error. Please check your connection."

**User Action**: Dismiss snackbar, retry upload

---

### 5. Add/Edit Business Dialog

#### Loading State (Save)

**Trigger**: User taps "Save" button  
**UI Changes**:
- "Save" button shows `CircularProgressIndicator` (small)
- "Save" button is disabled
- "Delete" button is disabled
- Business name input is disabled

**Duration**: Until API response

#### Loading State (Delete)

**Trigger**: User confirms delete  
**UI Changes**:
- "Ok" button shows `CircularProgressIndicator` (small)
- "Ok" button is disabled
- "Cancel" button is disabled

**Duration**: Until API response

#### Error State (Save)

**Trigger**: Save operation fails  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message**: "Failed to save business. Please try again."
- Dialog remains open

**User Action**: Retry save or cancel

#### Error State (Delete)

**Trigger**: Delete operation fails  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message**: "Failed to delete business. Please try again."
- Both dialogs remain open

**User Action**: Retry delete or cancel

#### Success State (Save)

**Trigger**: Save successful  
**UI Changes**:
- Both dialogs dismiss
- Home Screen refreshes (updated business appears)
- No snackbar (silent success)

#### Success State (Delete)

**Trigger**: Delete successful  
**UI Changes**:
- Both dialogs dismiss
- Home Screen refreshes (business removed)
- **SnackBar**: Green background, "Business and related invoices deleted."

---

### 5b. Duplicate Invoice Detection Dialog (NEW v2.0)

**Purpose**: Prevent duplicate invoice uploads by detecting previously uploaded files

#### Loading State (Hash Computation)

**Trigger**: User selects file (image or PDF) from picker  
**UI Display**:
- Small inline spinner appears next to file picker
- Text: "Checking for duplicates..." (optional, if computation > 100ms)

**Duration**: < 200ms for typical 10MB file

#### Loading State (API Check)

**Trigger**: Hash computed, calling API to check for duplicate  
**UI Display**:
- Small inline spinner continues
- Text: "Checking for duplicates..."

**Duration**: < 500ms (backend indexed lookup)

#### Dialog State (Duplicate Detected)

**Trigger**: API returns 200 OK with existing invoice details  
**UI Display**:
- **Dialog**: "Invoice Already Exists"
- **Icon**: Warning icon (orange/yellow)
- **Text (primary)**: "This invoice was already uploaded on {createdAt formatted}"
- **Text (secondary)**: Existing invoice details:
  - "Business: {vendorName}"
  - "Amount: {originalAmount} {originalCurrency}"
  - "Date: {invoiceDate formatted}"
  - "Invoice #: {invoiceNumber or 'N/A'}"
- **Button**: "View Existing Invoice" (primary, blue) → navigates to Invoice Detail Screen
- **Button**: "Cancel" (secondary) → closes dialog, returns to Home Screen

**User Action**: View existing invoice or cancel

#### Error State (API Check Failed)

**Trigger**: API call fails (network error, timeout)  
**UI Behavior**:
- **Fail-open**: Proceed with normal upload flow (backend will catch duplicate on upload)
- **SnackBar** (optional warning): Yellow background, "Could not check for duplicates. Proceeding with upload."
- Upload continues as normal (backend returns 409 Conflict if duplicate)

**User Action**: Upload proceeds automatically

#### Error State (Upload Returns 409 Conflict)

**Trigger**: Upload API returns 409 Conflict with existing invoice details  
**UI Display**:
- Upload overlay dismisses
- Show Duplicate Invoice Detection Dialog (same as "Dialog State" above)
- Extract existing invoice details from 409 error response

**User Action**: View existing invoice or cancel

---

### 6. Edit Invoice Screen (UPDATED v2.0)

#### Loading State (Initial Load)

**Trigger**: Screen opens  
**UI Display**:
- Full-screen `CircularProgressIndicator` (centered)
- No other content visible

**Duration**: Until invoice data + items loaded

#### Error State (Load Failure)

**Trigger**: Invoice not found or API error  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message**: "Failed to load invoice. Please try again."
- Show retry button or automatic back navigation to Home Screen after 3 seconds

**User Action**: Tap retry or wait for auto-navigation

#### Empty State (No Items)

**Trigger**: Invoice has no line items  
**UI Display**:
- Header fields visible (name, date, amount, etc.)
- Line Items section shows:
  - Text: "No line items extracted. Add items to itemize this invoice."
  - Button: "+ Add Item" (prominent, centered)

**User Action**: Tap "+ Add Item" to open inline form

#### Loading State (Save All Changes)

**Trigger**: User taps "Save All Changes" button  
**UI Changes**:
- "Save All Changes" button shows `CircularProgressIndicator` (small, white)
- "Save All Changes" button is disabled
- "Delete Invoice" button is disabled
- All input fields and edit icons are disabled
- Business dropdown disabled
- Item add/edit/delete buttons disabled

**Duration**: Until API response (includes validation)

#### Loading State (Delete)

**Trigger**: User confirms delete in Delete Invoice Confirmation dialog  
**UI Changes**:
- "Ok" button shows `CircularProgressIndicator` (small, white)
- "Ok" button is disabled
- "Cancel" button is disabled

**Duration**: Until API response

#### Loading State (Create Business Inline)

**Trigger**: User taps "Create" in business assignment dropdown inline form  
**UI Changes**:
- "Create" button shows `CircularProgressIndicator` (small)
- "Create" button is disabled
- "Cancel" button is disabled
- Business name input is disabled

**Duration**: Until API response

#### Loading State (Fetch Businesses)

**Trigger**: User expands business assignment dropdown  
**UI Changes**:
- Small `CircularProgressIndicator` appears in dropdown
- Dropdown is expanded but empty
- "Loading businesses..." placeholder text

**Duration**: Until businesses list loaded

#### Error State (Save - Validation Failed)

**Trigger**: Save operation fails due to validation error  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message Examples**:
  - "Total mismatch: invoice amount $200.00 ≠ items total $150.00. Turn off 'Use Items Total' to override."
  - "Item 2 missing required field: description"
  - "Item 3: quantity and unit price don't match total (2 × $50 ≠ $120)"
- Screen remains open
- Scroll to first error field (if applicable)

**User Action**: Fix validation errors and retry save

#### Error State (Save - Network/Server Error)

**Trigger**: Save operation fails due to network or server error  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message**: "Failed to save invoice. Please check your connection and try again."
- Screen remains open

**User Action**: Retry save

#### Error State (Delete)

**Trigger**: Delete operation fails  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message**: "Failed to delete invoice. Please try again."
- Delete confirmation dialog remains open

**User Action**: Retry delete or cancel

#### Error State (Create Business Inline)

**Trigger**: Business creation fails in inline form  
**UI Display**:
- **SnackBar**: Red background, white text (shown behind dropdown)
- **Message**: "Failed to create business. Please try again."
- Inline form remains open

**User Action**: Retry create or cancel

#### Error State (Fetch Businesses)

**Trigger**: Business list fetch fails  
**UI Display**:
- Dropdown shows error message: "Failed to load businesses. Tap to retry."
- Tap to retry loads businesses again

**User Action**: Tap to retry or cancel dropdown

#### Success State (Save)

**Trigger**: Save successful (invoice header + items updated atomically)  
**UI Changes**:
- Navigate back to Home Screen (or previous screen)
- **SnackBar**: Green background, white text
- **Message**: "Invoice updated successfully."

**Duration**: 4 seconds (auto-dismiss)

#### Success State (Delete)

**Trigger**: Delete successful  
**UI Changes**:
- Navigate back to Home Screen
- **SnackBar**: Green background, white text
- **Message**: "Invoice deleted successfully."

**Duration**: 4 seconds (auto-dismiss)

#### Success State (Create Business Inline)

**Trigger**: Business created successfully in inline form  
**UI Changes**:
- Inline form closes
- New business appears in dropdown list and is auto-selected
- Business assignment card shows new business name
- Dropdown collapses
- No snackbar (silent success)

#### Unsaved Changes State

**Trigger**: User taps back navigation with unsaved local changes  
**UI Display**:
- **Dialog**: "Discard unsaved changes?"
- **Message**: "You have unsaved changes to this invoice. Discard changes and go back?"
- Button: "Cancel" → closes dialog, stays on Edit Invoice Screen
- Button: "Discard" (destructive color) → closes dialog, navigates back

**User Action**: Choose to discard or cancel

#### Item Edit Form State

**Trigger**: User taps edit icon on an item card  
**UI Display**:
- Inline form appears below item card
- Form contains:
  - Input: Description (pre-filled, required)
  - Input: Quantity (pre-filled if exists, nullable)
  - Input: Unit Price (pre-filled if exists, nullable)
  - Input: Total (pre-filled, required)
  - Input: Currency (pre-filled, optional)
  - Button: "Save" (enabled if description and total are valid)
  - Button: "Cancel"
- Other edit/delete icons are disabled while form is open

**User Action**: Edit fields and save or cancel

#### Item Add Form State

**Trigger**: User taps "+ Add Item" button  
**UI Display**:
- Inline form appears below item list (or in empty state)
- Form contains:
  - Input: Description (empty, required, placeholder "e.g., Software License")
  - Input: Quantity (empty, nullable, placeholder "e.g., 2.5")
  - Input: Unit Price (empty, nullable, placeholder "e.g., 50.25")
  - Input: Total (empty, required, placeholder "e.g., 100.00")
  - Input: Currency (defaults to invoice currency)
  - Button: "Add" (enabled if description and total are valid)
  - Button: "Cancel"
- "+ Add Item" button is hidden while form is open

**User Action**: Fill fields and add or cancel

#### Item Delete Confirmation State

**Trigger**: User taps delete icon on an item card  
**UI Display**:
- Inline confirmation appears below item card:
  - Text: "Delete this item?"
  - Button: "Cancel" → hides confirmation
  - Button: "Delete" (destructive color) → removes item from local state, hides confirmation
- Other edit/delete icons are disabled while confirmation is visible

**User Action**: Confirm delete or cancel

#### Business Assignment Dropdown Expanded State

**Trigger**: User taps expander on Business Assignment card  
**UI Display**:
- Dropdown expands below card
- Search input appears (typeahead filter, placeholder "Search businesses...")
- Filtered business list appears (scrollable)
- "+ Create New Business" card appears at bottom
- Currently assigned business is highlighted

**User Action**: Search, select business, or create new

#### Business Assignment Create Form State

**Trigger**: User taps "+ Create New Business" in dropdown  
**UI Display**:
- Inline form appears below "+ Create New Business" card
- Form contains:
  - Input: Business name (empty, required, placeholder "e.g., Acme Corp")
  - Button: "Create" (enabled if name is not empty)
  - Button: "Cancel"
- Business list remains visible above

**User Action**: Enter name and create or cancel

#### Use Items Total Toggle State

**Trigger**: User toggles "Use Items Total" switch  
**UI Changes**:
- **Toggle ON** (default if items exist):
  - Amount field shows calculated total: SUM(items.total)
  - Amount field is greyed out
  - Amount edit icon is disabled
  - Calculated total updates automatically when items change
- **Toggle OFF**:
  - Amount field becomes editable
  - Amount edit icon is enabled
  - Amount value can differ from items total

**User Action**: Toggle to enable/disable auto-calculation

---

### 7. Invoices List Screen

#### Loading State (Initial Load)

**Trigger**: Screen opens or user pulls to refresh  
**UI Display**:
- **Initial Load**: Full-screen `CircularProgressIndicator` (centered)
- **Refresh**: Small spinner at top (pull-to-refresh indicator)

**Duration**: Until invoices loaded

#### Empty State

**Trigger**: User has no invoices  
**UI Display**:
```
[Icon: Receipt icon, large, grey]
"No invoices yet"
"Upload your first invoice to get started"
[Upload Invoice Button]
```

**User Action**: Tap button to open upload flow

#### Error State (Load Failure)

**Trigger**: API error when fetching invoices  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message**: "Failed to load invoices. Pull to refresh or try again later."
- Show retry button or pull-to-refresh

**User Action**: Pull to refresh or tap retry

#### Loading State (Pagination)

**Trigger**: User scrolls to bottom (lazy load more invoices)  
**UI Display**:
- Small `CircularProgressIndicator` at bottom of list
- Existing invoices remain visible

**Duration**: Until next page loaded

#### Success State (With Data)

**UI Display**:
- Search input (top)
- Invoices grouped by month/year with expander
- Each invoice shows: name, date, amount, edit icon

#### Search Input State (Idle)

**Trigger**: Screen loaded with invoices  
**UI Display**:
- Search input visible with placeholder "Search by business, amount, number..."
- Search icon (left)
- Clear icon (right, hidden until text entered)

**User Action**: Tap to enter search text

#### Search Input State (Typing - Debounced)

**Trigger**: User types in search input  
**UI Display**:
- Search input shows entered text
- Clear icon (right) becomes visible
- Small spinner appears next to search icon (while debouncing, 300ms delay)
- After 300ms delay: spinner shows while API call is in progress
- Invoice list updates with filtered results

**Behavior**:
- Debounce: 300ms delay after last keystroke before API call
- If < 100 invoices: client-side filter (no API call, no debounce)
- If > 100 invoices: server-side filter (API call with debounce)

**User Action**: Continue typing, tap clear, or wait for results

#### Search Input State (Loading)

**Trigger**: Debounce delay passed, API call in progress  
**UI Display**:
- Search input shows entered text
- Small `CircularProgressIndicator` next to search icon
- Invoice list shows previous results (or skeleton loading)

**Duration**: < 1 second for typical search

#### Search Input State (No Results)

**Trigger**: Search returns no matching invoices  
**UI Display**:
- Search input shows search text
- Invoice list area shows:
  - Icon: Search icon (large, grey)
  - Text: "No invoices found"
  - Text (secondary): "Try a different search term or clear the filter"
  - Clear button to reset search

**User Action**: Modify search or clear to see all invoices

#### Search Input State (Error)

**Trigger**: Search API call fails  
**UI Display**:
- Search input shows search text
- **SnackBar**: Red background, "Search failed. Please try again."
- Invoice list shows previous results (if any) or empty state

**User Action**: Modify search to retry or clear to see all invoices

---

### 8. Settings Screen

#### Loading State (Initial Load)

**Trigger**: Screen opens  
**UI Display**:
- Full-screen `CircularProgressIndicator` (centered)
- No other content visible

**Duration**: Until user data loaded

#### Error State (Load Failure)

**Trigger**: API error when fetching user data  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message**: "Failed to load settings. Please try again."
- Show retry button

**User Action**: Retry or go back

#### Loading State (Save Name)

**Trigger**: User confirms name edit  
**UI Changes**:
- "Save" button shows `CircularProgressIndicator` (small)
- "Save" button is disabled
- Name input is disabled

**Duration**: Until API response

#### Loading State (Save Currency)

**Trigger**: User selects new currency  
**UI Changes**:
- Currency picker sheet dismisses
- Small spinner appears next to currency field

**Duration**: Until API response

#### Error State (Save)

**Trigger**: Save operation fails  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message**: "Failed to update settings. Please try again."

**User Action**: Retry save

#### Success State (Save)

**Trigger**: Save successful  
**UI Changes**:
- **SnackBar**: Green background, "Settings updated successfully."
- Updated value appears in UI

---

### 9. Single Business Analytics Screen

#### Loading State (Initial Load)

**Trigger**: Screen opens  
**UI Display**:
- Full-screen `CircularProgressIndicator` (centered)
- No other content visible

**Duration**: Until analytics data loaded

#### Error State (Load Failure)

**Trigger**: API error when fetching analytics  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message**: "Failed to load analytics. Pull to refresh or try again later."
- Show retry button or pull-to-refresh

**User Action**: Pull to refresh or tap retry

#### Loading State (Update Limit)

**Trigger**: User saves new monthly limit  
**UI Changes**:
- "Save" button shows `CircularProgressIndicator` (small)
- "Save" button is disabled
- Limit input is disabled

**Duration**: Until API response

#### Error State (Update Limit)

**Trigger**: Update operation fails  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message**: "Failed to update limit. Please try again."
- Dialog remains open

**User Action**: Retry save or cancel

#### Success State (Update Limit)

**Trigger**: Update successful  
**UI Changes**:
- Dialog dismisses
- KPI cards refresh (new limit shown)
- **SnackBar**: Green background, "Monthly limit updated."

#### Success State (With Data)

**UI Display**:
- 4 KPI cards in 2x2 grid:
  - Current Monthly Spent (with warning if over limit)
  - Monthly Limit (with edit icon)
  - Monthly AVG
  - Yearly AVG
- Pie chart: Top 5 items (current month)
- Line chart: Spending by month
- Share icon (top right)

#### Empty State (No Data)

**Trigger**: Business has no invoices  
**UI Display**:
- KPI cards show "0" or "N/A"
- Charts show empty placeholders
- **Text**: "No invoices for this business yet. Upload invoices to see analytics."

---

### 10. Businesses Analysis Screen

#### Loading State (Initial Load)

**Trigger**: Screen opens  
**UI Display**:
- Full-screen `CircularProgressIndicator` (centered)
- No other content visible

**Duration**: Until overall analytics data loaded

#### Error State (Load Failure)

**Trigger**: API error when fetching analytics  
**UI Display**:
- **SnackBar**: Red background, white text
- **Message**: "Failed to load analytics. Pull to refresh or try again later."
- Show retry button or pull-to-refresh

**User Action**: Pull to refresh or tap retry

#### Success State (With Data)

**UI Display**:
- Balance card (money left: total limits - total spent)
- Pie chart: Top 5 most expensive businesses
- Line chart: Overall spending by month
- Share icon (top right)

#### Empty State (No Data)

**Trigger**: User has no businesses or invoices  
**UI Display**:
```
[Icon: Chart icon, large, grey]
"No analytics available"
"Add businesses and upload invoices to see your spending analytics"
[Go to Home Button]
```

**User Action**: Navigate to Home

---

## State Transition Rules

### Loading → Success

**Transition**: Immediate, no delay  
**Animation**: Fade-in for content

### Loading → Error

**Transition**: Immediate  
**Animation**: Snackbar slides up from bottom

### Error → Retry → Loading

**User Action**: Tap retry button or pull-to-refresh  
**Transition**: Immediate return to loading state

### Success → Refresh → Loading

**User Action**: Pull-to-refresh  
**Transition**: Small spinner at top, content remains visible

---

## Performance Expectations

### Loading State Timeouts

| Operation | Expected Duration | Timeout |
|-----------|-------------------|---------|
| Login/Signup | < 2 seconds | 10 seconds |
| Fetch businesses (Home) | < 1 second | 5 seconds |
| Upload invoice | < 10 seconds | 30 seconds |
| OCR processing | < 5 seconds | 15 seconds |
| LLM extraction | < 5 seconds | 15 seconds |
| Fetch analytics | < 2 seconds | 10 seconds |
| Save/update operations | < 1 second | 5 seconds |

### Timeout Error Messages

**Format**: "Operation timed out. Please check your connection and try again."

---

## Accessibility Requirements

### Loading States

- **Screen reader**: Announce "Loading" when loading state starts
- **Screen reader**: Announce "Content loaded" when data appears

### Error States

- **Screen reader**: Announce error message immediately
- **Color contrast**: Error text meets WCAG AA (4.5:1 ratio on red background)

### Empty States

- **Screen reader**: Announce primary and secondary text
- **Focus**: Call-to-action button receives focus automatically

---

## Testing Checklist

**Loading states**:
- [ ] All screens show loading indicator before data appears
- [ ] Loading indicators are centered and visible
- [ ] Buttons disable during loading
- [ ] Loading states timeout appropriately

**Empty states**:
- [ ] All screens with data lists show empty state when no data
- [ ] Empty states follow consistent pattern (icon + text + CTA)
- [ ] Call-to-action buttons work correctly

**Error states**:
- [ ] All API errors show user-friendly messages
- [ ] Error snackbars are red with white text
- [ ] Error messages are actionable ("try again", "check connection")
- [ ] Retry mechanisms work correctly

**Success states**:
- [ ] Success snackbars are green with white text
- [ ] Silent success works where specified (login, signup)
- [ ] Success messages are clear and specific

**Upload flow states**:
- [ ] All 5 upload stages show correct text
- [ ] Overlay prevents interaction during upload
- [ ] Success message includes vendor name
- [ ] Failure message is specific to failure point

**CRITICAL**:
- [ ] No extra tabs in Single Business Analytics (only one screen state)

---

## Version Control

| Version | Date | Changes |
|---------|------|---------|
| 002 | 2026-01-20 | Initial UI states from FLOW_CONTRACT |

---

**END OF UI STATES**
