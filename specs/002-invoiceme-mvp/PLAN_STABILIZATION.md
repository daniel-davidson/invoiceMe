# Stabilization Plan: InvoiceMe (Version 002)

**Purpose**: Ordered implementation plan for Version 002 stabilization  
**Created**: 2026-01-20  
**Based On**: FLOW_CONTRACT.md, ROUTES_MAP.md, UI_STATES.md  
**Status**: Implementation Plan

---

## Document Purpose

This plan translates FLOW_CONTRACT, ROUTES_MAP, and UI_STATES into a prioritized, ordered set of implementation phases focused on:
1. Fixing known issues from Version 001
2. Aligning implementation with FLOW_CONTRACT
3. Improving performance and reliability
4. Minimizing refactoring (small, scoped changes only)

**Approach**: Fix issues incrementally, keep the app runnable, test continuously.

---

## Existing Tech Stack (No Changes)

**Frontend**:
- Flutter 3.x
- Riverpod (class-based notifiers for state management)
- GoRouter (declarative routing)
- Clean Architecture (presentation → domain → data)
- Packages: `file_picker`, `image_picker`, `fl_chart`, `currency_picker`, `shared_preferences`, `http`, `dartz`, `freezed`

**Backend**:
- NestJS (TypeScript)
- Prisma ORM
- PostgreSQL (hosted on Supabase)
- Supabase Auth (JWT verification)
- Tesseract OCR (`tesseract.js`, `heb+eng` languages)
- Ollama LLM (Mistral model for extraction)
- Frankfurter API (currency conversion with caching)
- `sharp` (image preprocessing for OCR)

**Infrastructure**:
- Database: Supabase PostgreSQL
- Auth: Supabase Auth (JWT signing keys)
- Storage: Local filesystem (POC), object storage for production
- Deployment: TBD (local dev for now)

---

## Known Issues from Version 001 (Must Fix)

### P0: Critical (Upload Reliability & Progress)

1. **Upload invoice fails sometimes for PDF or unclear data**
   - Current behavior: Hard fails, user sees generic error
   - Expected: Save invoice with `needsReview=true` if extraction uncertain

2. **Upload invoice takes too long and progress is unclear**
   - Current behavior: Single "Uploading..." message, no stage visibility
   - Expected: Clear progress stages (Uploading → OCR → Extracting → Saving)

### P1: High (Analytics Correctness & Performance)

3. **Single business analytics: slow load, aggregation incorrect, type error, extra invoices tab exists**
   - Current behavior:
     - Data loads slowly (no backend aggregation)
     - Type parsing errors (String vs num)
     - Has "Invoices" tab (FORBIDDEN per FLOW_CONTRACT)
   - Expected:
     - Fast load with backend-aggregated data
     - No type errors
     - NO tabs (only analytics content)

4. **Businesses analytics: slow load with type errors**
   - Current behavior: Slow, type parsing errors
   - Expected: Fast, no type errors

### P2: Medium (Auth UX)

5. **Login/signup errors are not indicative enough; user lacks clear validation guidance**
   - Current behavior: Generic error messages, no inline validation
   - Expected: User-friendly error messages, inline validation

### P3: Low (Responsive UI)

6. **UI is not responsive for web/tablet/mobile (breakpoints needed)**
   - Current behavior: Fixed layouts, poor tablet/web experience
   - Expected: Responsive layouts with breakpoints (<600 mobile, 600–1024 tablet, >1024 desktop)

### P4: Spec Compliance

7. **Implementation may not follow original flow exactly; must audit and fix drift**
   - Current behavior: Unknown drift from FLOW_CONTRACT
   - Expected: Perfect alignment with FLOW_CONTRACT (screens, navigation, forbidden features)

---

## Stabilization Phases

### Phase 0: Observability & Baseline Metrics

**Goal**: Add logging to identify bottlenecks and measure improvements.

**Tasks**:

1. **Backend timing logs**:
   - Log execution time for: PDF→image conversion, OCR, LLM extraction, DB save, analytics query time
   - Format: `[InvoicesService] OCR processing took 3.2s`
   - Use NestJS built-in logger

