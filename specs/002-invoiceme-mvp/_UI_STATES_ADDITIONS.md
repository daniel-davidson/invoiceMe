# UI_STATES.md - Additions for v2.0 Features

## TO BE MERGED INTO UI_STATES.md

### After "## Global State Patterns" section:

```markdown
### Session Expired Flow (NEW v2.0)

**Trigger**: Supabase auth state changes to SIGNED_OUT / TOKEN_EXPIRED OR Backend returns 401/403

**Detection Points**:
1. Supabase `onAuthStateChange` listener fires with SIGNED_OUT or TOKEN_EXPIRED event
2. Global API interceptor catches 401 Unauthorized or 403 Forbidden responses

**Auto-Logout Sequence**:
1. Clear local session/tokens immediately
2. Reset all Riverpod providers (auth state, vendors, invoices, etc.)
3. Navigate to Login Screen (replace route, clear back stack)
4. Show notice to user

**User Notice**:
- **Preferred**: SnackBar (Material Design)
  - Background: Amber (warning color)
  - Text: "Session expired. Please log in again."
  - Duration: 5 seconds
  - Position: Bottom of Login Screen
  
- **Alternative**: AlertDialog
  - Title: "Session Expired"
  - Content: "Your session has expired. Please log in again to continue."
  - Button: "OK" → dismisses dialog

**Timing**:
- Logout MUST complete within 500ms of detection
- User should never see error screens or broken state

**Must NOT Happen**:
- ❌ Silent failure (user stuck on broken screen)
- ❌ Partial logout (some providers cleared, others not)
- ❌ Multiple logout notices (deduplicate if both detection methods fire)
```

### Add new section after existing screens:

