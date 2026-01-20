# Tasks: InvoiceMe Stabilization (Version 002)

**Purpose**: Ordered task list for Version 002 stabilization  
**Created**: 2026-01-20  
**Based On**: FLOW_CONTRACT.md, ROUTES_MAP.md, UI_STATES.md, PLAN_STABILIZATION.md  
**Status**: Implementation Tasks

---

## Task List Overview

**Total Tasks**: 58  
**Organization**: Prioritized by P0 (Critical) → P1 (High) → P2 (Medium) → P3 (Low) → P4 (Audit)

**Checklist Format**:
```
- [ ] [TaskID] [P?] Description with file path
```

**Labels**:
- `[P]` = Parallelizable (can be done simultaneously with other [P] tasks)
- `TaskID` = Sequential task identifier (T001, T002, etc.)

**Priority Levels**:
- **P0**: Upload reliability + progress (Critical)
- **P1**: Analytics correctness + performance + remove extra UI (High)
- **P2**: Auth UX validation/errors (Medium)
- **P3**: Responsive UI breakpoints (Low)
- **P4**: Final spec compliance audit run

---

## Phase 0: Observability & Baseline Metrics (Foundation)

**Goal**: Add logging to identify bottlenecks and measure improvements

### Tasks

- [ ] T001 [P] Add timing logs to backend PDF-to-image conversion in `backend/src/extraction/ocr/pdf-processor.service.ts`
  - **Goal**: Log execution time for PDF conversion
  - **Files**: `backend/src/extraction/ocr/pdf-processor.service.ts`
  - **Acceptance**: Logs show `[PdfProcessorService] PDF conversion took Xs`
  - **Test**: Upload PDF, verify logs appear in console

- [ ] T002 [P] Add timing logs to backend OCR processing in `backend/src/extraction/ocr/ocr.service.ts`
  - **Goal**: Log execution time for OCR (each PSM mode + total)
  - **Files**: `backend/src/extraction/ocr/ocr.service.ts`
  - **Acceptance**: Logs show `[OcrService] OCR took Xs (PSM 6: Xs, PSM 4: Xs, ...)`
  - **Test**: Upload image, verify logs appear in console

- [ ] T003 [P] Add timing logs to backend LLM extraction in `backend/src/extraction/llm/ollama.service.ts`
  - **Goal**: Log execution time for LLM extraction
  - **Files**: `backend/src/extraction/llm/ollama.service.ts`
  - **Acceptance**: Logs show `[OllamaService] LLM extraction took Xs`
  - **Test**: Upload invoice, verify logs appear in console

- [ ] T004 [P] Add timing logs to backend database save in `backend/src/invoices/invoices.service.ts`
  - **Goal**: Log execution time for invoice DB save
  - **Files**: `backend/src/invoices/invoices.service.ts`
  - **Acceptance**: Logs show `[InvoicesService] DB save took Xs`
  - **Test**: Upload invoice, verify logs appear in console

- [ ] T005 [P] Add timing logs to backend analytics queries in `backend/src/analytics/analytics.service.ts`
  - **Goal**: Log execution time for analytics aggregation queries
  - **Files**: `backend/src/analytics/analytics.service.ts`
  - **Acceptance**: Logs show `[AnalyticsService] Vendor analytics query took Xs`
  - **Test**: Open analytics screen, verify logs appear in console

- [ ] T006 [P] Add timing logs to frontend upload flow in `frontend/lib/features/home/presentation/providers/home_provider.dart`
  - **Goal**: Log timing for upload start, request sent, response received, render complete
  - **Files**: `frontend/lib/features/home/presentation/providers/home_provider.dart`
  - **Acceptance**: Logs show `[HomeProvider] Upload took Xs total`
  - **Test**: Upload invoice, verify logs appear in Flutter console

- [ ] T007 Create baseline metrics document at `specs/002-invoiceme-mvp/BASELINE_METRICS.md`
  - **Goal**: Document baseline performance metrics for comparison
  - **Files**: `specs/002-invoiceme-mvp/BASELINE_METRICS.md` (new file)
  - **Acceptance**: Document contains 3 sample uploads (Hebrew, English, PDF) with timing breakdown
  - **Test**: Run 3 uploads, record timings, verify document created

---

## Phase 1: Upload Reliability (P0 - Critical)

**Goal**: Ensure uploads never hard-fail; always save invoice with `needsReview` if needed

### Tasks

- [ ] T008 Make `vendorName`, `totalAmount`, `currency` nullable in `backend/src/extraction/llm/extraction-schema.ts`
  - **Goal**: Allow LLM extraction to use fallback values
  - **Files**: `backend/src/extraction/llm/extraction-schema.ts`
  - **Acceptance**: Schema fields are nullable (use `z.string().nullable()` or similar)
  - **Test**: Verify schema compiles without errors