2. **Frontend timing logs**:
   - Log timing for: upload start, request sent, response received, render complete
   - Format: `[HomeProvider] Upload took 8.5s total`
   - Use `logger` package

3. **Set baseline metrics**:
   - Run 3 sample uploads (Hebrew invoice, English invoice, PDF with selectable text)
   - Record: Total time, OCR time, extraction time, DB save time
   - Document in `specs/002-invoiceme-mvp/BASELINE_METRICS.md`

**Deliverables**:
- Timing logs in backend (all services)
- Timing logs in frontend (all providers)
- `BASELINE_METRICS.md` with sample results

**Testing**:
- Run app locally, upload 3 invoices, verify logs appear in console
- Verify no performance degradation from logging

**Effort**: 1-2 hours  
**Risk**: Low

---

### Phase 1: Upload Reliability (P0)

**Goal**: Ensure uploads never hard-fail; always save invoice (with `needsReview` if needed).

#### Task 1.1: Improve OCR Robustness (Already Done in Version 001)

**Status**: ✅ Already implemented:
- Image preprocessing (grayscale, contrast, threshold, sharpen, resize, auto-rotate)
- Multi-pass OCR with PSM modes (6, 4, 11, 3, 12)
- Scoring selector (money keywords, date patterns, text length)
- Debug logging (controlled by `OCR_DEBUG` env var)

**Action**: Verify implementation, no changes needed.

#### Task 1.2: LLM Extraction Fallback

**Current**: If LLM fails to extract `vendorName`, entire upload fails.

**Change**:
1. Modify `backend/src/extraction/extraction.service.ts`:
   - Wrap LLM extraction in try-catch
   - If LLM returns invalid JSON or missing required fields:
     - Set `needsReview = true`
     - Add warning: "LLM extraction failed or incomplete"
     - Use fallback values:
       - `vendorName`: "Unknown Vendor"
       - `totalAmount`: null (if not extractable)
       - `invoiceDate`: `new Date()` (current date)
   - Save invoice with warnings

2. Update `backend/src/extraction/llm/extraction-schema.ts`:
   - Make `vendorName`, `totalAmount`, `currency` nullable for fallback

3. Modify `backend/src/invoices/invoices.service.ts`:
   - Allow invoice creation with `needsReview=true` and null amounts
   - If `vendorName` is "Unknown Vendor", do NOT auto-create business (user must assign manually)

**Acceptance Criteria**:
- Upload succeeds even if LLM extraction fails
- Invoice saved with `needsReview=true` and warnings
- User sees success message: "Invoice uploaded but needs review."

**Testing**:
- Upload invoice with very poor OCR (unreadable)
- Verify invoice saves with `needsReview=true`
- Verify user sees "needs review" message

**Effort**: 2-3 hours  
**Risk**: Low

#### Task 1.3: OCR Failure Fallback

**Current**: If OCR fails entirely, upload fails.

**Change**:
1. Modify `backend/src/extraction/ocr/ocr.service.ts`:
   - Wrap Tesseract calls in try-catch
   - If OCR fails entirely:
     - Return empty string as OCR text
     - Log error

2. Modify `backend/src/extraction/extraction.service.ts`:
   - If OCR text is empty:
     - Set `needsReview = true`
     - Add warning: "OCR failed to extract text"
     - Pass empty text to LLM (will also fail, triggering LLM fallback)

**Acceptance Criteria**:
- Upload succeeds even if OCR fails
- Invoice saved with `needsReview=true` and warnings
- User sees success message: "Invoice uploaded but needs review."

**Testing**:
- Upload completely blank image
- Verify invoice saves with `needsReview=true`
- Verify user sees "needs review" message

**Effort**: 1-2 hours  
**Risk**: Low

**Phase 1 Total Effort**: 3-5 hours

---

### Phase 2: Upload Progress UX (P0)

**Goal**: Show clear, stage-based progress during upload.

#### Task 2.1: Backend Progress Events (Optional - Skip for MVP)

**Decision**: Skip server-side progress events for now (requires WebSocket or SSE, out of scope).

