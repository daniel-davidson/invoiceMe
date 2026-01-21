# Feature Specification: UX & Responsive Fixes

**Feature Branch**: `004-ux-responsive-fixes`  
**Created**: 2026-01-21  
**Status**: Specified ✅  
**Parent Spec**: [003-invoiceme-stabilization](../003-invoiceme-stabilization/)

## Overview

This specification addresses UI/UX refinements, responsive design issues, and functional gaps in the InvoiceMe MVP. The focus is on fixing existing screens and flows without adding new features or changing navigation structure. All work maintains the current user journey while improving reliability, responsiveness, and user feedback quality.

## User Scenarios & Testing

### User Story 1 - Responsive Mobile/Tablet UI (Priority: P1)

**As a** user on mobile or tablet  
**I want** all screens to fit properly without overflow  
**So that** I can use the full app on any device

**Why this priority**: Critical usability issue blocking mobile users

**Independent Test**: Access app on mobile (320px-768px width) and navigate through all screens. No horizontal scrolling or RenderFlex overflow errors should occur.

**Acceptance Scenarios**:

1. **Given** I'm on mobile (375px width), **When** I view any screen (home, analytics, settings, invoices), **Then** all content fits within viewport with no overflow
2. **Given** I'm on tablet (768px width), **When** I view charts and buttons, **Then** all elements are proportionally sized and touchable
3. **Given** I'm viewing analytics charts on mobile, **When** the screen renders, **Then** axes labels are visible and chart fits screen width

---

### User Story 2 - Auth Validation Consistency (Priority: P1)

**As a** new user registering or existing user changing password  
**I want** clear, consistent password requirements  
**So that** I don't get rejected after following unclear rules

**Why this priority**: Critical user experience issue causing registration failures

**Independent Test**: Attempt registration and password change with various passwords. Rules should be identical (8+ characters) with clear messaging.

**Acceptance Scenarios**:

1. **Given** I'm on registration screen, **When** I enter a 7-character password, **Then** I see error "Password must be at least 8 characters"
2. **Given** I'm changing password in settings, **When** I enter a 7-character password, **Then** I see the same error message
3. **Given** I enter an 8-character password, **When** I submit, **Then** validation passes without errors

---

### User Story 3 - Upload Reliability & Error Handling (Priority: P1)

**As a** user uploading invoice images  
**I want** clear feedback when upload fails or is processing  
**So that** I understand what's happening and can retry if needed

**Why this priority**: Critical functionality with poor error feedback

**Independent Test**: Upload various file sizes including large images (>5MB). System should handle gracefully with loading states and error messages.

**Acceptance Scenarios**:

1. **Given** I select a large invoice image, **When** upload starts, **Then** I see a loading indicator immediately
2. **Given** upload fails due to size or network, **When** error occurs, **Then** I see specific error message with retry option
3. **Given** upload succeeds, **When** processing completes, **Then** I see success snackbar that auto-dismisses after 5 seconds

---

### User Story 4 - Dialog UX Consistency (Priority: P1)

**As a** user editing businesses or invoices  
**I want** consistent dialog behavior across all edit actions  
**So that** I have a predictable, smooth experience

**Why this priority**: Inconsistent UX causing confusion and perceived bugs

**Independent Test**: Edit business name and invoice details on mobile. Dialogs should show immediate loading state, not be pushed too high by keyboard, and handle saves/deletes consistently.

**Acceptance Scenarios**:

1. **Given** I open edit business dialog, **When** I click Save, **Then** button shows loading state immediately before request completes
2. **Given** I'm on mobile with keyboard open, **When** dialog displays, **Then** dialog remains fully visible and keyboard-safe
3. **Given** I click Delete in any dialog, **When** confirmation appears, **Then** loading states show during deletion

---

### User Story 5 - Profile Settings Fix (Priority: P2)

**As a** user  
**I want** to update my name and system currency successfully  
**So that** my profile reflects my preferences

**Why this priority**: Core functionality currently not working end-to-end

**Independent Test**: Change name and currency in settings. Verify changes persist and reflect throughout app.

**Acceptance Scenarios**:

1. **Given** I'm in settings, **When** I change my name and save, **Then** name updates successfully and shows in app header
2. **Given** I change system currency, **When** I save, **Then** all amounts throughout app display in new currency
3. **Given** settings fail to save, **When** error occurs, **Then** I see specific error message and can retry

---

### User Story 6 - Analytics Improvements (Priority: P2)

**As a** user viewing analytics (overall or per-business)  
**I want** charts to load quickly, show meaningful data, and render correctly  
**So that** I can understand my spending patterns

