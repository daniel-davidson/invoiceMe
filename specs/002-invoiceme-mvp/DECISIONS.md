# Design Decisions: InvoiceMe (Version 002)

**Purpose**: Document key architectural and design decisions for Version 002 stabilization  
**Created**: 2026-01-20  
**Status**: Decision Log

---

## Document Purpose

This document records important design decisions made during Version 002 stabilization, including:
- Rationale for each decision
- Alternatives considered
- Impact on implementation
- Future considerations

---

## Decision Log

### D001: KPI Selection for MVP Analytics Screens

**Date**: 2026-01-20  
**Status**: ✅ Decided  
**Category**: Analytics

#### Context

FLOW_CONTRACT defines 4 KPI cards for Single Business Analytics:
1. Current Monthly Spent
2. Monthly Limit (editable)
3. Monthly AVG
4. Yearly AVG

Question: Should MVP implement all 4 KPIs or reduce to 3 for simplicity?

#### Decision

**Implement all 4 KPIs as specified in FLOW_CONTRACT.**

#### Rationale

1. **User Value**: All 4 KPIs provide distinct, valuable insights:
   - **Current Monthly Spent**: Immediate awareness of current month spending
   - **Monthly Limit**: Budget tracking and overspending alerts (core feature)
   - **Monthly AVG**: Historical spending pattern (helps set realistic limits)
   - **Yearly AVG**: Long-term trend visibility

2. **Implementation Simplicity**: Backend aggregation makes all 4 KPIs equally easy to compute:
   ```typescript
   const monthlySpent = await prisma.invoice.aggregate({ _sum: { normalizedAmount } });
   const monthlyAvg = await prisma.invoice.aggregate({ _avg: { normalizedAmount } });
   const yearlyAvg = await prisma.invoice.aggregate({ _avg: { normalizedAmount } });
   ```

3. **UI Layout**: 2x2 grid layout (mobile/tablet) and 1x4 row (desktop) accommodate 4 KPIs without crowding

4. **Differentiation**: Monthly AVG vs Yearly AVG provide different time perspectives:
   - Monthly AVG: Short-term pattern (last 12 months)
   - Yearly AVG: Long-term pattern (all-time or year-to-date)

#### Alternatives Considered

**Option A: Reduce to 3 KPIs (Monthly Spent, Monthly Limit, Monthly AVG)**
- **Pros**: Simpler UI, fewer queries
- **Cons**: Lose long-term trend visibility (Yearly AVG)
- **Rejected**: Yearly AVG provides unique value, not redundant

**Option B: Single "Average" KPI (combine Monthly + Yearly)**
- **Pros**: Even simpler
- **Cons**: Lose granularity, confusing which average is shown
- **Rejected**: Users need both short-term and long-term averages

#### Implementation Impact

- **Backend**: Tasks T023-T027 (vendor analytics aggregation)
- **Frontend**: Tasks T028-T031 (parse and render 4 KPIs)
- **Effort**: No additional effort vs 3 KPIs (backend aggregation is same)

#### Future Considerations

- If user feedback indicates Yearly AVG is not used, consider removing in V003
- Potential to add KPI customization (user chooses which 3-4 to display)

---

### D002: Export/Share Icon Behavior

**Date**: 2026-01-20  
**Status**: 🟡 Pending (Choose Option A or B)  
**Category**: Analytics

#### Context

FLOW_CONTRACT specifies "Icon Button: Share/Export (right top corner)" on both analytics screens, but marks export functionality as "UI TBD" (to be determined).

Question: Should MVP implement export functionality or defer it?

#### Decision

**Pending - Choose ONE:**

**Option A (Recommended): Implement Minimal CSV Export**
- Share/Export icon triggers CSV download
- CSV contains: Month, Spent, Invoice Count
- Backend endpoint: `GET /analytics/vendor/:id/export/csv`
- Frontend: Browser download via blob URL

**Option B (Alternative): Mark Export as Out-of-Scope**
- Share/Export icon shows "Coming Soon" toast
- Update FLOW_CONTRACT to explicitly mark export as deferred
- No backend export implementation