**Alternative**: Frontend simulates stages based on timing.

#### Task 2.2: Frontend Upload Stages

**Current**: Single "Uploading..." message with spinner.

**Change**:
1. Modify `frontend/lib/features/home/presentation/providers/home_provider.dart`:
   - Add new state: `uploadStage` (enum: `idle`, `uploading`, `ocr`, `extracting`, `saving`, `complete`, `error`)
   - Update `_uploadFileFromPath` and `_uploadFileFromBytes`:
     ```dart
     // Stage 1: Uploading
     state = state.copyWith(uploadStage: UploadStage.uploading);
     await Future.delayed(Duration(milliseconds: 500)); // Allow UI to update
     
     // Stage 2: Simulate OCR (backend doesn't send progress, so estimate)
     state = state.copyWith(uploadStage: UploadStage.ocr);
     
     // Stage 3: Simulate LLM extraction
     state = state.copyWith(uploadStage: UploadStage.extracting);
     
     // Make API call
     final response = await apiClient.uploadFile(...);
     
     // Stage 4: Saving
     state = state.copyWith(uploadStage: UploadStage.saving);
     await Future.delayed(Duration(milliseconds: 300));
     
     // Stage 5: Complete
     state = state.copyWith(uploadStage: UploadStage.complete);
     ```

2. Modify `frontend/lib/features/home/presentation/screens/home_screen.dart`:
   - Update overlay to show current stage:
     ```dart
     if (uploadState.isUploading) ...[
       Positioned.fill(
         child: Container(
           color: Colors.black54,
           child: Center(
             child: Column(
               mainAxisSize: MainAxisSize.min,
               children: [
                 CircularProgressIndicator(),
                 SizedBox(height: 16),
                 Text(
                   _getUploadStageText(uploadState.uploadStage),
                   style: TextStyle(color: Colors.white, fontSize: 16),
                 ),
               ],
             ),
           ),
         ),
       ),
     ],
     
     String _getUploadStageText(UploadStage stage) {
       switch (stage) {
         case UploadStage.uploading: return 'Uploading file...';
         case UploadStage.ocr: return 'Processing OCR...';
         case UploadStage.extracting: return 'Extracting data...';
         case UploadStage.saving: return 'Saving invoice...';
         default: return 'Processing...';
       }
     }
     ```

**Acceptance Criteria**:
- User sees 4 distinct stage messages during upload:
  1. "Uploading file..."
  2. "Processing OCR..."
  3. "Extracting data..."
  4. "Saving invoice..."
- Each stage shows for at least 0.5 seconds (visible feedback)
- Overlay dismisses on complete or error

**Testing**:
- Upload invoice
- Verify all 4 stages appear in sequence
- Verify timing feels natural (not too fast)

**Effort**: 2-3 hours  
**Risk**: Low

**Phase 2 Total Effort**: 2-3 hours

---

### Phase 3: Analytics Performance & Correctness (P1)

**Goal**: Fast analytics with backend aggregation, no type errors, no forbidden tabs.

#### Task 3.1: Remove Invoices Tab from Single Business Analytics (CRITICAL)

**Current**: `/vendor/:id/analytics` has "Analytics" and "Invoices" tabs (FORBIDDEN).

**Change**:
1. Modify `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`:
   - Remove `TabController`, `TabBar`, `TabBarView`
   - Remove `_buildInvoicesTab` method
   - Remove all invoice-related state/logic
   - Show only analytics content: KPIs + Charts

2. Update `frontend/lib/features/vendors/presentation/providers/vendor_analytics_provider.dart`:
   - Remove any invoice-fetching logic (if exists)
   - Keep only analytics data fetching

**Acceptance Criteria**:
- `/vendor/:id/analytics` shows ONLY: KPIs (4 cards) + Pie chart + Line chart
- NO tabs visible
- NO invoices list
- Matches FLOW_CONTRACT exactly

**Testing**:
- Navigate to Single Business Analytics
- Verify NO tabs exist
- Verify only KPIs and charts visible

**Effort**: 1 hour  
**Risk**: Low

#### Task 3.2: Backend Analytics Aggregation