- [ ] T009 Add LLM extraction fallback logic in `backend/src/extraction/extraction.service.ts`
  - **Goal**: Wrap LLM extraction in try-catch, use fallback values on failure
  - **Files**: `backend/src/extraction/extraction.service.ts`
  - **Acceptance**: If LLM fails or returns invalid JSON, set `needsReview=true`, `vendorName="Unknown Vendor"`, `totalAmount=null`, `invoiceDate=new Date()`, add warning
  - **Test**: Upload unreadable invoice, verify invoice saved with `needsReview=true` and fallback values

- [ ] T010 Update invoice creation to allow `needsReview=true` with null amounts in `backend/src/invoices/invoices.service.ts`
  - **Goal**: Allow invoice save with null amounts if extraction failed
  - **Files**: `backend/src/invoices/invoices.service.ts`
  - **Acceptance**: Invoice creation succeeds with `needsReview=true`, `totalAmount=null`, `vendorName="Unknown Vendor"`
  - **Test**: Create invoice with null amounts, verify DB save succeeds

- [ ] T011 Prevent auto-creation of "Unknown Vendor" business in `backend/src/invoices/invoices.service.ts`
  - **Goal**: Do not auto-create business if vendorName is "Unknown Vendor"
  - **Files**: `backend/src/invoices/invoices.service.ts`
  - **Acceptance**: If `vendorName="Unknown Vendor"`, skip business creation, leave invoice unassigned
  - **Test**: Upload with fallback extraction, verify no business named "Unknown Vendor" created

- [ ] T012 Add OCR failure fallback in `backend/src/extraction/ocr/ocr.service.ts`
  - **Goal**: Wrap Tesseract calls in try-catch, return empty string on OCR failure
  - **Files**: `backend/src/extraction/ocr/ocr.service.ts`
  - **Acceptance**: If OCR fails entirely, return empty string as OCR text, log error
  - **Test**: Upload completely blank image, verify OCR returns empty string, no crash

- [ ] T013 Handle empty OCR text in `backend/src/extraction/extraction.service.ts`
  - **Goal**: If OCR text is empty, set `needsReview=true`, add warning "OCR failed to extract text"
  - **Files**: `backend/src/extraction/extraction.service.ts`
  - **Acceptance**: Empty OCR text triggers `needsReview=true` with warning
  - **Test**: Upload blank image, verify invoice saved with `needsReview=true` and OCR warning

- [ ] T014 Update success message to include vendor name and review status in `frontend/lib/features/home/presentation/providers/home_provider.dart`
  - **Goal**: Extract `vendorName` and `needsReview` from API response, show detailed success message
  - **Files**: `frontend/lib/features/home/presentation/providers/home_provider.dart`
  - **Acceptance**: Success message shows "Invoice uploaded successfully! Added to {VendorName}." or "Invoice uploaded but needs review. Please check {VendorName}."
  - **Test**: Upload invoice, verify success message includes vendor name and review status

---

## Phase 2: Upload Progress UX (P0 - Critical)

**Goal**: Show clear, stage-based progress during upload

### Tasks

- [ ] T015 Add `UploadStage` enum to `frontend/lib/features/home/presentation/providers/home_provider.dart`
  - **Goal**: Define upload stages (idle, uploading, ocr, extracting, saving, complete, error)
  - **Files**: `frontend/lib/features/home/presentation/providers/home_provider.dart`
  - **Acceptance**: Enum defined with all 7 stages
  - **Test**: Verify code compiles

- [ ] T016 Update `UploadState` to include `uploadStage` field in `frontend/lib/features/home/presentation/providers/home_provider.dart`
  - **Goal**: Add `uploadStage` field to state class
  - **Files**: `frontend/lib/features/home/presentation/providers/home_provider.dart`
  - **Acceptance**: `UploadState` has `uploadStage` field of type `UploadStage`
  - **Test**: Verify code compiles

- [ ] T017 Implement stage transitions in upload methods `_uploadFileFromPath` and `_uploadFileFromBytes` in `frontend/lib/features/home/presentation/providers/home_provider.dart`
  - **Goal**: Update upload stage during upload flow (uploading → ocr → extracting → saving → complete)
  - **Files**: `frontend/lib/features/home/presentation/providers/home_provider.dart`
  - **Acceptance**: State updates to each stage during upload, with small delays for visibility
  - **Test**: Upload invoice, verify state transitions through all stages

- [ ] T018 Add `_getUploadStageText` helper in `frontend/lib/features/home/presentation/screens/home_screen.dart`
  - **Goal**: Map upload stage enum to user-friendly text
  - **Files**: `frontend/lib/features/home/presentation/screens/home_screen.dart`
  - **Acceptance**: Helper returns "Uploading file...", "Processing OCR...", "Extracting data...", "Saving invoice..." based on stage
  - **Test**: Verify text strings match UI_STATES.md

- [ ] T019 Update upload overlay to display current stage text in `frontend/lib/features/home/presentation/screens/home_screen.dart`
  - **Goal**: Show stage-specific text below CircularProgressIndicator
  - **Files**: `frontend/lib/features/home/presentation/screens/home_screen.dart`
  - **Acceptance**: Overlay shows current stage text that updates during upload
  - **Test**: Upload invoice, verify all 4 stage texts appear in sequence

---

## Phase 3: Analytics Performance & Correctness (P1 - High)