#### Rationale for Option A (Recommended)

1. **User Value**: Export is expected for analytics screens (common pattern)
2. **Low Complexity**: CSV export is simple (10-15 lines backend, 5 lines frontend)
3. **Professional Feel**: Functional export icon improves app credibility
4. **No New Dependencies**: Use Node.js built-in CSV formatting

**Implementation Effort**:
- Backend: 1-2 hours (CSV generation + endpoint)
- Frontend: 0.5-1 hour (wire icon to download)
- **Total**: ~2-3 hours

#### Rationale for Option B (Alternative)

1. **MVP Focus**: Export is not critical for core invoice management flow
2. **Deferred Complexity**: Email/FTP export (as mentioned in FLOW_CONTRACT) is more complex
3. **Faster Delivery**: Skip export implementation, ship faster

**Implementation Effort**:
- Frontend: 0.25 hours (add toast)
- Documentation: 0.25 hours (update FLOW_CONTRACT)
- **Total**: ~0.5 hours

#### Recommendation

**Choose Option A** unless timeline is extremely tight.

**Reasoning**: 2-3 hours of effort is minimal, and CSV export provides significant value. "Coming Soon" toasts are poor UX for visible UI elements.

#### Implementation Impact

- **Option A**: Tasks T072-T074 (CSV export implementation)
- **Option B**: Tasks T072-ALT, T073-ALT (mark as deferred)

#### Future Considerations

If Option A is chosen:
- V003: Add Excel export (more formatting)
- V003: Add PDF export (formatted report)
- V003: Add email delivery (SMTP integration)

If Option B is chosen:
- V003: Implement full export (CSV + Excel + PDF + email/FTP)

---

### D003: Upload Failure Fallback Strategy

**Date**: 2026-01-20  
**Status**: ✅ Decided  
**Category**: Upload Reliability

#### Context

Version 001 had hard failures when PDF conversion, OCR, or LLM extraction failed. Users lost uploaded files with no record saved.

Question: What fallback strategy should we use for upload failures?

#### Decision

**Always save invoice with `needsReview=true` on any failure.**

**Fallback Hierarchy**:
1. **PDF Conversion Fails** → Return null, set `needsReview=true`, warning: "PDF conversion failed"
2. **OCR Fails** → Return empty string, set `needsReview=true`, warning: "OCR failed to extract text"
3. **LLM Extraction Fails** → Use fallback values:
   - `vendorName`: "Unknown Vendor" (do NOT auto-create business)
   - `totalAmount`: null
   - `currency`: null
   - `invoiceDate`: `new Date()` (current date)
   - `needsReview`: true
   - `warnings`: ["LLM extraction failed or incomplete"]

#### Rationale

1. **Never Lose User Data**: Uploaded files are valuable; always preserve them
2. **Transparency**: `needsReview` flag + warnings clearly indicate extraction issues
3. **Manual Review**: User can manually assign vendor, enter amount, fix date
4. **Prevent Invalid Data**: "Unknown Vendor" prevents creating fake businesses

#### Alternatives Considered

**Option A: Fail Fast (reject upload entirely)**
- **Pros**: Clean database (no partial data)
- **Cons**: User loses uploaded file, poor UX
- **Rejected**: Losing user data is unacceptable

**Option B: Save Everything, No Validation**
- **Pros**: Simplest implementation
- **Cons**: Database fills with garbage data, "Unknown Vendor" businesses everywhere
- **Rejected**: Data quality is important

#### Implementation Impact

- **Backend**: Tasks T059-T060 (PDF fallback), T012-T013 (OCR fallback), T008-T011 (LLM fallback), T064-T067 (LLM robustness)
- **Frontend**: Task T014 (success message with review status)
- **Effort**: ~5-6 hours total

#### Future Considerations

- V003: Add retry button for failed extractions (re-run OCR/LLM without re-uploading)
- V003: AI-assisted manual review (suggest values based on similar invoices)

---

### D004: Analytics Aggregation Location (Backend vs Frontend)

**Date**: 2026-01-20  
**Status**: ✅ Decided  
**Category**: Analytics Performance

