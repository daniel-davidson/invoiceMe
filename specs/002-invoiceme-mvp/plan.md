# Implementation Plan: InvoiceMe Stabilization (Version 002)

**Branch**: `002-invoiceme-mvp` | **Date**: 2026-01-20 | **Spec**: [spec.md](./spec.md)  
**Input**: Stabilization requirements from `/specs/002-invoiceme-mvp/spec.md`

---

## Summary

Version 002 stabilizes the InvoiceMe MVP by fixing 7 critical quality issues without adding new features. The approach prioritizes observability (to measure improvements), upload reliability (to prevent data loss), user feedback (to improve perceived performance), analytics correctness (to build trust), auth UX (to reduce friction), and responsive design (to support all devices). All changes are scoped to be minimal, testable, and token-efficient.

**Key Constraint**: No new features, no large refactors, no breaking changes. Fix what's broken with surgical precision.

---

## Technical Context

**Language/Version**: 
- **Backend**: TypeScript (Node.js 18+), NestJS 10.x
- **Frontend**: Dart (Flutter 3.x)

**Primary Dependencies**:
- **Backend**: Prisma 5.x, Supabase Auth (JWT), Tesseract.js, Sharp (image preprocessing), Ollama client (Mistral model)
- **Frontend**: Riverpod (class notifiers), GoRouter, fl_chart, dio (HTTP client)

**Storage**: 
- PostgreSQL (Supabase hosted) via Prisma ORM
- File uploads stored locally (POC) at `backend/uploads/`

**Testing**: 
- **Backend**: Jest (unit), Supertest (E2E)
- **Frontend**: Flutter test (widget tests)

**Target Platform**: 
- Web responsive (mobile/tablet/desktop browsers)
- Backend runs locally (Node.js server)

**Project Type**: Web application (Flutter web frontend + NestJS backend)

**Performance Goals**:
- Invoice upload processing: <30 seconds (already defined in spec SC-002)
- Analytics load: <2 seconds (FR-S024, FR-S025)
- Auth validation feedback: <200ms (SC-S002)

**Constraints**:
- No database schema changes (backward compatible)
- No API contract breaking changes
- No new external service dependencies
- Must remain runnable locally without cloud services (except Supabase Auth + DB)

**Scale/Scope**:
- Single-user POC (no horizontal scaling)
- Up to 1000 invoices per tenant
- Up to 100 vendors per tenant
- Hebrew + English OCR support (existing)

---

## Constitution Check

*No constitution file found. Proceeding with standard quality gates.*

### Standard Quality Gates

- ✅ **Minimal Dependencies**: Reuse existing stack (NestJS, Flutter, Prisma, Tesseract, Ollama)
- ✅ **No Over-Engineering**: Avoid introducing patterns not needed for stabilization (no new abstractions)
- ✅ **Testability**: All fixes must be testable without complex mocking
- ✅ **Incremental Delivery**: Each fix is independently deployable

**Re-check after Phase 1**: Ensure design artifacts don't introduce complexity violations

---

## Project Structure

### Documentation (this feature)

```text
specs/002-invoiceme-mvp/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions & patterns
├── data-model.md        # Phase 1: Schema updates (if any)
├── quickstart.md        # Phase 1: Local dev setup updates
├── contracts/           # Phase 1: API contract updates
│   ├── upload-progress.yaml    # NEW: Progress tracking endpoints
│   ├── analytics.yaml          # UPDATED: Aggregated DTOs
│   └── auth.yaml               # UPDATED: Error response formats
└── tasks.md             # Phase 2: Breakdown into implementable tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── analytics/              # MODIFY: Aggregation logic
│   ├── auth/                   # MODIFY: Error mapping
│   ├── extraction/             # MODIFY: OCR robustness, fallback handling
│   │   ├── ocr/                # ENHANCE: Preprocessing, multi-PSM, scoring (already implemented)
│   │   └── llm/                # ENHANCE: Fallback logic for missing fields
│   ├── invoices/               # MODIFY: needsReview handling, progress tracking
│   ├── common/                 # ADD: Timing middleware, logger utils
│   └── vendors/                # MODIFY: Remove duplicate invoice endpoints (if any)
└── tests/
    ├── e2e/                    # ADD: Upload reliability tests
    └── unit/                   # ADD: OCR scoring tests, analytics aggregation tests

frontend/
├── lib/
│   ├── core/
│   │   ├── theme/              # ADD: Responsive breakpoints helper
│   │   └── utils/              # ADD: Timing logger, validators
│   ├── features/
│   │   ├── auth/               # MODIFY: Inline validation, error mapping
│   │   ├── home/               # MODIFY: Responsive layout, progress UI
│   │   ├── invoices/           # MODIFY: Responsive list/detail
│   │   ├── vendors/            # MODIFY: Remove invoices tab from analytics
│   │   └── analytics/          # MODIFY: Type-safe parsing, responsive charts
│   └── shared/                 # ADD: Responsive widgets (breakpoint-aware)
└── tests/
    └── widget/                 # ADD: Responsive layout tests
```