**Goal**: Fast analytics with backend aggregation, no type errors, no forbidden tabs

### Tasks

- [ ] T020 **CRITICAL** Remove `TabController` from `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
  - **Goal**: Remove all tab-related code from Single Business Analytics screen
  - **Files**: `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
  - **Acceptance**: NO `TabController`, NO `TabBar`, NO `TabBarView` exists
  - **Test**: Navigate to Single Business Analytics, verify NO tabs visible

- [ ] T021 **CRITICAL** Remove `_buildInvoicesTab` method from `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
  - **Goal**: Remove invoices tab UI code
  - **Files**: `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
  - **Acceptance**: `_buildInvoicesTab` method deleted, all references removed
  - **Test**: Verify code compiles, no invoices list visible on screen

- [ ] T022 **CRITICAL** Remove invoice-fetching logic from `frontend/lib/features/vendors/presentation/providers/vendor_analytics_provider.dart`
  - **Goal**: Remove any invoice-related state/logic from analytics provider
  - **Files**: `frontend/lib/features/vendors/presentation/providers/vendor_analytics_provider.dart`
  - **Acceptance**: Provider ONLY fetches analytics data, NO invoice data
  - **Test**: Verify code compiles, analytics screen loads without invoice data

- [ ] T023 [P] Implement `getVendorAnalytics` with backend aggregation in `backend/src/analytics/analytics.service.ts`
  - **Goal**: Compute KPIs using Prisma aggregations (monthlySpent, monthlyAvg, yearlyAvg)
  - **Files**: `backend/src/analytics/analytics.service.ts`
  - **Acceptance**: Method returns aggregated KPIs (all numbers, not strings), uses Prisma `aggregate` and `$queryRaw`
  - **Test**: Call `GET /analytics/vendor/:id`, verify response contains aggregated KPIs

- [ ] T024 Implement line chart data aggregation in `backend/src/analytics/analytics.service.ts`
  - **Goal**: Query monthly spending for last 12 months using `$queryRaw`
  - **Files**: `backend/src/analytics/analytics.service.ts`
  - **Acceptance**: Returns line chart data (months + amounts) for last 12 months
  - **Test**: Verify line chart data in API response

- [ ] T025 Implement pie chart data aggregation (top 5 items) in `backend/src/analytics/analytics.service.ts`
  - **Goal**: Parse `lineItems` from `llmResponse`, aggregate by description, return top 5
  - **Files**: `backend/src/analytics/analytics.service.ts`
  - **Acceptance**: Returns pie chart data (top 5 line items for current month)
  - **Test**: Verify pie chart data in API response

- [ ] T026 Define strict DTO types in `backend/src/analytics/dto/analytics-response.dto.ts`
  - **Goal**: Create `VendorAnalyticsDto` with all numeric fields typed as `number`
  - **Files**: `backend/src/analytics/dto/analytics-response.dto.ts`
  - **Acceptance**: All KPI fields are `number` (not `string`), charts have proper types
  - **Test**: Verify TypeScript compilation, no type errors

- [ ] T027 Update `GET /analytics/vendors/:id` endpoint in `backend/src/analytics/analytics.controller.ts`
  - **Goal**: Return aggregated DTO from `getVendorAnalytics`
  - **Files**: `backend/src/analytics/analytics.controller.ts`
  - **Acceptance**: Endpoint returns `VendorAnalyticsDto`, response time < 2 seconds
  - **Test**: Call endpoint, verify response structure and timing

- [ ] T028 Update `VendorKpis.fromJson` to parse backend aggregated response in `frontend/lib/features/vendors/presentation/providers/vendor_analytics_provider.dart`
  - **Goal**: Remove client-side aggregation, parse backend response directly
  - **Files**: `frontend/lib/features/vendors/presentation/providers/vendor_analytics_provider.dart`
  - **Acceptance**: `fromJson` parses backend response, uses `_parseDouble` helper for all numeric fields
  - **Test**: Verify KPIs parse correctly, no type errors

- [ ] T029 Remove client-side aggregation logic from `vendor_analytics_provider.dart`
  - **Goal**: Delete any client-side sum/average calculations
  - **Files**: `frontend/lib/features/vendors/presentation/providers/vendor_analytics_provider.dart`
  - **Acceptance**: NO client-side aggregation code exists, all data comes from backend
  - **Test**: Verify code compiles, analytics render correctly