```markdown
### 5. Add/Edit Business Dialog

#### Initial Load State

**Trigger**: Dialog opens  
**UI Display**:
- If creating new: All fields empty
- If editing existing: Fields pre-populated with current values

#### Field Validation States

**Business Name Field**:
- **Valid**: No error, border neutral
- **Invalid (empty)**: Red border + "Business name is required"
- **Invalid (duplicate)**: Red border + "A business with this name already exists"

**Monthly Limit Field** (REQUIRED - NEW v2.0):
- **Valid**: No error, border neutral, Save button enabled
- **Invalid (empty)**: Red border + "Monthly limit is required" + Save button disabled
- **Invalid (non-numeric)**: Red border + "Please enter a valid number" + Save button disabled
- **Invalid (≤ 0)**: Red border + "Monthly limit must be greater than 0" + Save button disabled

**Business Order Field**:
- Auto-calculated, display-only (user cannot edit)

#### Save Button State

**Enabled**:
- Business name is non-empty + unique
- Monthly limit is valid number > 0

**Disabled**:
- Any field has validation error
- Visual: Grayed out, no click response

#### Loading State (Save)

**Trigger**: User taps "Save" button  
**UI Changes**:
- "Save" button shows `CircularProgressIndicator` (small, inline)
- "Save" and "Delete" buttons disabled
- All input fields disabled

**Duration**: Until API response or timeout

#### Success State (Save)

**Trigger**: Successful save  
**UI Changes**:
- Dialog closes immediately
- Navigate to Home Screen
- Home Screen refreshes vendor list
- **SnackBar**: "Business saved successfully"

#### Error State (Save)

**Trigger**: API error (400, 409, 500)  
**UI Display**:
- **SnackBar**: Red background, error message
  - 400: "Invalid data. Please check your inputs."
  - 409: "A business with this name already exists."
  - 500: "Server error. Please try again."
- Dialog remains open, fields re-enabled, user can correct and retry

#### Delete Button State

**Display**:
- Only visible when editing existing business (not on create new)
- Destructive color (red)

**Click**: Opens Delete Confirmation Dialog (see §5a)

---

### 5a. Delete Business Confirmation Dialog

#### Initial State

**Trigger**: User taps "Delete" in Add/Edit Business Dialog  
**UI Display**:
- Warning text: "Are you sure you want to delete the business? If you do it all of the related invoices will be deleted as well."
- "Cancel" button (enabled)
- "Ok" button (enabled, destructive red)

#### Loading State (Delete) - INSTANT FEEDBACK (NEW v2.0)

**Trigger**: User taps "Ok" button  
**UI Changes (IMMEDIATE)**:
1. **Instantly**:
   - Disable "Cancel" button (grayed out)
   - Disable "Ok" button (grayed out)
2. **Show Progress Indicator**:
   - Display `CircularProgressIndicator` (small) **INSIDE dialog**
   - Position: Centered, below warning text, above buttons
3. **Keep Dialog Open**: Do NOT close dialog until DELETE response received

**Duration**: Until DELETE request completes (success or error)

#### Success State (Delete)

**Trigger**: DELETE /vendors/:id returns 200  
**UI Changes**:
1. Hide progress indicator
2. Close Delete Confirmation Dialog
3. Close Add/Edit Business Dialog
4. Navigate to Home Screen
5. Refresh vendor list (deleted business removed)
6. **SnackBar**: "Business deleted successfully"

#### Error State (Delete)

**Trigger**: DELETE /vendors/:id returns error (400, 500)  
**UI Display (INSIDE DIALOG)**:
1. Hide progress indicator
2. Re-enable "Cancel" and "Ok" buttons
3. Show error text (red) below progress indicator area:
   - "Failed to delete business. Please try again."
   - OR specific error message from backend
4. Dialog remains open, user can retry or cancel

---

### 7a. Delete Invoice Confirmation Dialog (NEW v2.0)

#### Initial State

**Trigger**: User taps "Delete Invoice" button in Edit Invoice Screen  
**UI Display**:
- Warning text: "Are you sure you want to delete this invoice? This action cannot be undone."
- "Cancel" button (enabled)
- "Delete" button (enabled, destructive red)

#### Loading State (Delete) - INSTANT FEEDBACK

**Trigger**: User taps "Delete" button  
**UI Changes (IMMEDIATE)**:
1. **Instantly**:
   - Disable "Cancel" button (grayed out)
   - Disable "Delete" button (grayed out)
2. **Show Progress Indicator**:
   - Display `CircularProgressIndicator` (small) **INSIDE dialog**
   - Position: Centered, below warning text, above buttons
3. **Keep Dialog Open**: Do NOT close dialog until DELETE response received

**Duration**: Until DELETE request completes (success or error)

#### Success State (Delete)

**Trigger**: DELETE /invoices/:id returns 200  
**UI Changes**:
1. Hide progress indicator
2. Close Delete Confirmation Dialog
3. Close Edit Invoice Screen
4. Navigate back to previous screen (Home or Invoices List)
5. Refresh invoice list (deleted invoice removed)
6. **SnackBar**: "Invoice deleted successfully"

#### Error State (Delete)

**Trigger**: DELETE /invoices/:id returns error (400, 500)  
**UI Display (INSIDE DIALOG)**:
1. Hide progress indicator
2. Re-enable "Cancel" and "Delete" buttons
3. Show error text (red) below progress indicator area:
   - "Failed to delete invoice. Please try again."
   - OR specific error message from backend
4. Dialog remains open, user can retry or cancel

---

### 10. Single Business Analytics Screen

#### Initial Load State

**Trigger**: User navigates to analytics screen  
**UI Display**:
- **Full-screen loading**: `CircularProgressIndicator` (centered)
- No charts or KPIs visible

**Duration**: Until GET /analytics/vendor/:id responds

#### Success State (Data Available)

**Trigger**: Analytics data received with invoices in selected period  
**UI Display**:
- KPIs displayed at top (current month spend, monthly average, etc.)
- Period selector dropdown visible in AppBar
- Pie chart rendered (if data available)
- Line chart rendered with:
  - **X-axis visible**: Month labels, properly spaced, no overflow
  - **Y-axis visible**: Amount + currency, grid lines
  - **Chart bounds**: Fits screen width minus padding, no horizontal scroll
  - **Responsive labels**: Density adjusted based on screen width

#### Empty State (No Data)

**Trigger**: Analytics data received but no invoices exist for selected period  
**UI Display**:
- KPIs show zeros
- Chart areas display empty state:
  - **Icon**: Chart icon (muted color)
  - **Text**: "No data available for {Month Year}"
  - **Secondary text**: "Upload invoices for this period to see analytics"
- Period selector still visible (user can switch to another period)

#### Error State

**Trigger**: GET /analytics/vendor/:id returns error (500, 404)  
**UI Display**:
- **SnackBar**: Red background, error message:
  - 404: "Business not found"
  - 500: "Failed to load analytics. Please try again."
- Screen shows empty state with error icon

#### Chart Rendering States (NEW v2.0)

**Overflow Prevention**:
- **X-axis labels**:
  - Mobile (<600px): Show every 2nd label if > 6 months
  - Tablet/Desktop: Show all labels
  - Never allow labels to overflow chart bounds
  - Rotate labels 45° if needed for dense data

- **Y-axis labels**:
  - Auto-scale range based on data
  - Show 4-6 grid lines evenly spaced
  - Currency symbol must be visible on all labels
  - Never crop labels at top/bottom edges

- **Chart container**:
  - Width: `MediaQuery.of(context).size.width - 32` (16px padding each side)
  - Height: 300px (fixed) or dynamic based on content
  - Add horizontal padding to chart so edge labels don't get cut

**Responsive Breakpoints**:
- **Mobile** (< 600px): Compact labels, reduced padding
- **Tablet** (600-1200px): Standard labels, normal padding
- **Desktop** (> 1200px): Full labels, expanded padding
```