**Current**: Frontend receives raw invoice data and computes aggregations (slow, type errors).

**Change**:
1. Modify `backend/src/analytics/analytics.service.ts`:
   - Implement `getVendorAnalytics(tenantId, vendorId)`:
     ```typescript
     // Use Prisma aggregations
     const monthlySpent = await prisma.invoice.aggregate({
       where: { tenantId, vendorId, invoiceDate: { gte: startOfMonth } },
       _sum: { normalizedAmount: true },
     });
     
     const monthlyAvg = await prisma.invoice.aggregate({
       where: { tenantId, vendorId, invoiceDate: { gte: startOfYear } },
       _avg: { normalizedAmount: true },
     });
     
     const yearlyAvg = await prisma.invoice.aggregate({
       where: { tenantId, vendorId, invoiceDate: { gte: oneYearAgo } },
       _avg: { normalizedAmount: true },
     });
     
     // Line chart: monthly spending for last 12 months
     const lineChartData = await prisma.$queryRaw`
       SELECT 
         DATE_TRUNC('month', "invoiceDate") as month,
         SUM("normalizedAmount") as total
       FROM "Invoice"
       WHERE "tenantId" = ${tenantId} AND "vendorId" = ${vendorId}
       GROUP BY month
       ORDER BY month DESC
       LIMIT 12
     `;
     
     // Pie chart: top 5 items (current month)
     // Parse lineItems from llmResponse, aggregate by description
     // Return top 5
     
     return {
       monthlySpent: monthlySpent._sum.normalizedAmount ?? 0,
       monthlyLimit: vendor.monthlyLimit,
       monthlyAvg: monthlyAvg._avg.normalizedAmount ?? 0,
       yearlyAvg: yearlyAvg._avg.normalizedAmount ?? 0,
       lineChart: { /* formatted data */ },
       pieChart: { /* top 5 items */ },
     };
     ```

2. Update `backend/src/analytics/dto/analytics-response.dto.ts`:
   - Define strict types for response (all numbers, not strings)

3. Modify `backend/src/analytics/analytics.controller.ts`:
   - Update `GET /analytics/vendors/:id` to return aggregated DTO

**Acceptance Criteria**:
- Backend returns fully aggregated data (no raw invoices)
- Response types are correct (numbers, not strings)
- Single DB query (or minimal queries) for fast response

**Testing**:
- Call `GET /analytics/vendors/:id`
- Verify response contains: `monthlySpent`, `monthlyLimit`, `monthlyAvg`, `yearlyAvg`, `lineChart`, `pieChart`
- Verify all numeric fields are numbers (not strings)
- Verify response time < 2 seconds

**Effort**: 4-5 hours  
**Risk**: Medium (SQL query complexity)

#### Task 3.3: Frontend Analytics Rendering (Fix Type Errors)

**Current**: Frontend expects raw data, does client-side aggregation, type errors.

**Change**:
1. Modify `frontend/lib/features/vendors/presentation/providers/vendor_analytics_provider.dart`:
   - Update `VendorKpis.fromJson` to parse backend aggregated response
   - Remove client-side aggregation logic
   - Ensure all numeric fields use `_parseDouble` helper (already implemented)

2. Verify `ChartDataset.fromJson` uses `_parseDouble` (already implemented)

3. Update `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`:
   - Render KPIs directly from provider (no computation)
   - Render charts directly from provider

**Acceptance Criteria**:
- No type errors in console
- KPIs render correctly
- Charts render correctly
- No client-side aggregation

**Testing**:
- Navigate to Single Business Analytics
- Verify KPIs show correct values
- Verify charts render without errors
- Check console for type errors (should be none)

**Effort**: 2 hours  
**Risk**: Low

#### Task 3.4: Businesses Analytics Performance (Same Approach)

**Change**:
1. Modify `backend/src/analytics/analytics.service.ts`:
   - Implement `getOverallAnalytics(tenantId)`:
     - Balance: `SUM(vendor.monthlyLimit) - SUM(current month spent)`
     - Pie chart: Top 5 businesses by total spent
     - Line chart: Overall monthly spending (last 12 months)

