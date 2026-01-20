# Feature Specification: InvoiceMe Stabilization (Version 002)

**Feature Branch**: `002-invoiceme-mvp`  
**Created**: 2026-01-20  
**Status**: In Progress  
**Baseline**: Version 001 (MVP Implementation)  
**Focus**: Quality improvements, spec compliance, and user experience refinement

---

## Overview

Version 002 focuses exclusively on stabilizing the InvoiceMe MVP delivered in Version 001. This is NOT a feature release—all new functionality is deferred. The goal is to align the implementation with the original intended flow, fix quality issues, improve responsiveness, and ensure robust error handling.

### Baseline Reference

All functional requirements from **specs/001-invoiceme-mvp/** remain unchanged. Version 002 addresses implementation quality issues without expanding scope.

### Core Principles for Version 002

1. **No New Features**: Do not add screens, tabs, or capabilities beyond Version 001 PRD
2. **Minimal Changes**: Prefer small, scoped fixes over large refactors
3. **One Issue Per Task**: Each commit addresses a single identified problem
4. **Keep App Runnable**: Local development environment must remain functional
5. **Reduce Complexity**: Avoid token-heavy refactors; fix what's broken

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Responsive UI Experience (Priority: P0 - Blocker)

Users can access InvoiceMe on mobile, tablet, and desktop with appropriate layouts.

**Why this priority**: Current implementation is not responsive. Users on mobile/tablet have broken layouts that block core functionality.

**Independent Test**: Open the app on mobile (375px), tablet (768px), and desktop (1440px) viewports. All screens must be usable without horizontal scroll or overlapping elements.

**Acceptance Scenarios**:

1. **Given** user accesses app on mobile (≤640px), **When** any screen loads, **Then** single-column layout displays with touch-friendly spacing
2. **Given** user accesses app on tablet (641px-1024px), **When** dashboard loads, **Then** 2-column layout displays vendor cards and analytics
3. **Given** user accesses app on desktop (>1024px), **When** dashboard loads, **Then** 3-column layout maximizes screen real estate
4. **Given** user is on any device, **When** upload button appears, **Then** button size is appropriate for touch/click interaction
5. **Given** user accesses forms (login/signup/settings), **When** form renders, **Then** input fields and buttons are properly sized for device

---

### User Story 2 - Clear Authentication Feedback (Priority: P0 - Blocker)

Users receive clear, actionable error messages during registration and login.

**Why this priority**: Current implementation shows generic errors. Users cannot determine if email is invalid, password is weak, or credentials are wrong.

**Independent Test**: Attempt registration with invalid data and login with wrong credentials. Error messages must clearly indicate what failed.

**Acceptance Scenarios**:

1. **Given** user enters invalid email format, **When** input loses focus, **Then** inline error displays: "Please enter a valid email address"
2. **Given** user enters password shorter than 8 characters, **When** input loses focus, **Then** inline error displays: "Password must be at least 8 characters"
3. **Given** user submits registration with existing email, **When** backend responds, **Then** error displays: "An account with this email already exists"
4. **Given** user submits login with incorrect credentials, **When** backend responds, **Then** error displays: "Invalid email or password"
5. **Given** user has validation errors, **When** errors display, **Then** first invalid field receives focus for immediate correction

---

### User Story 3 - Robust Invoice Upload (Priority: P0 - Blocker)

Invoice upload handles failures gracefully without crashing or losing user progress.

**Why this priority**: Current implementation sometimes fails completely on PDF or unclear data. Users lose their upload and must retry without understanding why.

**Independent Test**: Upload a low-quality invoice image and a corrupted PDF. System must save invoice with needsReview flag instead of failing.

**Acceptance Scenarios**:

1. **Given** user uploads invoice with poor OCR quality, **When** extraction confidence is low, **Then** invoice is saved with needsReview=true and warning shown
2. **Given** user uploads invoice where vendor is unclear, **When** LLM cannot determine vendor, **Then** user is prompted to select/create vendor before save
3. **Given** user uploads PDF without selectable text, **When** OCR completes, **Then** extracted text is sent to LLM even if partially incomplete
4. **Given** LLM extraction fails, **When** error occurs, **Then** invoice is still saved with raw OCR text and manual entry prompt
5. **Given** upload encounters any error, **When** failure occurs, **Then** user sees specific error message (not generic "Upload failed")

---

### User Story 4 - Transparent Upload Progress (Priority: P1)

Users see clear progress stages during invoice upload and processing.

**Why this priority**: Current implementation shows only "Uploading..." which leaves users uncertain about long processing times (OCR + LLM can take 10-30 seconds).

**Independent Test**: Upload an invoice and observe progress indicators transitioning through: Upload → OCR → Extraction → Saving.

**Acceptance Scenarios**:

1. **Given** user uploads invoice, **When** file is uploading, **Then** progress displays "Uploading..." with percentage bar
2. **Given** file upload completes, **When** OCR starts, **Then** progress displays "Reading invoice (OCR)..." with spinner
3. **Given** OCR completes, **When** LLM extraction starts, **Then** progress displays "Extracting data..." with spinner
4. **Given** extraction completes, **When** saving to database, **Then** progress displays "Saving..." with spinner
5. **Given** entire process completes, **When** success state reached, **Then** snackbar shows success with extracted vendor name

---

### User Story 5 - Fast & Accurate Analytics (Priority: P1)

Analytics dashboards load quickly with correct data and no type errors.

**Why this priority**: Current implementation has slow loads, type casting errors, and incorrect aggregations. Users lose trust in data accuracy.

**Independent Test**: Navigate to vendor analytics and overall analytics. Both must load within 2 seconds with no console errors.

**Acceptance Scenarios**:

1. **Given** user opens vendor analytics, **When** dashboard loads, **Then** all KPIs display correct numeric values (no "NaN" or type errors)
2. **Given** user opens vendor analytics, **When** charts render, **Then** line/pie charts display without JavaScript errors
3. **Given** user has invoices in multiple currencies, **When** analytics aggregates data, **Then** normalized amounts are summed correctly
4. **Given** backend computes aggregations, **When** API responds, **Then** all numeric fields are returned as numbers (not strings)
5. **Given** user opens overall analytics, **When** dashboard loads, **Then** aggregate KPIs match sum of individual vendor KPIs

---

### User Story 6 - Streamlined Vendor Analytics (Priority: P1)

Vendor analytics screen shows only analytics data without duplicate invoice tabs.

**Why this priority**: Current implementation has an extra "Invoices" tab in vendor analytics that duplicates the main invoices list. This violates Version 001 spec.

**Independent Test**: Open vendor analytics screen. Only analytics content (KPIs, charts, limit editor) should be visible. No secondary tabs.

**Acceptance Scenarios**:

1. **Given** user opens vendor analytics, **When** screen renders, **Then** NO tab bar is present (Analytics/Invoices tabs removed)
2. **Given** user views vendor analytics, **When** content displays, **Then** KPI cards, charts, and export button are visible
3. **Given** user wants to see vendor invoices, **When** user returns to Home, **Then** vendor card shows expandable latest 5 invoices
4. **Given** user taps "View All Invoices" from vendor card, **When** navigation occurs, **Then** user goes to main Invoices list (not vendor analytics)
5. **Given** vendor analytics loads, **When** data is fetched, **Then** only aggregated metrics are retrieved (not full invoice list)

---

### Edge Cases

- What if user has extremely slow internet during upload? → Show timeout message after 60 seconds with retry option
- What if OCR returns completely empty text? → Prompt user for manual entry instead of failing silently
- What if LLM returns malformed JSON? → Log error, save raw OCR text, mark needsReview
- What if analytics endpoint times out? → Show cached data with "Data may be outdated" warning
- What if user rapidly switches between screens during load? → Cancel pending requests to prevent race conditions
- What if user's system currency changes while viewing analytics? → Re-fetch and re-normalize all displayed amounts

---

## Requirements *(mandatory)*

### Functional Requirements

#### Responsive Design (NEW - Stabilization)

- **FR-S001**: System MUST implement responsive breakpoints: Mobile (≤640px), Tablet (641px-1024px), Desktop (>1024px)
- **FR-S002**: System MUST display single-column layout on mobile with full-width components
- **FR-S003**: System MUST display 2-column layout on tablet for dashboard and analytics
- **FR-S004**: System MUST display 3-column layout on desktop for maximum space utilization
- **FR-S005**: System MUST ensure touch targets are minimum 44x44px on mobile
- **FR-S006**: System MUST prevent horizontal scrolling on all screen sizes

#### Authentication Validation (ENHANCED - Stabilization)

- **FR-S007**: System MUST provide inline validation for email format before form submission
- **FR-S008**: System MUST provide inline validation for password strength (min 8 chars) before form submission
- **FR-S009**: System MUST display specific error messages for: invalid email format, weak password, existing account, invalid credentials
- **FR-S010**: System MUST focus first invalid field when validation errors occur
- **FR-S011**: System MUST prevent form submission while validation errors exist

#### Robust Upload Pipeline (ENHANCED - Stabilization)

- **FR-S012**: System MUST save invoice with needsReview=true when OCR confidence is low (<0.7)
- **FR-S013**: System MUST save invoice with needsReview=true when LLM extraction fails
- **FR-S014**: System MUST prompt user for vendor selection when vendor cannot be auto-matched
- **FR-S015**: System MUST never hard-fail an upload; always save raw data with appropriate flags
- **FR-S016**: System MUST provide specific error messages for each failure type (OCR, LLM, validation)

#### Upload Progress Feedback (NEW - Stabilization)

- **FR-S017**: System MUST display progress stage indicator with 4 stages: Upload → OCR → Extract → Save
- **FR-S018**: System MUST show percentage progress bar during file upload stage
- **FR-S019**: System MUST show spinner with stage label during OCR/Extract/Save stages
- **FR-S020**: System MUST update progress state as backend progresses through pipeline
- **FR-S021**: System MUST show success snackbar with extracted vendor name on completion

#### Analytics Performance (ENHANCED - Stabilization)

- **FR-S022**: System MUST compute all analytics aggregations on backend (no client-side summation)
- **FR-S023**: System MUST return all numeric fields as proper number types (not strings)
- **FR-S024**: System MUST load vendor analytics within 2 seconds for up to 100 invoices
- **FR-S025**: System MUST load overall analytics within 2 seconds for up to 1000 invoices
- **FR-S026**: System MUST handle type conversion defensively on frontend to prevent runtime errors

#### Spec Compliance (NEW - Stabilization)

- **FR-S027**: Vendor analytics screen MUST NOT contain separate invoice list tab
- **FR-S028**: Vendor invoices MUST be accessible only via Home screen expandable cards or main Invoices list
- **FR-S029**: All user flows MUST match Version 001 acceptance scenarios exactly
- **FR-S030**: Implementation MUST be audited against Version 001 spec checklist before release

---

## Success Criteria *(mandatory)*

### Measurable Outcomes (Stabilization Focus)

- **SC-S001**: App displays correctly without horizontal scroll on 375px (iPhone SE), 768px (iPad), and 1440px (desktop) viewports
- **SC-S002**: Login/signup forms reject invalid inputs before submission with clear inline error messages in under 200ms
- **SC-S003**: Invoice upload completes without hard failure in 100% of cases (may set needsReview, but never crashes)
- **SC-S004**: Upload progress indicator transitions through all 4 stages visibly for users
- **SC-S005**: Vendor analytics dashboard loads within 2 seconds and displays no type errors in console
- **SC-S006**: Overall analytics dashboard loads within 2 seconds and displays no type errors in console
- **SC-S007**: Vendor analytics screen contains zero tab navigation elements (fully removed)
- **SC-S008**: All Version 001 acceptance scenarios pass when manually tested against implementation
- **SC-S009**: Frontend type parsing errors reduced to zero across all screens
- **SC-S010**: Backend aggregation queries return correct sums matching manual calculation

---

## Assumptions

All assumptions from Version 001 remain valid. Additional assumptions for stabilization:

1. Existing database schema and API contracts do not require breaking changes
2. Current extraction pipeline (OCR + LLM) can be enhanced without replacement
3. Flutter responsive framework (MediaQuery + LayoutBuilder) is sufficient for responsive design
4. Backend performance is acceptable; only query optimization is needed
5. No migration is required; fixes apply to existing data

---

## Out of Scope (Version 002)

### Explicitly Deferred to Future Versions

- New features or capabilities not in Version 001
- UI/UX redesigns beyond responsive breakpoints
- Performance optimization beyond analytics query fixes
- Third-party service integrations beyond existing (Supabase, Tesseract, Ollama)
- Database schema changes
- Migration scripts for existing data
- Advanced error recovery (retries, background sync)
- Offline functionality
- Real-time updates (WebSockets)

---

## Implementation Constraints

1. **Token Efficiency**: Avoid large refactors; target specific problems with minimal code changes
2. **Incremental Delivery**: Each fix must be independently testable and deployable
3. **Backward Compatibility**: Do not break existing working functionality while fixing issues
4. **Local Development**: All fixes must be testable in local environment without complex setup
5. **Code Review**: Each fix must have clear before/after behavior documented

---

## Compliance Audit Checklist

Before marking Version 002 complete, validate:

- [ ] All 8 user stories from Version 001 spec pass acceptance scenarios
- [ ] Home screen empty state matches spec exactly
- [ ] Vendor cards display latest 5 invoices (expandable)
- [ ] Vendor analytics has NO invoice list tab
- [ ] Upload flow shows 4 progress stages
- [ ] Auth forms have inline validation
- [ ] Analytics dashboards load without type errors
- [ ] App is responsive on mobile/tablet/desktop
- [ ] No hard failures on invoice upload
- [ ] All API responses return correctly typed data