**Structure Decision**: Reuse existing web application structure (backend/ + frontend/). No new modules or layers. Modifications are scoped to existing feature directories with observability utilities added to `common/` (backend) and `core/utils/` (frontend).

---

## Complexity Tracking

No constitutional violations. All changes fit within existing architecture.

---

## Phase 0: Research & Patterns

**Objective**: Resolve technology choices and establish patterns for the 6 improvement areas.

### Research Tasks

1. **Observability Patterns**
   - Research: NestJS interceptors for timing logs vs. manual instrumentation
   - Research: Flutter timing best practices (PerformanceOverlay, custom logs)
   - Decision: Choose lightweight approach (manual logs with structured format)

2. **Upload Reliability Patterns**
   - Research: Graceful degradation strategies for OCR + LLM pipelines
   - Research: Confidence scoring algorithms (already partially implemented)
   - Decision: Multi-tier fallback (high confidence → auto-save, medium → needsReview, low → manual prompt)

3. **Progress Tracking Patterns**
   - Research: Real-time progress (WebSocket/SSE) vs. polling vs. stage-only updates
   - Decision: Stage-only updates (minimal complexity, sufficient for <30s uploads)

4. **Analytics Aggregation Patterns**
   - Research: Backend aggregation (Prisma raw queries) vs. frontend summation
   - Decision: Backend aggregation with DTO caching (prevent re-computation)

5. **Responsive Design Patterns**
   - Research: Flutter MediaQuery vs. LayoutBuilder for breakpoints
   - Decision: MediaQuery + breakpoint helper (consistent across app)

6. **Type Safety Patterns**
   - Research: Defensive parsing vs. strict schema validation
   - Decision: Defensive parsing with fallback defaults (prevent crashes)

### Output: `research.md`

Document each decision with:
- Problem statement
- Alternatives considered
- Chosen approach + rationale
- Implementation notes

---

## Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete

### 1. Data Model Updates

**File**: `data-model.md`

No schema changes required. Document existing entities with stabilization notes:

- **Invoice**: Confirm `needsReview` (boolean), `warnings` (string[]) fields exist
- **ExtractionRun**: Confirm `confidence` (float), `ocrText` (string), `llmResponse` (jsonb) fields exist
- **Vendor**: No changes
- **User**: No changes

**Validation**: All required fields for stabilization already exist in Prisma schema.

### 2. API Contract Updates

**Directory**: `contracts/`

#### `upload-progress.yaml` (NEW - if needed for real-time progress)

```yaml
# DEFERRED: Stage-only updates don't require new endpoints
# Progress is tracked on backend and returned in final response
```

#### `analytics.yaml` (UPDATED)

```yaml
# Update response DTOs to include pre-aggregated values
GET /analytics/vendor/:id
  Response:
    kpis:
      currentMonthSpend: number      # Backend computed
      monthlyAverage: number          # Backend computed
      yearlyAverage: number           # Backend computed
    lineChart:
      labels: string[]
      datasets:
        - label: string
          data: number[]              # Backend computed (not string[])

GET /analytics/overall
  Response:
    kpis:
      totalSpend: number              # Backend computed
      remainingBalance: number        # Backend computed
    pieChart:
      segments:
        - label: string
          value: number                # Backend computed (not string)
          percentage: number           # Backend computed
```

#### `auth.yaml` (UPDATED)