2. Update `backend/src/analytics/dto/analytics-response.dto.ts`:
   - Define `OverallAnalyticsDto`

3. Modify `backend/src/analytics/analytics.controller.ts`:
   - Update `GET /analytics/overall` to return aggregated DTO

4. Modify `frontend/lib/features/analytics/presentation/providers/overall_analytics_provider.dart`:
   - Update to parse backend aggregated response
   - Remove client-side aggregation
   - Use `_parseDouble` helper (already implemented)

**Acceptance Criteria**:
- Backend returns fully aggregated data
- No type errors in frontend
- Response time < 2 seconds

**Testing**:
- Navigate to Businesses Analysis Screen
- Verify balance, pie chart, line chart render correctly
- Check console for type errors (should be none)

**Effort**: 3-4 hours  
**Risk**: Medium

**Phase 3 Total Effort**: 10-12 hours

---

### Phase 4: Auth UX Improvements (P2)

**Goal**: Inline validation, user-friendly error messages.

#### Task 4.1: Frontend Input Validation (Login)

**Current**: No inline validation, submit button always enabled.

**Change**:
1. Modify `frontend/lib/features/auth/presentation/screens/login_screen.dart`:
   - Add email validator: regex for valid email format
   - Add password validator: minimum 8 characters
   - Show inline error text below inputs (red text)
   - Disable "Enter" button until both inputs are valid
   - Example:
     ```dart
     String? _validateEmail(String? value) {
       if (value == null || value.isEmpty) {
         return 'Email is required';
       }
       if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
         return 'Enter a valid email';
       }
       return null;
     }
     
     String? _validatePassword(String? value) {
       if (value == null || value.isEmpty) {
         return 'Password is required';
       }
       if (value.length < 8) {
         return 'Password must be at least 8 characters';
       }
       return null;
     }
     ```

**Acceptance Criteria**:
- Email input shows error if invalid format
- Password input shows error if < 8 characters
- "Enter" button disabled until both valid
- Inline errors appear below inputs (red text)

**Testing**:
- Type invalid email → verify error shows
- Type short password → verify error shows
- Correct both → verify button enables

**Effort**: 1-2 hours  
**Risk**: Low

#### Task 4.2: Frontend Input Validation (Sign Up)

**Current**: No inline validation.

**Change**:
1. Modify `frontend/lib/features/auth/presentation/screens/signup_screen.dart`:
   - Add validators for: Full Name (not empty), Email (valid format), Password (min 8 chars), Business/Personal ID (not empty), System Currency (selected)
   - Show inline error text below inputs
   - Disable "Enter" button until all inputs valid

**Acceptance Criteria**:
- All inputs show inline validation errors
- "Enter" button disabled until all valid

**Testing**:
- Leave fields empty → verify errors
- Fill all fields correctly → verify button enables

**Effort**: 2 hours  
**Risk**: Low

#### Task 4.3: User-Friendly Error Messages (Backend Mapping)

**Current**: Generic error messages from Supabase.

**Change**:
1. Modify `backend/src/auth/auth.service.ts`:
   - Wrap Supabase auth calls in try-catch
   - Map Supabase error codes to user-friendly messages:
     ```typescript
     catch (error) {
       if (error.message.includes('User already registered')) {
         throw new BadRequestException({
           code: 'EMAIL_EXISTS',
           message: 'This email is already registered. Please log in instead.',
         });
       }
       if (error.message.includes('Invalid login credentials')) {
         throw new UnauthorizedException({
           code: 'INVALID_CREDENTIALS',
           message: 'Invalid email or password. Please try again.',
         });
       }
       // ... other mappings
     }
     ```

2. Modify `frontend/lib/features/auth/data/repositories/auth_repository_impl.dart`:
   - Parse error `code` from backend
   - Map to user-friendly messages (already partially implemented)

**Acceptance Criteria**:
- User sees friendly messages:
  - "This email is already registered. Please log in instead."
  - "Invalid email or password. Please try again."
  - "Network error. Please check your connection."