#### Context

Version 001 sent raw invoice data to frontend and performed aggregations (SUM, AVG) in Flutter code. This caused:
- Slow analytics screen load (large payloads)
- Type errors (String vs num)
- Wasted mobile data transfer

Question: Where should aggregation happen?

#### Decision

**All aggregation MUST happen on the backend (Prisma + PostgreSQL).**

**Backend Returns**:
- Pre-computed KPIs (numbers, not strings)
- Pre-aggregated chart data (months + amounts)
- Minimal payload (no raw invoice data)

**Frontend Responsibilities**:
- Parse DTO with type-safe helpers (`_parseDouble`)
- Render KPIs and charts (no computation)

#### Rationale

1. **Performance**: Database aggregation is 10-100x faster than client-side
2. **Data Transfer**: Send 1 KPI object (200 bytes) vs 100 invoices (50+ KB)
3. **Type Safety**: Backend TypeScript ensures numeric types
4. **Mobile Friendly**: Reduce bandwidth and battery usage

#### Implementation Details

**Backend (Prisma)**:
```typescript
const monthlySpent = await prisma.invoice.aggregate({
  where: { tenantId, vendorId, invoiceDate: { gte: startOfMonth } },
  _sum: { normalizedAmount: true },
});

const lineChartData = await prisma.$queryRaw`
  SELECT DATE_TRUNC('month', "invoiceDate") as month,
         SUM("normalizedAmount") as total
  FROM "Invoice"
  WHERE "tenantId" = ${tenantId} AND "vendorId" = ${vendorId}
  GROUP BY month
  ORDER BY month DESC
  LIMIT 12
`;
```

**Frontend (Flutter)**:
```dart
final kpis = VendorKpis.fromJson(response.data);
// No aggregation, just display
Text('${kpis.monthlySpent.toStringAsFixed(2)}')
```

#### Alternatives Considered

**Option A: Frontend Aggregation (Status Quo)**
- **Pros**: Backend simplicity
- **Cons**: Slow, type errors, large payloads
- **Rejected**: Poor performance and UX

**Option B: Hybrid (Backend for KPIs, Frontend for Charts)**
- **Pros**: Balanced workload
- **Cons**: Still sends raw data, chart aggregation is complex
- **Rejected**: No benefit vs full backend aggregation

#### Implementation Impact

- **Backend**: Tasks T023-T027 (vendor analytics), T032-T036 (overall analytics)
- **Frontend**: Tasks T028-T031 (vendor parsing), T035-T036 (overall parsing)
- **Effort**: ~10-12 hours total

#### Future Considerations

- V003: Add caching layer (Redis) for frequently-accessed analytics
- V003: Consider GraphQL for flexible client queries (if needed)

---

### D005: Multi-Tenant Enforcement Strategy

**Date**: 2026-01-20  
**Status**: ✅ Decided  
**Category**: Security

#### Context

InvoiceMe uses single-tenant-per-user model (tenant = user). All database queries MUST filter by `tenantId` to prevent cross-user data leaks.

Question: How do we enforce tenantId scoping across all queries?

#### Decision

**Multi-layered enforcement strategy:**

1. **Code Convention**: Every Prisma query MUST include `where: { tenantId }`
2. **Code Review**: Manual audit of all service files (Tasks T068-T070)
3. **E2E Tests**: Tenant isolation test (Task T071) verifies users cannot access each other's data
4. **Runtime Validation**: Guards (JwtAuthGuard, TenantGuard) extract tenantId from JWT and inject into requests

#### Rationale

1. **Defense in Depth**: Multiple layers catch errors
2. **Developer Awareness**: Code convention makes intent explicit
3. **Testability**: E2E tests provide ongoing verification
4. **Fail-Safe**: Guards prevent unauthorized requests from reaching services

#### Implementation Details

**Example Query Pattern**:
```typescript
// ✅ CORRECT
async findAll(tenantId: string) {
  return this.prisma.vendor.findMany({
    where: { tenantId },
    orderBy: { displayOrder: 'asc' },
  });
}

// ❌ WRONG (missing tenantId)
async findAll() {
  return this.prisma.vendor.findMany({
    orderBy: { displayOrder: 'asc' },
  });
}
```