```yaml
# Update error response format
POST /auth/signup
  ErrorResponses:
    400:
      code: "VALIDATION_ERROR"
      message: "Please enter a valid email address"  # Specific messages
    409:
      code: "EMAIL_EXISTS"
      message: "An account with this email already exists"

POST /auth/login
  ErrorResponses:
    401:
      code: "INVALID_CREDENTIALS"
      message: "Invalid email or password"
```

#### `invoices.yaml` (UPDATED)

```yaml
# Update upload response to include processing stages
POST /invoices/upload
  Response:
    invoice: InvoiceDTO
    processingStages:                # NEW field
      - stage: "upload" | "ocr" | "extraction" | "save"
        status: "complete" | "error"
        duration: number              # milliseconds
    needsReview: boolean
    warnings: string[]                # Specific warnings
```

### 3. Quickstart Updates

**File**: `quickstart.md`

Update local dev setup to include:
- How to enable debug logging (`OCR_DEBUG=true`)
- How to test responsive breakpoints (browser DevTools)
- How to simulate slow uploads (network throttling)

### 4. Agent Context Update

Run agent context script to document new patterns:

```bash
.specify/scripts/bash/update-agent-context.sh cursor-agent
```

---

## Phase 2: Implementation Plan (Numbered Steps)

### Step 1: Add Observability (Timing Logs)

**Scope**: Backend + Frontend timing instrumentation

**Backend**:
- Add timing middleware to `backend/src/common/interceptors/timing.interceptor.ts`
- Log: `invoices.upload` endpoint → PDF conversion → OCR → LLM → DB save
- Log: `analytics/*` endpoints → query time
- Format: `[TIMING] <operation> <duration>ms`

**Frontend**:
- Add timing util to `frontend/lib/core/utils/timing_logger.dart`
- Log: Upload start → request sent → response received → render complete
- Log: Analytics screen mount → data fetch → chart render
- Format: `[TIMING] <operation> <duration>ms`

**Acceptance Criteria**:
- ✅ All upload pipeline stages logged with millisecond precision
- ✅ All analytics queries logged
- ✅ Logs are structured and easily parseable (JSON format)
- ✅ Logs can be disabled via env var (`ENABLE_TIMING_LOGS=false`)

**Test Notes**:
- Upload invoice → check backend logs for 4 stages (PDF, OCR, LLM, DB)
- View analytics → check backend log for query time
- Check frontend console for timing logs (upload, analytics)

**Maps to Requirements**: Observability prerequisite for all other fixes

---

### Step 2: Improve OCR Robustness

**Scope**: Enhance OCR preprocessing, multi-PSM, and scoring (already partially implemented)

**Backend** (`backend/src/extraction/ocr/ocr.service.ts`):
- ✅ Image preprocessing already implemented (grayscale, contrast, threshold, sharpen, resize)
- ✅ Multi-PSM OCR already implemented (PSM 6, 4, 11, 3, 12)
- ✅ Scoring selector already implemented (money keywords, patterns, text length)
- **ENHANCE**: Add relevantText selection (top 20 lines + bottom 20 lines + keyword lines) after choosing best OCR

**Acceptance Criteria**:
- ✅ OCR attempts multiple PSM modes and selects best score
- ✅ Relevant text selection reduces LLM input size by 50%+
- ✅ OCR debug logs show: scores, chosen PSM, text preview (if `OCR_DEBUG=true`)
- ✅ Low-quality invoices still produce usable text (even if partial)

**Test Notes**:
- Upload low-quality invoice → verify OCR doesn't fail completely
- Check logs for multi-PSM scores and chosen mode
- Verify LLM receives top/bottom/keyword lines (not entire OCR dump)

**Maps to Requirements**: FR-S012 (low confidence handling), User Story 3 (robust upload)

---

### Step 3: Add LLM Extraction Fallback

**Scope**: Handle missing required fields gracefully