**Testing**:
- Try to sign up with existing email → verify friendly message
- Try to log in with wrong password → verify friendly message

**Effort**: 2-3 hours  
**Risk**: Low

**Phase 4 Total Effort**: 5-7 hours

---

### Phase 5: Responsive UI (P3)

**Goal**: Responsive layouts for mobile/tablet/desktop.

#### Task 5.1: Define Breakpoints

**Breakpoints**:
- Mobile: `< 600px` (width)
- Tablet: `600px – 1024px`
- Desktop: `> 1024px`

**Implementation**:
1. Create `frontend/lib/core/utils/responsive.dart`:
   ```dart
   class Responsive {
     static bool isMobile(BuildContext context) =>
       MediaQuery.of(context).size.width < 600;
     
     static bool isTablet(BuildContext context) =>
       MediaQuery.of(context).size.width >= 600 &&
       MediaQuery.of(context).size.width < 1024;
     
     static bool isDesktop(BuildContext context) =>
       MediaQuery.of(context).size.width >= 1024;
   }
   ```

**Effort**: 0.5 hours  
**Risk**: Low

#### Task 5.2: Home Screen Responsiveness

**Changes**:
1. Mobile: 1 business card per row (existing)
2. Tablet: 2 business cards per row (GridView with crossAxisCount: 2)
3. Desktop: 3 business cards per row (GridView with crossAxisCount: 3)

**Implementation**:
1. Modify `frontend/lib/features/home/presentation/screens/home_screen.dart`:
   ```dart
   int _getCrossAxisCount(BuildContext context) {
     if (Responsive.isDesktop(context)) return 3;
     if (Responsive.isTablet(context)) return 2;
     return 1;
   }
   
   // Use in GridView:
   GridView.builder(
     gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
       crossAxisCount: _getCrossAxisCount(context),
       childAspectRatio: 1.5,
       crossAxisSpacing: 16,
       mainAxisSpacing: 16,
     ),
     itemBuilder: (context, index) => VendorCard(...),
   )
   ```

**Acceptance Criteria**:
- Mobile: 1 card per row
- Tablet: 2 cards per row
- Desktop: 3 cards per row

**Testing**:
- Resize browser window
- Verify layout changes at breakpoints

**Effort**: 2 hours  
**Risk**: Low

#### Task 5.3: Analytics Screens Responsiveness

**Changes**:
1. Mobile: KPI cards in single column (existing)
2. Tablet: KPI cards in 2x2 grid (existing)
3. Desktop: KPI cards in 1 row of 4

**Implementation**:
1. Modify `frontend/lib/features/vendors/presentation/screens/vendor_analytics_screen.dart`:
   ```dart
   int _getKpiCrossAxisCount(BuildContext context) {
     if (Responsive.isDesktop(context)) return 4;
     return 2; // Mobile & Tablet
   }
   ```

2. Apply same to `overall_analytics_screen.dart`

**Acceptance Criteria**:
- Mobile/Tablet: 2x2 grid
- Desktop: 1x4 row

**Testing**:
- Resize window, verify KPI layout

**Effort**: 1-2 hours  
**Risk**: Low

#### Task 5.4: Dialogs Responsiveness

**Changes**:
1. Mobile: Full-width dialogs
2. Tablet/Desktop: Max-width 500px, centered

**Implementation**:
1. Update all dialogs (Add/Edit Business, Edit Name, Edit Amount, etc.):
   ```dart
   Dialog(
     child: Container(
       width: Responsive.isMobile(context) 
         ? double.infinity 
         : 500,
       padding: EdgeInsets.all(24),
       child: /* dialog content */,
     ),
   )
   ```

**Acceptance Criteria**:
- Mobile: Dialogs fill width
- Tablet/Desktop: Dialogs are 500px wide, centered

**Testing**:
- Open dialogs on mobile, tablet, desktop
- Verify width behavior

**Effort**: 2 hours  
**Risk**: Low

**Phase 5 Total Effort**: 5.5-6.5 hours

---

### Phase 6: Spec Compliance Audit (P4)

**Goal**: Verify implementation matches FLOW_CONTRACT exactly.