**Guard Implementation**:
```typescript
@UseGuards(JwtAuthGuard, TenantGuard)
@Get('vendors')
getVendors(@Request() req) {
  const tenantId = req.user.sub; // from JWT
  return this.vendorsService.findAll(tenantId);
}
```

#### Alternatives Considered

**Option A: Prisma Middleware (Automatic tenantId Injection)**
- **Pros**: Enforce at ORM level, impossible to forget
- **Cons**: Complex middleware, harder to debug, implicit behavior
- **Rejected**: Explicit is better than implicit

**Option B: Row-Level Security (PostgreSQL RLS)**
- **Pros**: Database-level enforcement, strongest security
- **Cons**: Complex setup, Supabase-specific, migration difficulty
- **Rejected**: Overkill for single-user-per-tenant model

**Option C: Separate Databases per Tenant**
- **Pros**: Perfect isolation
- **Cons**: Massive operational complexity, cost
- **Rejected**: Not suitable for MVP

#### Implementation Impact

- **Backend**: Tasks T068-T071 (audit + E2E test)
- **Effort**: ~3-4 hours (mostly code review)

#### Future Considerations

- If multi-user tenants are added (team accounts), revisit RLS or middleware approach
- Add automated linting rule to detect missing tenantId filters

---

### D006: OCR Quality Improvements (Version 001 → 002)

**Date**: 2026-01-20  
**Status**: ✅ Decided (Already Implemented in V001)  
**Category**: OCR Accuracy

#### Context

Hebrew/English invoice OCR accuracy was poor in early POC. Users reported missing totals and incorrect vendor names.

Question: What OCR improvements are needed?

#### Decision

**Already Implemented in Version 001** (no new tasks needed for V002):

1. **Image Preprocessing** (using `sharp`):
   - Grayscale conversion
   - Auto-rotation (deskew)
   - Contrast enhancement
   - Sharpening
   - Thresholding (binarization)
   - Resize to ~300 DPI equivalent

2. **Multi-Pass OCR** (using `tesseract.js`):
   - PSM 6: Block of text
   - PSM 4: Columns
   - PSM 11: Sparse text
   - PSM 3: Auto page segmentation
   - PSM 12: Sparse + OSD

3. **Heuristic Scoring Selector**:
   - Score based on: money keywords, money-like numbers, date patterns, text length, special char penalty
   - Select OCR output with highest score

4. **Language Pack**: `heb+eng` (Hebrew + English)

5. **Debug Logging**: Controlled by `OCR_DEBUG` env var

#### Rationale

Multi-pass OCR with scoring significantly improves accuracy for:
- Mixed Hebrew/English invoices
- Various invoice layouts (receipts, formal invoices, delivery notes)
- Low-quality scans or photos

#### Verification Tasks

- **Tasks T061-T063**: Code inspection to verify implementation exists and is active

#### Implementation Impact

- **Backend**: Already implemented in `backend/src/extraction/ocr/ocr.service.ts`
- **Effort**: 0 hours (verification only, ~1 hour for code review)

#### Future Considerations

- V003: Add Arabic language support (`ara+heb+eng`)
- V003: Train custom Tesseract model for invoice-specific patterns
- V003: Add OCR confidence scoring to determine needsReview threshold

---

### D007: LLM Prompt Robustness Strategy

**Date**: 2026-01-20  
**Status**: ✅ Decided  
**Category**: LLM Extraction

#### Context

Ollama LLM extraction sometimes fails to extract totals from invoices, especially:
- Long invoices with 10+ line items
- Hebrew invoices with English numbers
- Invoices with subtotal + tax breakdown

Question: How do we improve LLM extraction reliability?

#### Decision

**Implement multi-layer extraction strategy:**

1. **OCR Text Chunking** (Task T064):
   - If OCR text >4000 chars, chunk to: top 1500 + bottom 1500 + keyword lines
   - Prevents LLM context overflow