**Why this priority**: Important feature currently providing poor UX

**Independent Test**: Access overall analytics and business-specific analytics on mobile and desktop. Charts should render with visible axes, show meaningful KPIs, and indicate when demo data is shown.

**Acceptance Scenarios**:

1. **Given** I have no real invoice data, **When** I view analytics, **Then** I see message "Using demo resources" and sample charts
2. **Given** charts are rendering, **When** page loads, **Then** loading skeleton shows before data appears (perceived performance)
3. **Given** I'm on mobile, **When** chart renders, **Then** X and Y axes labels are visible and readable
4. **Given** I have real data, **When** analytics load, **Then** KPIs show accurate totals and trends

---

### User Story 7 - Export/Share Implementation (Priority: P2)

**As a** user  
**I want** to download or share invoice data (per business or overall)  
**So that** I can use data in other tools or share with others

**Why this priority**: Buttons exist but functionality incomplete

**Independent Test**: Click export buttons on overall analytics and business analytics screens. Should generate downloadable file or trigger share sheet.

**Acceptance Scenarios**:

1. **Given** I'm viewing overall analytics, **When** I click download/export button, **Then** CSV file downloads with all invoice data
2. **Given** I'm viewing business analytics, **When** I click export, **Then** CSV file downloads with only that business's invoices
3. **Given** export fails, **When** error occurs, **Then** I see error snackbar with retry option
4. **Given** I'm on mobile with share support, **When** I click share, **Then** native share sheet opens with CSV file

---

### User Story 8 - Runtime Error Fixes (Priority: P1)

**As a** developer/user  
**I want** no type errors or crashes in the app  
**So that** the app runs reliably

**Why this priority**: Production stability issue

**Independent Test**: Navigate through entire app on web build. No console errors about type mismatches should appear.

**Acceptance Scenarios**:

1. **Given** I navigate to any screen, **When** page renders, **Then** no "type 'minified:y0' is not a subtype of type 'String'" errors appear
2. **Given** I interact with any feature, **When** data loads, **Then** no type casting errors occur
3. **Given** I use the app for an extended session, **When** switching between screens, **Then** no memory leaks or type errors accumulate

---

### Edge Cases

- What happens when user has 100+ invoices and tries to export?
- How does app handle device rotation mid-operation?
- What happens if network drops during upload?
- How are very long business names handled in mobile layout?
- What happens if user has 0 invoices but tries analytics/export?
- How does keyboard behavior affect dialog positioning on different mobile keyboards?
- What happens when currency conversion rate API is unavailable?

## Requirements

### Functional Requirements

**Responsive UI**:
- **FR-001**: All screens MUST render without RenderFlex overflow on mobile (320px-768px)
- **FR-002**: Charts MUST fit screen width with visible axes on all breakpoints
- **FR-003**: Touch targets MUST be minimum 44x44px on mobile
- **FR-004**: Dialogs MUST remain keyboard-safe (not pushed too high by soft keyboard)

**Auth & Validation**:
- **FR-005**: Password requirements MUST be consistent across registration and password change (8+ characters)
- **FR-006**: Validation error messages MUST be identical and clear across all auth flows
- **FR-007**: Input fields MUST show inline validation errors immediately

**Upload & Reliability**:
- **FR-008**: Upload MUST show loading indicator immediately upon file selection
- **FR-009**: Large images (up to 10MB) MUST be handled with progress feedback
- **FR-010**: Upload errors MUST provide specific, actionable error messages
- **FR-011**: All snackbars MUST auto-dismiss after 5 seconds and be manually dismissible

**Dialog UX**:
- **FR-012**: Save/Delete buttons MUST show loading state during API calls
- **FR-013**: Dialogs MUST behave consistently across all edit flows (business, invoice, settings)
- **FR-014**: Mobile dialogs MUST adjust positioning when keyboard appears

**Settings**:
- **FR-015**: Name update MUST persist and reflect immediately in UI
- **FR-016**: Currency change MUST update all displayed amounts throughout app
- **FR-017**: Settings failures MUST show specific error with retry option

**Analytics**:
- **FR-018**: Analytics MUST show loading skeleton before data appears
- **FR-019**: Demo data MUST be clearly indicated with "Using demo resources" message
- **FR-020**: Charts MUST render with visible X and Y axis labels on all breakpoints
- **FR-021**: KPIs MUST show accurate calculations from real invoice data
- **FR-022**: Per-business analytics MUST filter correctly to show only that business's data