#### Task 6.1: Screen-by-Screen Audit

**Process**:
1. For each screen in FLOW_CONTRACT:
   - Open screen in app
   - Compare UI elements with "Required UI Elements"
   - Compare navigation with "Allowed Navigation"
   - Verify "Must NOT Exist" items are absent
   - Check loading/error/empty states

2. Document findings in `specs/002-invoiceme-mvp/COMPLIANCE_AUDIT.md`:
   - Format:
     ```markdown
     ## Screen: Welcome Screen
     - [x] All required UI elements present
     - [x] All navigation works correctly
     - [x] No forbidden elements exist
     - [x] Loading/error/empty states correct
     
     **Issues**: None
     ```

**Deliverables**:
- `COMPLIANCE_AUDIT.md` with checklist for all 10 screens

**Effort**: 3-4 hours  
**Risk**: Low

#### Task 6.2: Fix Drift Items

**Process**:
1. For each issue found in audit:
   - Create a sub-task
   - Fix the issue
   - Re-verify

**Estimated Issues**:
- Invoices tab in analytics (already fixing in Phase 3)
- Possibly extra UI elements or missing states

**Effort**: 2-4 hours (depends on findings)  
**Risk**: Low-Medium

**Phase 6 Total Effort**: 5-8 hours

---

## Ordered Implementation Phases (Summary)

| Phase | Focus | Priority | Effort | Risk | Deliverables |
|-------|-------|----------|--------|------|--------------|
| **0** | Observability | Foundation | 1-2h | Low | Timing logs, baseline metrics |
| **1** | Upload Reliability | P0 | 3-5h | Low | Fallback logic for OCR/LLM failures |
| **2** | Upload Progress UX | P0 | 2-3h | Low | Stage-based progress display |
| **3** | Analytics Performance | P1 | 10-12h | Medium | Backend aggregation, remove invoices tab, fix type errors |
| **4** | Auth UX | P2 | 5-7h | Low | Inline validation, friendly error messages |
| **5** | Responsive UI | P3 | 5.5-6.5h | Low | Breakpoints for mobile/tablet/desktop |
| **6** | Spec Compliance Audit | P4 | 5-8h | Low-Medium | COMPLIANCE_AUDIT.md, fix drift |

**Total Estimated Effort**: 32-43.5 hours  
**Suggested Timeline**: 1-2 weeks (part-time) or 5-6 days (full-time)

---

## Testing Strategy

### Continuous Testing (After Each Phase)

**Required Tests**:
1. **Smoke Test**: App builds and runs without errors
2. **Regression Test**: Existing features still work
3. **Phase-Specific Test**: New/fixed functionality works as expected

**Test Environments**:
- Local development (macOS/Windows/Linux)
- Web browser (Chrome, for responsive testing)
- Mobile emulator (iOS/Android, for touch interactions)

### Test Cases by Phase

#### Phase 1: Upload Reliability

**Test Cases**:
1. Upload clear invoice (Hebrew) → success, no review needed
2. Upload blurry invoice → success, needs review
3. Upload completely blank image → success, needs review, "Unknown Vendor"
4. Upload PDF with selectable text → success
5. Upload PDF without selectable text → OCR + success

**Expected Results**: All uploads succeed, appropriate `needsReview` flag set

#### Phase 2: Upload Progress

**Test Cases**:
1. Upload invoice → verify 4 stages appear in sequence
2. Upload fails at OCR stage → verify error message is specific
3. Upload fails at network → verify "Network error" message

**Expected Results**: User sees clear progress, knows where failure occurred

#### Phase 3: Analytics

**Test Cases**:
1. Navigate to Single Business Analytics → verify NO tabs
2. Verify KPIs show correct values (compare with manual calculation)
3. Verify charts render without type errors
4. Check console for type errors (should be none)
5. Same tests for Businesses Analysis Screen

**Expected Results**: Fast load, correct data, no errors, no tabs

#### Phase 4: Auth UX

**Test Cases**:
1. Login with invalid email → verify inline error
2. Login with short password → verify inline error
3. Login with wrong credentials → verify friendly message
4. Sign up with existing email → verify friendly message
5. Sign up with all valid inputs → success