2. **Explicit Total Extraction Prompt** (Task T066):
   - Add: "CRITICAL: Extract final total amount (after tax, near 'סה\"כ' or 'Total' keywords)"
   - Provide Hebrew examples in prompt

3. **Regex Fallback for Totals** (Tasks T065, T067):
   - If LLM returns null total, search OCR text for regex patterns
   - Example: `(\d+[\.,]\d{2})` near keywords "total", "סה\"כ", "לתשלום"
   - Use heuristic: largest amount near total keyword is likely the total

#### Rationale

1. **Chunking**: Prevents LLM from getting overwhelmed by long text
2. **Explicit Prompt**: Guides LLM to focus on critical field (total)
3. **Regex Fallback**: Simple, reliable backup for when LLM fails

#### Implementation Details

**Chunking Logic**:
```typescript
function chunkOcrText(text: string, maxChars = 4000): string {
  if (text.length <= maxChars) return text;
  
  const top = text.substring(0, 1500);
  const bottom = text.substring(text.length - 1500);
  const keywordLines = extractKeywordLines(text); // lines with "total", "סה\"כ", etc.
  
  return `${top}\n...[TRUNCATED]...\n${keywordLines}\n${bottom}`;
}
```

**Regex Fallback**:
```typescript
function extractTotalFallback(ocrText: string): number | null {
  const totalKeywords = ['total', 'סה"כ', 'לתשלום', 'grand total'];
  const amountRegex = /(\d+[\.,]\d{2})/g;
  
  // Find all amounts near total keywords
  const candidates = [];
  for (const keyword of totalKeywords) {
    const keywordIndex = ocrText.toLowerCase().indexOf(keyword);
    if (keywordIndex !== -1) {
      const nearbyText = ocrText.substring(keywordIndex - 100, keywordIndex + 100);
      const amounts = nearbyText.match(amountRegex);
      if (amounts) candidates.push(...amounts.map(parseFloat));
    }
  }
  
  // Return largest amount (likely the total)
  return candidates.length > 0 ? Math.max(...candidates) : null;
}
```

#### Alternatives Considered

**Option A: Fine-tune LLM on Invoice Dataset**
- **Pros**: Best accuracy
- **Cons**: Requires 1000s of labeled invoices, expensive, complex
- **Rejected**: Overkill for MVP

**Option B: Use GPT-4 API (OpenAI)**
- **Pros**: More reliable extraction
- **Cons**: Costs $, requires internet, API key management
- **Rejected**: Want to keep local-first option

**Option C: Template Matching (per Vendor)**
- **Pros**: Very accurate for known vendors
- **Cons**: Requires per-vendor templates, doesn't scale
- **Rejected**: Too rigid for MVP

#### Implementation Impact

- **Backend**: Tasks T064-T067 (chunking + fallback + prompt improvement)
- **Effort**: ~3-4 hours

#### Future Considerations

- V003: Add LLM model selection (Mistral, Llama, GPT-4 API as options)
- V003: Track extraction confidence per field (use for needsReview threshold)
- V003: User feedback loop (correct extractions → fine-tune prompts)

---

## Decision Status Summary

| ID | Decision | Status | Implementation Tasks |
|----|----------|--------|---------------------|
| D001 | KPI Selection (4 KPIs) | ✅ Decided | T023-T036 |
| D002 | Export Behavior | 🟡 Pending | T072-T074 (Option A) OR T072-ALT, T073-ALT (Option B) |
| D003 | Upload Fallback | ✅ Decided | T059-T060, T008-T013, T064-T067 |
| D004 | Analytics Aggregation | ✅ Decided | T023-T036 |
| D005 | Multi-Tenant Enforcement | ✅ Decided | T068-T071 |
| D006 | OCR Improvements | ✅ Decided (V001) | T061-T063 (verification only) |
| D007 | LLM Robustness | ✅ Decided | T064-T067 |

**Pending Decisions**: 1 (D002 - Export Behavior)

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 002 | 2026-01-20 | Initial decisions for stabilization release |

---

**END OF DECISIONS**