- [ ] T030 Update `vendor_analytics_screen.dart` to render KPIs directly from provider
  - **Goal**: Display KPIs without client-side computation
  - **Files**: `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
  - **Acceptance**: KPIs displayed directly from provider state, no computation in widget
  - **Test**: Navigate to Single Business Analytics, verify KPIs render correctly

- [ ] T031 Verify `ChartDataset.fromJson` uses `_parseDouble` helper in `vendor_analytics_provider.dart`
  - **Goal**: Ensure chart data parsing is type-safe
  - **Files**: `frontend/lib/features/vendors/presentation/providers/vendor_analytics_provider.dart`
  - **Acceptance**: All numeric chart values use `_parseDouble` helper
  - **Test**: Verify charts render without type errors, check console for errors (should be none)

- [ ] T032 [P] Implement `getOverallAnalytics` with backend aggregation in `backend/src/analytics/analytics.service.ts`
  - **Goal**: Compute overall balance, pie chart (top 5 businesses), line chart (overall monthly spending)
  - **Files**: `backend/src/analytics/analytics.service.ts`
  - **Acceptance**: Method returns aggregated overall analytics data
  - **Test**: Call `GET /analytics/overall`, verify response contains aggregated data

- [ ] T033 Define `OverallAnalyticsDto` in `backend/src/analytics/dto/analytics-response.dto.ts`
  - **Goal**: Create DTO for overall analytics response
  - **Files**: `backend/src/analytics/dto/analytics-response.dto.ts`
  - **Acceptance**: DTO has proper types (all numbers)
  - **Test**: Verify TypeScript compilation

- [ ] T034 Update `GET /analytics/overall` endpoint in `backend/src/analytics/analytics.controller.ts`
  - **Goal**: Return aggregated DTO from `getOverallAnalytics`
  - **Files**: `backend/src/analytics/analytics.controller.ts`
  - **Acceptance**: Endpoint returns `OverallAnalyticsDto`, response time < 2 seconds
  - **Test**: Call endpoint, verify response structure and timing

- [ ] T035 Update `overall_analytics_provider.dart` to parse backend aggregated response
  - **Goal**: Remove client-side aggregation, use backend data
  - **Files**: `frontend/lib/features/analytics/presentation/providers/overall_analytics_provider.dart`
  - **Acceptance**: Provider parses backend response, uses `_parseDouble` helper for all numeric fields
  - **Test**: Verify analytics parse correctly, no type errors

- [ ] T036 Verify `OverallKpis` and `PieChartSegment` use `_parseDouble` helper
  - **Goal**: Ensure type-safe parsing for overall analytics
  - **Files**: `frontend/lib/features/analytics/presentation/providers/overall_analytics_provider.dart`
  - **Acceptance**: All numeric values use `_parseDouble`
  - **Test**: Navigate to Businesses Analysis Screen, verify no type errors in console

---

## Phase 4: Auth UX Improvements (P2 - Medium)

**Goal**: Inline validation, user-friendly error messages

### Tasks

- [ ] T037 Add email validator to `frontend/lib/features/auth/presentation/screens/login_screen.dart`
  - **Goal**: Validate email format using regex
  - **Files**: `frontend/lib/features/auth/presentation/screens/login_screen.dart`
  - **Acceptance**: `_validateEmail` function returns error for invalid email format
  - **Test**: Type invalid email, verify inline error shows

- [ ] T038 Add password validator to `login_screen.dart`
  - **Goal**: Validate password minimum 8 characters
  - **Files**: `frontend/lib/features/auth/presentation/screens/login_screen.dart`
  - **Acceptance**: `_validatePassword` function returns error for password < 8 characters
  - **Test**: Type short password, verify inline error shows

- [ ] T039 Show inline error text below inputs in `login_screen.dart`
  - **Goal**: Display validation errors in red text below inputs
  - **Files**: `frontend/lib/features/auth/presentation/screens/login_screen.dart`
  - **Acceptance**: Inline errors appear below inputs (red text)
  - **Test**: Type invalid inputs, verify errors appear inline

- [ ] T040 Disable "Enter" button until inputs valid in `login_screen.dart`
  - **Goal**: Prevent submission with invalid inputs
  - **Files**: `frontend/lib/features/auth/presentation/screens/login_screen.dart`
  - **Acceptance**: "Enter" button is disabled until email and password are valid
  - **Test**: Verify button disabled with invalid inputs, enabled with valid inputs

- [ ] T041 [P] Add validators for all inputs in `frontend/lib/features/auth/presentation/screens/signup_screen.dart`
  - **Goal**: Validate Full Name (not empty), Email (valid format), Password (min 8 chars), Business/Personal ID (not empty), System Currency (selected)
  - **Files**: `frontend/lib/features/auth/presentation/screens/signup_screen.dart`
  - **Acceptance**: All inputs have validation functions that return errors for invalid values
  - **Test**: Leave fields empty or invalid, verify errors show

- [ ] T042 Show inline error text for all inputs in `signup_screen.dart`
  - **Goal**: Display validation errors in red text below each input
  - **Files**: `frontend/lib/features/auth/presentation/screens/signup_screen.dart`
  - **Acceptance**: Inline errors appear below all inputs
  - **Test**: Type invalid inputs, verify errors appear inline

- [ ] T043 Disable "Enter" button until all inputs valid in `signup_screen.dart`
  - **Goal**: Prevent submission with incomplete/invalid inputs
  - **Files**: `frontend/lib/features/auth/presentation/screens/signup_screen.dart`
  - **Acceptance**: "Enter" button is disabled until all inputs are valid
  - **Test**: Verify button disabled with invalid inputs, enabled with all valid inputs

- [ ] T044 [P] Map Supabase error codes to user-friendly messages in `backend/src/auth/auth.service.ts`
  - **Goal**: Wrap Supabase auth calls in try-catch, map error codes to friendly messages
  - **Files**: `backend/src/auth/auth.service.ts`
  - **Acceptance**: Errors thrown with `code` and user-friendly `message` (e.g., "EMAIL_EXISTS", "This email is already registered. Please log in instead.")
  - **Test**: Sign up with existing email, verify friendly message returned

- [ ] T045 Parse error `code` from backend in `frontend/lib/features/auth/data/repositories/auth_repository_impl.dart`
  - **Goal**: Map backend error codes to `Failure` types with friendly messages
  - **Files**: `frontend/lib/features/auth/data/repositories/auth_repository_impl.dart`
  - **Acceptance**: Repository maps error codes to user-friendly messages
  - **Test**: Trigger auth errors, verify friendly messages displayed

---

## Phase 5: Responsive UI (P3 - Low)

**Goal**: Responsive layouts for mobile/tablet/desktop

### Tasks

- [ ] T046 Create `responsive.dart` utility in `frontend/lib/core/utils/responsive.dart`
  - **Goal**: Define breakpoint helpers (isMobile, isTablet, isDesktop)
  - **Files**: `frontend/lib/core/utils/responsive.dart` (new file)
  - **Acceptance**: Class `Responsive` with static methods for breakpoint detection (<600 mobile, 600-1024 tablet, >1024 desktop)
  - **Test**: Verify code compiles, breakpoint detection works

- [ ] T047 Add `_getCrossAxisCount` helper to `frontend/lib/features/home/presentation/screens/home_screen.dart`
  - **Goal**: Determine business card grid columns based on screen size
  - **Files**: `frontend/lib/features/home/presentation/screens/home_screen.dart`
  - **Acceptance**: Helper returns 3 (desktop), 2 (tablet), or 1 (mobile)
  - **Test**: Verify code compiles

- [ ] T048 Update business card list to use GridView in `home_screen.dart`
  - **Goal**: Display business cards in responsive grid layout
  - **Files**: `frontend/lib/features/home/presentation/screens/home_screen.dart`
  - **Acceptance**: `GridView.builder` with `crossAxisCount` from helper, proper spacing
  - **Test**: Resize browser window, verify 1/2/3 cards per row at breakpoints

- [ ] T049 Add `_getKpiCrossAxisCount` helper to `vendor_analytics_screen.dart`
  - **Goal**: Determine KPI card grid columns based on screen size
  - **Files**: `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
  - **Acceptance**: Helper returns 4 (desktop) or 2 (mobile/tablet)
  - **Test**: Verify code compiles