**Backend** (`backend/src/extraction/extraction.service.ts`):
- After LLM extraction, validate required fields: `vendorName`, `totalAmount`, `currency`, `invoiceDate`
- If any missing OR confidence <0.7:
  - Set `needsReview = true`
  - Add warnings: `["Missing vendor name", "Low confidence extraction"]`
  - Use fallback defaults: `totalAmount=0`, `currency=systemCurrency`, `invoiceDate=today`
  - **Still save invoice** (don't fail)
- Store raw OCR text + LLM response in `extractionRuns` table

**Acceptance Criteria**:
- ✅ Invoices with missing fields are saved (not rejected)
- ✅ `needsReview` flag is set when confidence <0.7 or fields missing
- ✅ Warnings array contains specific issues (not generic "extraction failed")
- ✅ Raw OCR text and LLM response are persisted for manual review

**Test Notes**:
- Upload invoice with unclear vendor → verify saved with needsReview=true
- Upload invoice with missing amount → verify saved with default amount + warning
- Check database: `extractionRuns` table contains raw data

**Maps to Requirements**: FR-S013, FR-S014, FR-S015 (robust upload), User Story 3

---

### Step 4: Implement Upload Progress UI

**Scope**: Frontend progress indicator with 4 stages

**Frontend** (`frontend/lib/features/home/presentation/providers/home_provider.dart`):
- Add `UploadProgress` model: `stage`, `progress`, `message`
- Update `uploadInvoice` to emit progress states:
  1. `{stage: "upload", progress: 0-100, message: "Uploading..."}`
  2. `{stage: "ocr", progress: null, message: "Reading invoice (OCR)..."}`
  3. `{stage: "extraction", progress: null, message: "Extracting data..."}`
  4. `{stage: "save", progress: null, message: "Saving..."}`
- **Note**: Backend doesn't stream progress; stages are client-side simulation based on typical timing

**Frontend** (`frontend/lib/features/home/presentation/screens/home_screen.dart`):
- Update upload dialog to show:
  - Linear progress bar (stage 1: upload)
  - Circular spinner + stage message (stages 2-4)
  - Success/error snackbar on completion

**Acceptance Criteria**:
- ✅ User sees 4 distinct progress stages during upload
- ✅ Upload stage shows percentage bar (0-100%)
- ✅ OCR/Extraction/Save stages show spinner + message
- ✅ Success snackbar shows extracted vendor name
- ✅ Error snackbar shows specific error (not generic)

**Test Notes**:
- Upload invoice → observe 4 progress transitions
- Simulate network delay → verify progress bar updates smoothly
- Upload failing invoice → verify error message is specific

**Maps to Requirements**: FR-S017 to FR-S021, User Story 4 (transparent progress)

---

### Step 5: Fix Analytics Aggregation (Backend)

**Scope**: Move aggregation to backend, return typed DTOs

**Backend** (`backend/src/analytics/analytics.service.ts`):
- Vendor analytics (`getVendorAnalytics`):
  - Compute: `currentMonthSpend`, `monthlyAverage`, `yearlyAverage` using Prisma aggregate queries
  - Compute: line chart data (spend by month) as `number[]`
  - Return: Structured DTO with pre-computed values
- Overall analytics (`getOverallAnalytics`):
  - Compute: `totalSpend`, `totalLimits`, `remainingBalance`
  - Compute: pie chart segments (top 5 vendors) with `value: number`, `percentage: number`
  - Return: Structured DTO with pre-computed values

**Backend** (`backend/src/analytics/dto/analytics-response.dto.ts`):
- Ensure all numeric fields are typed as `number` (not `string`)
- Use `Number(decimal)` to convert Prisma Decimal to number

**Acceptance Criteria**:
- ✅ All KPIs computed on backend (no client-side summation)
- ✅ All chart data returned as `number[]` (not `string[]`)
- ✅ API responses validated: no string values for numeric fields
- ✅ Analytics queries complete in <2 seconds for 100 invoices

**Test Notes**:
- Call `/analytics/vendor/:id` → verify response contains pre-computed numbers
- Call `/analytics/overall` → verify pie chart percentages are computed
- Inspect response JSON: confirm no quoted numbers (`"120"` vs `120`)

**Maps to Requirements**: FR-S022 to FR-S025, User Story 5 (fast analytics)

---

### Step 6: Fix Analytics Type Parsing (Frontend)

**Scope**: Defensive parsing with fallback defaults

**Frontend** (all analytics providers):
- Update `vendor_analytics_provider.dart`, `overall_analytics_provider.dart`, `invoices_provider.dart`
- Replace `(json['field'] as num).toDouble()` with `_parseDouble(json['field'])`
- Implement `_parseDouble(dynamic value)`:
  ```dart
  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }
  ```
- Apply to ALL numeric fields: amounts, KPIs, chart data

**Acceptance Criteria**:
- ✅ Zero type errors in frontend console (vendor analytics, overall analytics, invoices)
- ✅ App handles both numeric and string responses gracefully (defensive)
- ✅ Charts render without crashing on type mismatches

**Test Notes**:
- Open vendor analytics → check console for type errors (should be zero)
- Open overall analytics → verify pie chart renders correctly
- Open invoices list → verify amounts display correctly

**Maps to Requirements**: FR-S026, User Story 5 (no type errors)

---

### Step 7: Remove Vendor Analytics Invoices Tab

**Scope**: Remove duplicate invoices list from vendor analytics

**Frontend** (`frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`):
- Remove `TabController` and `TabBar` widgets
- Remove `_buildInvoicesTab` method
- Keep only `_buildAnalyticsTab` content (KPIs, charts, limit editor, export)
- Update screen to be single-view (no tabs)

**Acceptance Criteria**:
- ✅ Vendor analytics screen shows NO tab navigation
- ✅ Only KPIs, charts, and export button are visible
- ✅ Users access vendor invoices via Home screen expandable cards
- ✅ "View All Invoices" from vendor card navigates to main Invoices list (not analytics)

**Test Notes**:
- Open vendor analytics → verify no tabs present
- Navigate from Home vendor card → verify expandable invoices work
- Tap "View All" from vendor card → verify navigates to Invoices list

**Maps to Requirements**: FR-S027, FR-S028, User Story 6 (streamlined analytics)

---

### Step 8: Add Auth Inline Validation (Frontend)

**Scope**: Client-side validation with clear error messages

**Frontend** (`frontend/lib/features/auth/presentation/screens/login_screen.dart`, `signup_screen.dart`):
- Add email validator: RegExp for valid email format
- Add password validator: Minimum 8 characters
- Add real-time validation on `onChanged` callback
- Display inline error text below input field (red color)
- Disable submit button when validation errors exist
- Auto-focus first invalid field on submit attempt

**Acceptance Criteria**:
- ✅ Invalid email shows error immediately on blur
- ✅ Weak password shows error immediately on blur
- ✅ Submit button disabled while errors exist
- ✅ Error messages are specific (not generic "invalid input")
- ✅ First invalid field receives focus when submit attempted

**Test Notes**:
- Enter invalid email → verify inline error appears
- Enter 5-char password → verify "minimum 8 characters" error appears
- Try submitting with errors → verify button is disabled
- Fix errors → verify button becomes enabled

**Maps to Requirements**: FR-S007 to FR-S011, User Story 2 (clear auth feedback)

---

### Step 9: Map Auth Backend Errors (Frontend + Backend)

**Scope**: User-friendly error messages for Supabase Auth errors

**Backend** (`backend/src/auth/auth.service.ts`):
- Catch Supabase errors and throw NestJS exceptions with specific codes:
  - `EMAIL_EXISTS` (409 Conflict)
  - `INVALID_CREDENTIALS` (401 Unauthorized)
  - `WEAK_PASSWORD` (400 Bad Request)
  - `INVALID_EMAIL` (400 Bad Request)

**Frontend** (`frontend/lib/features/auth/data/repositories/auth_repository_impl.dart`):
- Map HTTP status codes to user messages:
  - 409 → "An account with this email already exists"
  - 401 → "Invalid email or password"
  - 400 (weak password) → "Password must be at least 8 characters"
  - 400 (invalid email) → "Please enter a valid email address"

**Acceptance Criteria**:
- ✅ Registration with existing email shows: "An account with this email already exists"
- ✅ Login with wrong password shows: "Invalid email or password"
- ✅ No error messages reveal whether email exists (security)
- ✅ All errors are actionable (user knows what to fix)

**Test Notes**:
- Register with existing email → verify specific error message
- Login with wrong password → verify specific error message
- Submit weak password → verify inline validation (frontend) or backend error

**Maps to Requirements**: FR-S009, FR-S010, User Story 2

---

### Step 10: Implement Responsive Breakpoints

**Scope**: Mobile/tablet/desktop layouts

**Frontend** (`frontend/lib/core/theme/breakpoints.dart` - NEW):
- Define breakpoint helper:
  ```dart
  enum ScreenSize { mobile, tablet, desktop }
  
  class Breakpoints {
    static const double mobile = 640;
    static const double tablet = 1024;
    
    static ScreenSize getScreenSize(BuildContext context) {
      final width = MediaQuery.of(context).size.width;
      if (width <= mobile) return ScreenSize.mobile;
      if (width <= tablet) return ScreenSize.tablet;
      return ScreenSize.desktop;
    }
  }
  ```

**Frontend** (apply to all screens):
- Home screen: Single-column (mobile), 2-column (tablet), 3-column (desktop) for vendor cards
- Analytics screens: Stack charts vertically (mobile), 2-column grid (tablet/desktop)
- Forms (login/signup): Full-width (mobile), centered 400px (tablet/desktop)
- Dialogs: Full-screen (mobile), modal 600px (tablet/desktop)

**Acceptance Criteria**:
- ✅ App displays correctly on 375px (mobile), 768px (tablet), 1440px (desktop) viewports
- ✅ No horizontal scrolling on any screen size
- ✅ Touch targets are ≥44x44px on mobile
- ✅ Charts and tables are readable on all screen sizes

**Test Notes**:
- Test on Chrome DevTools: iPhone SE (375px), iPad (768px), Desktop (1440px)
- Verify no horizontal scroll bars appear
- Verify vendor cards stack (mobile), 2-column (tablet), 3-column (desktop)

**Maps to Requirements**: FR-S001 to FR-S006, User Story 1 (responsive UI)

---

## Phase 2: Task Breakdown

*Output of `/speckit.tasks` command - not created by this plan*

Tasks will be generated from the 10 implementation steps above. Each step maps to 1-3 tasks:
- Step 1 → Task: Add backend timing logs, Task: Add frontend timing logs
- Step 2 → Task: Enhance OCR relevant text selection
- Step 3 → Task: Add LLM fallback logic
- Step 4 → Task: Implement progress UI
- Step 5 → Task: Backend analytics aggregation
- Step 6 → Task: Frontend defensive parsing
- Step 7 → Task: Remove vendor invoices tab
- Step 8 → Task: Auth inline validation
- Step 9 → Task: Auth error mapping
- Step 10 → Task: Responsive breakpoints (mobile), Task: Responsive breakpoints (tablet/desktop)

---

## Validation & Acceptance

### Compliance Checklist (from spec.md)

Before marking Version 002 complete:

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

### Success Criteria Validation (from spec.md)

- [ ] **SC-S001**: App displays correctly on 375px, 768px, 1440px without horizontal scroll
- [ ] **SC-S002**: Login/signup forms reject invalid inputs with inline errors in <200ms
- [ ] **SC-S003**: Invoice upload completes without hard failure in 100% of cases
- [ ] **SC-S004**: Upload progress transitions through all 4 stages
- [ ] **SC-S005**: Vendor analytics loads in <2s with no type errors
- [ ] **SC-S006**: Overall analytics loads in <2s with no type errors
- [ ] **SC-S007**: Vendor analytics has zero tab navigation
- [ ] **SC-S008**: All Version 001 acceptance scenarios pass
- [ ] **SC-S009**: Frontend type parsing errors = 0
- [ ] **SC-S010**: Backend aggregations return correct sums

---

## Dependencies & Risks

### Dependencies
- No new external dependencies required
- Reuses existing stack (NestJS, Flutter, Prisma, Tesseract, Ollama, Supabase)

### Risks

| Risk | Mitigation |
|------|-----------|
| OCR improvements don't increase accuracy | Already implemented; just enhancing text selection |
| Progress UI adds complexity | Using client-side stage simulation (no backend changes) |
| Analytics aggregation breaks existing code | Additive changes; old endpoints remain functional |
| Responsive changes cause layout bugs | Test on 3 viewport sizes before commit |

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Run** `/speckit.tasks` to generate task breakdown
3. **Implement** in priority order: P0 (Steps 1-3, 8-10) → P1 (Steps 4-7)
4. **Validate** against compliance checklist before release

**Estimated Effort**: 10 steps × ~2-4 hours each = 20-40 hours total
