# UI States: InvoiceMe Stabilization

**Feature**: 003-invoiceme-stabilization  
**Purpose**: Define UI states for snackbars, dialogs, and loading indicators

## Snackbar States (Item 4)

### Success Snackbar
**Appearance**:
- Background: Green (`Colors.green`)
- Text: White
- Icon: Checkmark (optional)
- Action Button: "Dismiss" (white text)
- Behavior: `SnackBarBehavior.floating`

**Triggers**: Successful save, delete, export, update operations

**Dismiss Behavior**:
- Auto-dismiss after 5 seconds
- Manual dismiss via "Dismiss" button
- Manual dismiss via tap outside snackbar
- Swipe gesture dismisses (horizontal)

### Error Snackbar
**Appearance**:
- Background: Red (`Colors.red`)
- Text: White
- Icon: Error icon (optional)
- Action Button: "Retry" (if applicable) or "Dismiss"
- Behavior: `SnackBarBehavior.floating`

**Triggers**: Failed save, delete, export, update, validation errors

**Dismiss Behavior**:
- Auto-dismiss after 5 seconds
- Manual dismiss via action button
- Manual dismiss via tap outside
- Swipe gesture dismisses

### Info Snackbar
**Appearance**:
- Background: Blue (`Colors.blue.shade700`)
- Text: White
- Icon: Info icon (optional)
- Action Button: "Dismiss"
- Behavior: `SnackBarBehavior.floating`

**Triggers**: Informational messages, tips, warnings

**Dismiss Behavior**:
- Auto-dismiss after 5 seconds
- Manual dismiss via "Dismiss" button
- Manual dismiss via tap outside
- Swipe gesture dismisses

---

## Dialog States (Item 18)

### Dialog Loading State
**Appearance**:
- Save button shows `CircularProgressIndicator` (small, 20x20)
- All action buttons disabled (grayed out)
- Dialog cannot be dismissed (`barrierDismissible: false`)
- Content remains visible but interactive

**Triggers**: User clicks save/delete in any dialog

**Behavior**:
- Loading state starts immediately (<100ms after click)
- Persists until API response returns
- On success: Loading stops, snackbar shows, dialog closes
- On error: Loading stops, error snackbar shows, dialog stays open

### Dialog Idle State
**Appearance**:
- All buttons enabled and interactive
- No loading indicators
- Dialog is dismissible via cancel button or back gesture

**Behavior**:
- User can type, interact normally
- Cancel button closes dialog immediately
- Save button triggers loading state

### Dialog Error State
**Appearance**:
- Error snackbar shows (outside dialog)
- Dialog remains open
- User can correct input or retry
- Action buttons re-enabled after error

---

## Dialog Positioning (Mobile - Item 12)

### Mobile Dialog (Keyboard Hidden)
**Layout**:
- Dialog vertically centered on screen
- Standard padding (16-24px)
- Content fits within visible area

### Mobile Dialog (Keyboard Visible)
**Layout**:
- Dialog remains accessible (not pushed off-screen)
- Content wrapped in `SingleChildScrollView`
- User can scroll to see all content including action buttons
- Keyboard doesn't obscure save/cancel buttons

**Technical Implementation**:
```dart
AlertDialog(
  content: SingleChildScrollView(
    shrinkWrap: true,
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Dialog content (text fields, etc.)
      ],
    ),
  ),
  actions: [/* buttons */],
)
```

---

## Loading Overlay (Upload - Existing)

### Upload Loading State
**Appearance**:
- Semi-transparent overlay covering home screen
- Large `CircularProgressIndicator` centered
- Status text below indicator
- Stages: "Uploading...", "Processing...", "Extracting..."

**Behavior**:
- Appears immediately on file selection
- Cannot be dismissed until complete
- On success: Overlay disappears, success snackbar
- On error: Overlay disappears, error snackbar

---

## Empty State (Item 5)

### Home Screen - No Businesses
**Appearance**:
- 2 centered buttons vertically stacked
- Button 1: "Add Business" (primary style)
- Button 2: "Upload Invoice" (secondary or outlined style)
- NO add business icon in app bar
- NO floating action button at bottom

**Spacing**:
- Buttons separated by 16px
- Centered both horizontally and vertically

---

## Home Screen States (Items 5, 7)

### Empty State (No Businesses)
**Layout**:
- EmptyState widget shows 2 centered buttons
- App bar: title + settings icon ONLY
- No floating action button
- No add business icon button

### With Businesses State
**Layout**:
- Business list displayed
- App bar: title + business icon + insights icon + settings icon
- Single floating action button: "Upload Invoice" (centered at bottom)
- NO separate add business floating button

---

## Button Positioning

### Mobile (375px)
- Floating action button: centered at bottom
- Action buttons in dialogs: full width or wrap content (not stretched)

### Tablet (768px)
- Floating action button: centered at bottom
- Action buttons: appropriate sizing for tablet

### Desktop (1440px)
- Floating action button: centered at bottom (not full width)
- Dialog action buttons: wrap content (max 200px each)
- List/grid action buttons: not full width (use max-width containers)

---

## Chart States (Item 20)

### Chart Loading
**Appearance**:
- Placeholder with `CircularProgressIndicator`
- Or skeleton loader showing chart shape

### Chart Loaded (Data Available)
**Appearance**:
- Chart fits within container
- X-axis labels visible at bottom
- Y-axis labels visible on left
- `reservedSize: 40` for left axis
- `reservedSize: 30` for bottom axis
- Responsive sizing based on container width

### Chart Empty (No Data)
**Appearance**:
- Empty state message: "No data available"
- Icon indicating no data

---

## Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

---

## Color Palette

**Feedback Colors**:
- Success: `Colors.green`
- Error: `Colors.red`
- Info/Warning: `Colors.blue.shade700` or `Colors.orange`

**Theme**:
- Always `ThemeMode.light` (Item 1)
- Background: Light (not affected by system dark mode)

---

## Notes

- All states must work on mobile, tablet, and desktop
- Loading indicators must appear immediately (<100ms)
- Snackbars must be consistent across all screens (use `SnackbarUtils`)
- Dialogs must be keyboard-safe on mobile (scrollable content)