- [ ] T050 Update KPI cards layout to use responsive grid in `vendor_analytics_screen.dart`
  - **Goal**: Display KPI cards in responsive grid (4 on desktop, 2x2 on mobile/tablet)
  - **Files**: `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
  - **Acceptance**: KPI grid uses `crossAxisCount` from helper
  - **Test**: Resize window, verify KPI layout changes (1x4 on desktop, 2x2 on mobile/tablet)

- [ ] T051 [P] Update KPI cards layout in `overall_analytics_screen.dart` for responsiveness
  - **Goal**: Apply same responsive logic to overall analytics screen
  - **Files**: `frontend/lib/features/analytics/presentation/screens/overall_analytics_screen.dart`
  - **Acceptance**: KPI cards use responsive grid
  - **Test**: Resize window, verify layout adapts

- [ ] T052 Update Add/Edit Business dialog width for responsiveness
  - **Goal**: Full-width on mobile, max 500px on tablet/desktop
  - **Files**: Wherever Add/Edit Business dialog is rendered (likely in `home_screen.dart` or a separate dialog widget)
  - **Acceptance**: Dialog width is `double.infinity` on mobile, 500 on tablet/desktop
  - **Test**: Open dialog on mobile/tablet/desktop, verify width behavior

- [ ] T053 Update all other dialogs for responsiveness (Edit Name, Edit Amount, Edit Limit, etc.)
  - **Goal**: Apply responsive width to all dialogs
  - **Files**: All dialog widgets (name edit popup, amount edit popup, limit edit popup, delete confirmations)
  - **Acceptance**: All dialogs are full-width on mobile, max 500px on tablet/desktop
  - **Test**: Open all dialogs on different screen sizes, verify width behavior

---

## Phase 6: Spec Compliance Audit (P4)

**Goal**: Verify implementation matches FLOW_CONTRACT exactly

### Tasks

- [ ] T054 Run flow alignment audit using `specs/002-invoiceme-mvp/checklists/flow-alignment-audit.md`
  - **Goal**: Audit all 11 screens against FLOW_CONTRACT
  - **Files**: `specs/002-invoiceme-mvp/checklists/flow-alignment-audit.md`
  - **Acceptance**: All checklist items reviewed, issues documented
  - **Test**: Manual audit by opening each screen and comparing with FLOW_CONTRACT

- [ ] T055 Create compliance audit results document at `specs/002-invoiceme-mvp/COMPLIANCE_AUDIT.md`
  - **Goal**: Document audit findings with pass/fail for each screen
  - **Files**: `specs/002-invoiceme-mvp/COMPLIANCE_AUDIT.md` (new file)
  - **Acceptance**: Document contains audit results for all screens, lists any drift issues
  - **Test**: Verify document created with full audit results

- [ ] T056 Fix drift issue: [Placeholder - populate during audit]
  - **Goal**: Fix any drift issue found in audit
  - **Files**: TBD (depends on audit findings)
  - **Acceptance**: Drift issue corrected, re-audit passes
  - **Test**: Re-audit after fix

- [ ] T057 Fix drift issue: [Placeholder - populate during audit]
  - **Goal**: Fix any drift issue found in audit
  - **Files**: TBD (depends on audit findings)
  - **Acceptance**: Drift issue corrected, re-audit passes
  - **Test**: Re-audit after fix

- [ ] T058 Final compliance verification and sign-off
  - **Goal**: Verify 100% compliance with FLOW_CONTRACT
  - **Files**: `specs/002-invoiceme-mvp/COMPLIANCE_AUDIT.md`
  - **Acceptance**: All audit items pass (100% compliance), no drift issues remain
  - **Test**: Final review of audit checklist, all items ✅

---

## Task Execution Guide

### How to Use This Task List

1. **Work sequentially** within each phase (P0 → P1 → P2 → P3 → P4)
2. **Parallelize** tasks marked with `[P]` (can be done simultaneously)
3. **Test after each task** using the acceptance criteria
4. **Mark complete** (replace `[ ]` with `[x]`) after testing
5. **Keep app runnable** after each task (commit, test locally)

### Acceptance Criteria Format

Each task includes:
- **Goal**: What the task achieves
- **Files**: Which files to modify
- **Acceptance**: What "done" looks like (specific, testable)
- **Test**: How to verify the task is complete

### Testing Strategy

**After each task**:
1. Verify code compiles (no syntax errors)
2. Verify linter passes (no new warnings)
3. Run app locally, test specific functionality
4. Check console for errors (backend and frontend)

**After each phase**:
1. **Smoke test**: App builds and runs without errors
2. **Regression test**: Existing features still work
3. **Phase-specific test**: New/fixed functionality works as expected

### Known Issues Mapping

| Issue # | Description | Tasks |
|---------|-------------|-------|
| 1 | UI not responsive | T046-T053 |
| 2 | Auth errors not indicative | T037-T045 |
| 3 | Upload fails for PDF/unclear data | T008-T014 |
| 4 | Upload lacks progress indication | T015-T019 |
| 5 | Single business analytics: slow, wrong aggregation, type error, extra invoices tab | T020-T031 |
| 6 | Businesses analytics: slow with type errors | T032-T036 |
| 7 | Verify app aligned with flow contract | T054-T058 |

### Priority Breakdown

| Priority | Task Range | Focus | Total Tasks |
|----------|------------|-------|-------------|
| **Foundation** | T001-T007 | Observability | 7 |
| **P0** | T008-T019 | Upload reliability + progress | 12 |
| **P1** | T020-T036 | Analytics performance + correctness | 17 |
| **P2** | T037-T045 | Auth UX | 9 |
| **P3** | T046-T053 | Responsive UI | 8 |
| **P4** | T054-T058 | Spec compliance audit | 5 |

**Total**: 58 tasks

### Estimated Effort

- **Foundation (T001-T007)**: 1-2 hours
- **P0 (T008-T019)**: 5-8 hours
- **P1 (T020-T036)**: 10-12 hours
- **P2 (T037-T045)**: 5-7 hours
- **P3 (T046-T053)**: 5.5-6.5 hours
- **P4 (T054-T058)**: 5-8 hours

**Total Estimated Effort**: 32-43.5 hours  
**Timeline**: 1-2 weeks (part-time) or 5-6 days (full-time)

---

## Success Criteria (Version 002 Complete)

All tasks completed (58/58 ✅) AND:

- [ ] Upload never hard-fails (always saves with needsReview if needed)
- [ ] Upload shows clear progress stages
- [ ] Single Business Analytics: fast, **NO tabs**, no type errors
- [ ] Businesses Analytics: fast, no type errors
- [ ] Auth: inline validation + friendly errors
- [ ] Responsive UI: works on mobile/tablet/desktop
- [ ] Spec compliance: 100% match with FLOW_CONTRACT

---

## Version Control

| Version | Date | Changes |
|---------|------|---------|
| 002 | 2026-01-20 | Initial task list for stabilization |

---

## PATCH TASKS (Added 2026-01-20)

**Purpose**: Address gaps identified in stabilization task coverage  
**New Tasks**: T059-T074 (16 tasks)  
**Focus**: PDF fallback, LLM robustness, multi-tenant enforcement, export behavior

---

### Phase 0.5: PDF Conversion Reliability (P0 - Critical)

**Goal**: Ensure PDF conversion failures don't crash upload; always attempt OCR fallback

- [ ] T059 Add PDF conversion failure fallback in `backend/src/extraction/ocr/pdf-processor.service.ts`
  - **Goal**: Wrap PDF-to-image conversion in try-catch, return null on failure
  - **Files**: `backend/src/extraction/ocr/pdf-processor.service.ts`
  - **Acceptance**: If PDF conversion fails (corrupt PDF, unsupported format, etc.), return null and log error
  - **Test**: Upload corrupt PDF, verify conversion returns null, no crash

- [ ] T060 Handle null PDF conversion result in `backend/src/extraction/extraction.service.ts`
  - **Goal**: If PDF conversion returns null, set `needsReview=true`, add warning "PDF conversion failed"
  - **Files**: `backend/src/extraction/extraction.service.ts`
  - **Acceptance**: Null PDF conversion triggers `needsReview=true` with warning, upload continues
  - **Test**: Upload corrupt PDF, verify invoice saved with `needsReview=true` and PDF warning

---

### Phase 0.6: OCR Quality Verification (P0 - Critical)

**Goal**: Verify existing OCR improvements are working correctly

- [ ] T061 Verify OCR preprocessing is active in `backend/src/extraction/ocr/ocr.service.ts`
  - **Goal**: Confirm image preprocessing (grayscale, contrast, sharpen, threshold, resize, auto-rotate) is implemented
  - **Files**: `backend/src/extraction/ocr/ocr.service.ts`
  - **Acceptance**: Code inspection confirms preprocessing steps exist and are called before OCR
  - **Test**: Review code, verify preprocessing functions are invoked

- [ ] T062 Verify multi-pass OCR with PSM modes in `ocr.service.ts`
  - **Goal**: Confirm OCR runs with multiple PSM modes (6, 4, 11, 3, 12) and selects best result
  - **Files**: `backend/src/extraction/ocr/ocr.service.ts`
  - **Acceptance**: Code inspection confirms multi-pass OCR loop exists with scoring/selection
  - **Test**: Upload invoice, verify logs show multiple PSM attempts (if OCR_DEBUG=true)

- [ ] T063 Verify OCR scoring selector in `ocr.service.ts`
  - **Goal**: Confirm `scoreOcrText` function exists and evaluates OCR output quality
  - **Files**: `backend/src/extraction/ocr/ocr.service.ts`
  - **Acceptance**: Code inspection confirms scoring based on money keywords, date patterns, text length, special char penalty
  - **Test**: Review code, verify scoring function implementation

---

### Phase 1.5: LLM Prompt Robustness (P0 - Critical)

**Goal**: Improve LLM extraction reliability with chunking and better prompts

- [ ] T064 Implement OCR text chunking in `backend/src/extraction/llm/ollama.service.ts`
  - **Goal**: Chunk long OCR text (>4000 chars) to prevent LLM context overflow
  - **Files**: `backend/src/extraction/llm/ollama.service.ts`
  - **Acceptance**: If OCR text >4000 chars, extract top 1500 + bottom 1500 + keyword lines (total max 4000)
  - **Test**: Upload invoice with long OCR text, verify LLM receives chunked input

- [ ] T065 Add total extraction fallback in `ollama.service.ts`
  - **Goal**: If LLM fails to extract total, search OCR text for regex patterns like `(\d+[\.,]\d{2})` near keywords "total", "סה\"כ"
  - **Files**: `backend/src/extraction/llm/ollama.service.ts`
  - **Acceptance**: New method `extractTotalFallback(ocrText)` returns best guess total or null
  - **Test**: Upload invoice with missing LLM total, verify fallback extraction attempts

- [ ] T066 Improve LLM prompt with explicit total extraction instruction in `ollama.service.ts`
  - **Goal**: Add explicit prompt section: "CRITICAL: Extract the final total amount (after tax, near 'סה\"כ' or 'Total' keywords)"
  - **Files**: `backend/src/extraction/llm/ollama.service.ts`
  - **Acceptance**: Prompt includes explicit total extraction guidance with Hebrew examples
  - **Test**: Review prompt text, verify total extraction instructions are clear

- [ ] T067 Use `extractTotalFallback` in extraction.service.ts if LLM total is null
  - **Goal**: Call fallback total extraction if LLM returns null total
  - **Files**: `backend/src/extraction/extraction.service.ts`
  - **Acceptance**: If `extractedData.totalAmount` is null, call `extractTotalFallback`, use result if found
  - **Test**: Upload invoice with unclear total, verify fallback extraction is attempted

---

### Phase 1.6: Multi-Tenant Enforcement (P1 - High)

**Goal**: Verify all queries are properly scoped by tenantId; prevent cross-tenant data leaks

- [ ] T068 [P] Audit all Prisma queries in `backend/src/vendors/vendors.service.ts` for tenantId scoping
  - **Goal**: Verify every `findMany`, `findUnique`, `update`, `delete` includes `where: { tenantId }`
  - **Files**: `backend/src/vendors/vendors.service.ts`
  - **Acceptance**: Code inspection confirms ALL queries filter by tenantId
  - **Test**: Manual code review, verify tenantId in every query

- [ ] T069 [P] Audit all Prisma queries in `backend/src/invoices/invoices.service.ts` for tenantId scoping
  - **Goal**: Verify every query includes `where: { tenantId }`
  - **Files**: `backend/src/invoices/invoices.service.ts`
  - **Acceptance**: Code inspection confirms ALL queries filter by tenantId
  - **Test**: Manual code review, verify tenantId in every query

- [ ] T070 [P] Audit all Prisma queries in `backend/src/analytics/analytics.service.ts` for tenantId scoping
  - **Goal**: Verify all aggregation queries include `where: { tenantId }`
  - **Files**: `backend/src/analytics/analytics.service.ts`
  - **Acceptance**: Code inspection confirms ALL queries filter by tenantId
  - **Test**: Manual code review, verify tenantId in every query

- [ ] T071 Create basic tenant isolation test in `backend/test/e2e/tenant-isolation.e2e-spec.ts`
  - **Goal**: E2E test verifying user A cannot access user B's vendors/invoices
  - **Files**: `backend/test/e2e/tenant-isolation.e2e-spec.ts`
  - **Acceptance**: Test creates 2 users, each uploads invoice, verifies each can only see their own data
  - **Test**: Run E2E test, verify tenant isolation

---

### Phase 3.5: Export/Share Icon Behavior (P1 - High)

**Goal**: Resolve export icon behavior (implement minimal export OR mark as out-of-scope)

**Decision Required**: Choose ONE approach below

**Option A: Implement Minimal CSV Export (Recommended for MVP)**

- [ ] T072 Implement CSV export for vendor analytics in `backend/src/analytics/analytics.service.ts`
  - **Goal**: Add method `exportVendorAnalyticsCsv(tenantId, vendorId)` returning CSV string
  - **Files**: `backend/src/analytics/analytics.service.ts`
  - **Acceptance**: Method returns CSV with columns: Month, Spent, Invoice Count
  - **Test**: Call method, verify CSV format is correct

- [ ] T073 Add `GET /analytics/vendor/:id/export/csv` endpoint in `analytics.controller.ts`
  - **Goal**: Endpoint returns CSV file with `Content-Type: text/csv` and `Content-Disposition: attachment`
  - **Files**: `backend/src/analytics/analytics.controller.ts`
  - **Acceptance**: Endpoint returns downloadable CSV file
  - **Test**: Call endpoint, verify CSV downloads in browser

- [ ] T074 Wire export icon to CSV download in `vendor_analytics_screen.dart`
  - **Goal**: Share/Export icon triggers CSV download via API call
  - **Files**: `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`
  - **Acceptance**: Clicking icon downloads CSV file with analytics data
  - **Test**: Click export icon, verify CSV downloads

**Option B: Mark Export as Out-of-Scope (Alternative)**

- [ ] T072-ALT Update FLOW_CONTRACT to mark export as deferred in `specs/002-invoiceme-mvp/FLOW_CONTRACT.md`
  - **Goal**: Add note to Single Business Analytics and Businesses Analysis screens: "Share/Export icon is visible but non-functional (deferred to future release)"
  - **Files**: `specs/002-invoiceme-mvp/FLOW_CONTRACT.md`
  - **Acceptance**: FLOW_CONTRACT explicitly states export is out-of-scope for V002
  - **Test**: Document updated

- [ ] T073-ALT Show "Coming Soon" toast when export icon clicked in `vendor_analytics_screen.dart`
  - **Goal**: Export icon click shows SnackBar "Export feature coming soon"
  - **Files**: `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`, `frontend/lib/features/analytics/presentation/screens/overall_analytics_screen.dart`
  - **Acceptance**: Clicking export icon shows "Coming soon" message, no error
  - **Test**: Click export icon, verify toast appears

---

## Updated Task Summary

**Original Tasks**: T001-T058 (58 tasks)  
**Patch Tasks**: T059-T074 (16 tasks)  
**Total Tasks**: 74 tasks

### Updated Priority Breakdown

| Priority | Task Range | Focus | Total Tasks |
|----------|------------|-------|-------------|
| **Foundation** | T001-T007 | Observability | 7 |
| **P0** | T008-T019, T059-T067 | Upload reliability + progress + PDF fallback + LLM robustness | 21 |
| **P1** | T020-T036, T068-T074 | Analytics + multi-tenant + export | 24 |
| **P2** | T037-T045 | Auth UX | 9 |
| **P3** | T046-T053 | Responsive UI | 8 |
| **P4** | T054-T058 | Spec compliance audit | 5 |

**Total**: 74 tasks

### Updated Estimated Effort

- **Foundation (T001-T007)**: 1-2 hours
- **P0 (T008-T019, T059-T067)**: 8-12 hours (was 5-8)
- **P1 (T020-T036, T068-T074)**: 14-17 hours (was 10-12)
- **P2 (T037-T045)**: 5-7 hours
- **P3 (T046-T053)**: 5.5-6.5 hours
- **P4 (T054-T058)**: 5-8 hours

**Total Estimated Effort**: 38.5-52.5 hours (was 32-43.5 hours)  
**Timeline**: 1.5-2.5 weeks (part-time) or 6-8 days (full-time)

---

**END OF TASKS**