**Expected Results**: Clear validation, friendly errors

#### Phase 5: Responsive UI

**Test Cases**:
1. Open Home on mobile (< 600px) → 1 card per row
2. Open Home on tablet (600-1024px) → 2 cards per row
3. Open Home on desktop (> 1024px) → 3 cards per row
4. Open analytics on desktop → KPIs in 1 row
5. Open dialog on mobile → full width
6. Open dialog on desktop → 500px width

**Expected Results**: Layouts adapt to screen size

#### Phase 6: Spec Compliance

**Test Cases**:
1. Audit all 10 screens against FLOW_CONTRACT
2. Verify all navigation edges work
3. Verify no forbidden elements exist

**Expected Results**: 100% compliance with FLOW_CONTRACT

---

## Rollout Strategy

### Phase Completion Criteria

**Each phase must meet these criteria before moving to next**:
1. All tasks completed
2. All tests pass
3. No new linter errors
4. No regression in existing functionality
5. Code reviewed (if team > 1 person)

### Minimal Refactoring Rule

**Allowed**:
- Small, scoped changes (one file, one method)
- Bug fixes
- Type corrections
- Adding missing states

**NOT Allowed**:
- Large refactors (rewriting entire services/providers)
- Changing architecture (stay with clean architecture + Riverpod)
- Replacing libraries (keep existing stack)
- Adding new features beyond FLOW_CONTRACT

### Keep App Runnable

**Requirement**: After each phase, the app must build and run locally.

**Strategy**:
- Commit after each task (not just phase)
- Test locally before moving to next task
- Use feature flags if needed (e.g., `OCR_DEBUG` env var)

---

## Success Criteria (Version 002 Complete)

**All issues resolved**:
- [x] Upload never hard-fails (always saves with needsReview if needed)
- [x] Upload shows clear progress stages
- [x] Single Business Analytics: fast, no tabs, no type errors
- [x] Businesses Analytics: fast, no type errors
- [x] Auth: inline validation + friendly errors
- [x] Responsive UI: works on mobile/tablet/desktop
- [x] Spec compliance: 100% match with FLOW_CONTRACT

**Performance Targets**:
- Upload < 10 seconds total (for typical invoice)
- Analytics load < 2 seconds
- No type errors in console
- No linter warnings

**User Experience**:
- Users understand upload progress
- Users know if invoice needs review (and why)
- Users see helpful error messages (not technical errors)
- UI adapts to screen size

**Documentation**:
- `BASELINE_METRICS.md` (performance baseline)
- `COMPLIANCE_AUDIT.md` (spec compliance verification)
- Updated `RUNBOOK.md` (if needed)

---

## Risk Mitigation

### Risk: Backend Analytics Aggregation Complexity

**Likelihood**: Medium  
**Impact**: High (Phase 3 blocked)

**Mitigation**:
1. Start with simple aggregations (SUM, AVG)
2. Test SQL queries in Prisma Studio before implementing
3. If complex pie chart aggregation too hard: return top 5 businesses by total, calculate items client-side (temporary)
4. Document any deferred optimizations in `specs/002-invoiceme-mvp/DEFERRED.md`

### Risk: OCR/LLM Fallback Too Aggressive

**Likelihood**: Low  
**Impact**: Medium (many invoices marked needsReview)

**Mitigation**:
1. Test with 10-20 sample invoices (Hebrew + English)
2. Adjust thresholds if too many false positives
3. Log warnings for analysis
4. Monitor `needsReview` rate in production

### Risk: Responsive UI Breaks Existing Layouts

**Likelihood**: Low  
**Impact**: Medium (UI looks bad on some devices)

**Mitigation**:
1. Test on multiple screen sizes before committing
2. Use Flutter DevTools layout inspector
3. Add overflow protection (`SingleChildScrollView` where needed)
4. Rollback if issues found

---

## Version Control

| Version | Date | Changes |
|---------|------|---------|
| 002 | 2026-01-20 | Initial stabilization plan |

---

**END OF STABILIZATION PLAN**