**Export/Share**:
- **FR-023**: Export MUST generate valid CSV file with all required columns
- **FR-024**: Per-business export MUST include only that business's invoices
- **FR-025**: Overall export MUST include all user's invoices across all businesses
- **FR-026**: Export failures MUST show error snackbar with retry option
- **FR-027**: Mobile share MUST trigger native share sheet where supported

**Type Safety**:
- **FR-028**: All data transformations MUST handle null/undefined safely
- **FR-029**: Type casting MUST include runtime checks or defaults
- **FR-030**: Minified code MUST maintain type safety in production build

### Key Entities

No new entities. All fixes apply to existing entities from 002-invoiceme-mvp:
- User (auth, profile settings)
- Business/Vendor
- Invoice (upload, edit, analytics, export)
- Analytics data (KPIs, charts)

## Success Criteria

### Measurable Outcomes

**Responsive UI**:
- **SC-001**: 0 RenderFlex overflow errors on mobile testing (320px-768px widths)
- **SC-002**: All charts render with visible axes on screens from 320px to 1920px width
- **SC-003**: All buttons/touch targets measure at least 44x44px on mobile

**Auth & Validation**:
- **SC-004**: Password validation consistent across 100% of auth flows
- **SC-005**: Error messages identical in registration and password change screens
- **SC-006**: Users can complete registration with 8-character password (0 false failures)

**Upload & Reliability**:
- **SC-007**: Loading indicator appears within 100ms of file selection
- **SC-008**: Large images (up to 10MB) upload successfully with progress feedback
- **SC-009**: 100% of upload errors show actionable error message
- **SC-010**: All snackbars auto-dismiss after 5 seconds ±500ms

**Dialog UX**:
- **SC-011**: Save/Delete buttons show loading state within 100ms of click
- **SC-012**: Dialogs remain fully visible when keyboard opens on mobile (0 cases of content hidden)
- **SC-013**: Edit flows behave consistently (same loading pattern, same error handling)

**Settings**:
- **SC-014**: Name changes persist and reflect in UI within 2 seconds
- **SC-015**: Currency changes update all amounts throughout app (100% of displays)

**Analytics**:
- **SC-016**: Analytics show loading skeleton (perceived load time < 1 second)
- **SC-017**: Demo data clearly indicated when no real invoices exist
- **SC-018**: Chart axes visible and readable on all tested screen sizes (320px-1920px)
- **SC-019**: KPIs calculate correctly from invoice data (0 math errors)

**Export/Share**:
- **SC-020**: Export generates valid CSV that opens in Excel/Sheets
- **SC-021**: Per-business export includes only correct business invoices (100% accuracy)
- **SC-022**: Overall export includes all user invoices (100% completeness)
- **SC-023**: Share sheet opens on mobile within 1 second of button press

**Type Safety**:
- **SC-024**: 0 type mismatch errors in production web build during full app navigation
- **SC-025**: All data transformations handle null/undefined without crashes

## Out of Scope

- New features or screens
- Changes to user flow or navigation structure
- New routes or URL patterns
- Database schema changes
- New API endpoints (only fixes to existing endpoints)
- Performance optimization beyond perceived UX improvements
- Accessibility beyond basic responsive design
- Internationalization (i18n)
- Dark mode

## Dependencies

- Existing 002-invoiceme-mvp implementation
- Existing 003-invoiceme-stabilization fixes
- Flutter responsive widgets
- CSV generation library (frontend or backend)
- Native share API (mobile web)

## Assumptions

1. Password rules should be standardized to 8+ characters (simplest, secure enough)
2. Snackbar auto-dismiss of 5 seconds is industry standard
3. CSV export is sufficient (no Excel/PDF needed yet)
4. Demo data in analytics is acceptable when no real data exists
5. Loading skeletons improve perceived performance even if actual time unchanged
6. Mobile share sheet is best UX for share functionality on mobile web

## References

- Parent Spec: [003-invoiceme-stabilization](../003-invoiceme-stabilization/)
- Original Spec: [002-invoiceme-mvp](../002-invoiceme-mvp/)
- Flutter Responsive Design: https://docs.flutter.dev/ui/layout/responsive
- Material Design Touch Targets: https://m3.material.io/foundations/accessible-design/accessibility-basics

## Constraints

- **Non-Negotiable**: Do NOT change user flow, navigation order, or add new screens
- **Non-Negotiable**: Preserve existing routes and screen structure
- **Non-Negotiable**: Only fix bugs and improve existing UI/UX
- Must maintain compatibility with existing data model
- Must work on web platform (Flutter web)
- Must work on Chrome, Edge, Firefox, Safari
