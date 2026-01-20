# Research: InvoiceMe Stabilization (Version 002)

**Date**: 2026-01-20  
**Purpose**: Technology decisions and patterns for stabilization fixes  
**Scope**: Observability, upload reliability, progress tracking, analytics, auth UX, responsive design

---

## 1. Observability & Timing Logs

### Problem Statement
Need to measure performance improvements across upload pipeline (PDF→OCR→LLM→DB) and analytics queries. Current implementation has no timing instrumentation.

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **NestJS Interceptors** | Automatic timing for all endpoints, DRY | Adds complexity, harder to selectively enable | ❌ Rejected |
| **Manual Logging** | Simple, explicit, easy to disable | Requires manual instrumentation per operation | ✅ **Chosen** |
| **APM Tool (DataDog, New Relic)** | Production-grade observability | Requires external service, overkill for POC | ❌ Rejected |

### Chosen Approach: Manual Structured Logging

**Rationale**:
- POC environment doesn't justify APM tooling
- Manual logs give precise control over what's measured
- Structured format (JSON) enables easy parsing for analysis
- Can be disabled via env var without code changes

**Implementation Notes**:

**Backend** (NestJS):
```typescript
// backend/src/common/utils/timing-logger.ts
export function logTiming(operation: string, durationMs: number) {
  if (process.env.ENABLE_TIMING_LOGS !== 'false') {
    console.log(JSON.stringify({
      type: 'TIMING',
      operation,
      duration: durationMs,
      timestamp: new Date().toISOString(),
    }));
  }
}

// Usage in extraction.service.ts:
const start = Date.now();
const ocrResult = await this.ocrService.recognizeText(buffer);
logTiming('extraction.ocr', Date.now() - start);
```

**Frontend** (Flutter):
```dart
// frontend/lib/core/utils/timing_logger.dart
class TimingLogger {
  static void log(String operation, int durationMs) {
    if (kDebugMode) {
      debugPrint(jsonEncode({
        'type': 'TIMING',
        'operation': operation,
        'duration': durationMs,
        'timestamp': DateTime.now().toIso8601String(),
      }));
    }
  }
}

// Usage in upload flow:
final start = DateTime.now();
await apiClient.post('/invoices/upload', data: formData);
TimingLogger.log('upload.request', DateTime.now().difference(start).inMilliseconds);
```

**Operations to Measure**:
- Backend: `extraction.pdf-convert`, `extraction.ocr`, `extraction.llm`, `extraction.db-save`, `analytics.query`
- Frontend: `upload.select-file`, `upload.request`, `upload.response`, `analytics.fetch`, `analytics.render`

---

## 2. Upload Reliability: OCR Robustness

### Problem Statement
Current OCR sometimes fails on low-quality images or produces incomplete text. Need preprocessing, multi-PSM attempts, and scoring to select best result.

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Cloud OCR (Google Vision)** | Higher accuracy | External dependency, costs, latency | ❌ Rejected (out of scope) |
| **Tesseract with preprocessing** | No new dependencies, proven technique | Requires image manipulation library | ✅ **Chosen** |
| **Multiple OCR engines** | Best-of-breed accuracy | Complexity, multiple integrations | ❌ Rejected |

### Chosen Approach: Enhanced Tesseract with Sharp Preprocessing

**Rationale**:
- `Sharp` library already available in Node.js ecosystem (fast, modern)
- Tesseract supports multiple PSM (Page Segmentation Modes) for different layouts
- Scoring algorithm can objectively select best OCR output
- No new external services required

**Implementation Notes**:

**Preprocessing Steps** (using Sharp):
1. Convert to grayscale (reduce noise)
2. Auto-rotate using EXIF data (correct phone camera uploads)
3. Increase contrast (make text darker)
4. Apply sharpening filter (enhance edges)
5. Binarization/thresholding (black text on white background)
6. Resize to ~300 DPI equivalent (Tesseract optimal)

**Multi-PSM Strategy**:
Run Tesseract with these Page Segmentation Modes:
- **PSM 6**: Uniform block of text (invoices with clear structure)
- **PSM 4**: Single column of text (receipt-style invoices)
- **PSM 11**: Sparse text, find as much as possible (poor quality)
- **PSM 3**: Fully automatic (fallback)
- **PSM 12**: Sparse + OSD (orientation/script detection)

**Scoring Algorithm**:
```typescript
function scoreOcrText(text: string): number {
  let score = 0;
  
  // Money keywords (Hebrew + English)
  const moneyKeywords = ['סה"כ', 'Total', 'Amount', 'מע"מ', 'VAT', 'לתשלום'];
  score += moneyKeywords.filter(kw => text.includes(kw)).length * 10;
  
  // Money-like numbers (###.##)
  score += (text.match(/\d+\.\d{2}/g) || []).length * 5;
  
  // Date patterns
  score += (text.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g) || []).length * 5;
  
  // Text length (longer = more complete)
  score += Math.min(text.length / 100, 10);
  
  // Penalty for too many special chars (indicates OCR noise)
  const specialChars = text.match(/[^\w\s\.\,\:\/\-]/g) || [];
  score -= Math.min(specialChars.length / 10, 5);
  
  return score;
}
```

**Relevant Text Selection** (after choosing best OCR):
Instead of sending entire OCR output to LLM (which can be 1000+ lines), select:
- Top 20 lines (header with vendor, date)
- Bottom 20 lines (totals section)
- Lines containing money keywords (anywhere in document)

This reduces LLM input size by 50-80% while preserving critical data.

**Already Implemented**: Steps 1-5 were implemented in a previous iteration. This research confirms the approach and adds the relevant text selection enhancement.

---

## 3. Upload Reliability: LLM Extraction Fallback

### Problem Statement
LLM sometimes fails to extract required fields (vendor, amount, date) or returns low confidence. Current implementation hard-fails, losing user's upload.

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Reject upload entirely** | Simple, enforces quality | User loses progress, frustrating UX | ❌ Rejected |
| **Save with needsReview flag** | Preserves data, allows manual correction | Requires manual review UI (already exists) | ✅ **Chosen** |
| **Retry with different prompts** | May improve accuracy | Adds latency, no guarantee of success | ❌ Rejected |

### Chosen Approach: Graceful Degradation with needsReview

**Rationale**:
- Never lose user's upload (primary UX goal)
- Database already has `needsReview` boolean and `warnings` string[] fields
- Manual review UI can be added later (out of scope for POC stabilization)
- Raw OCR text + LLM response are persisted for debugging

**Fallback Tiers**:

1. **High Confidence (≥0.7)**: Auto-save, needsReview=false
2. **Medium Confidence (0.4-0.7)**: Save with needsReview=true, show warning snackbar
3. **Low Confidence (<0.4)**: Save with defaults, needsReview=true, prompt manual entry

**Default Values** (when fields missing):
- `vendorName`: "Unknown Vendor" (prompt user to select)
- `totalAmount`: 0.0 (flag as invalid)
- `currency`: User's system currency (safest assumption)
- `invoiceDate`: Today's date (flag as estimated)

**Warnings Array**:
```typescript
const warnings: string[] = [];
if (!extractedData.vendorName) warnings.push('Vendor name could not be extracted');
if (!extractedData.totalAmount) warnings.push('Amount could not be extracted');
if (confidence < 0.7) warnings.push('Low confidence extraction - please review');
```

**Implementation**:
```typescript
// backend/src/extraction/extraction.service.ts
async extractInvoice(file, tenantId) {
  const ocrText = await this.ocrService.recognize(file);
  const llmResult = await this.llmService.extract(ocrText);
  
  const warnings = [];
  let needsReview = false;
  
  // Validate required fields
  if (!llmResult.vendorName) {
    warnings.push('Vendor name could not be extracted');
    llmResult.vendorName = 'Unknown Vendor';
    needsReview = true;
  }
  
  if (!llmResult.totalAmount || llmResult.totalAmount === 0) {
    warnings.push('Amount could not be extracted');
    llmResult.totalAmount = 0;
    needsReview = true;
  }
  
  if (llmResult.confidence < 0.7) {
    warnings.push('Low confidence extraction - please review');
    needsReview = true;
  }
  
  // ALWAYS save invoice (even if errors)
  return this.invoicesService.create({
    ...llmResult,
    needsReview,
    warnings,
    tenantId,
  });
}
```

---

## 4. Upload Progress: Stage-Based UI

### Problem Statement
Upload + OCR + LLM can take 10-30 seconds. Current implementation shows only "Uploading..." which leaves users uncertain about progress.

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Real-time progress (WebSocket/SSE)** | Accurate progress updates | Requires backend infrastructure, complexity | ❌ Rejected (overkill for POC) |
| **Polling backend for status** | Simple server implementation | Adds latency, chatty API | ❌ Rejected |
| **Client-side stage simulation** | No backend changes, sufficient UX | Not perfectly accurate (can't show OCR %) | ✅ **Chosen** |

### Chosen Approach: Client-Side Stage-Only Updates

**Rationale**:
- Backend processing is synchronous (<30s); no need for async job queue
- Users care more about "what's happening" than precise percentage
- 4 clear stages (Upload → OCR → Extract → Save) are self-explanatory
- No backend code changes required (minimal scope)

**Implementation**:

**Frontend State Machine**:
```dart
enum UploadStage { upload, ocr, extraction, save, complete, error }

class UploadProgress {
  final UploadStage stage;
  final int? progress;  // 0-100 for upload, null for others
  final String message;
}
```

**Progress Flow**:
1. **User selects file**: `{stage: upload, progress: 0, message: "Uploading..."}`
2. **File uploading** (via dio progress callback): `{stage: upload, progress: 45, message: "Uploading... 45%"}`
3. **Upload complete** (request sent): `{stage: ocr, progress: null, message: "Reading invoice (OCR)..."}`
4. **Estimated OCR duration** (~10s, based on logs): `{stage: extraction, progress: null, message: "Extracting data..."}`
5. **Estimated LLM duration** (~8s): `{stage: save, progress: null, message: "Saving..."}`
6. **Response received**: `{stage: complete, ...}` → show snackbar

**UI Rendering**:
- Upload stage: Linear progress bar with percentage
- OCR/Extract/Save stages: Circular spinner + stage message
- Complete stage: Dismiss dialog, show success snackbar
- Error stage: Show error snackbar with retry option

**Limitations**:
- OCR/Extract/Save stages don't show precise percentage (backend doesn't report)
- Timing is estimated (may feel "stuck" on slow invoices)
- Acceptable trade-off for POC (better than single "Uploading..." spinner)

---

## 5. Analytics: Backend Aggregation

### Problem Statement
Current implementation returns raw invoices to frontend, which then sums amounts for KPIs and charts. This causes:
- Slow load times (transferring 100+ invoices over network)
- Type errors (Prisma Decimal → string → frontend parsing issues)
- Incorrect aggregations (client-side rounding errors)

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Frontend aggregation** | Simple backend | Slow, error-prone, bandwidth-heavy | ❌ Rejected (current bad state) |
| **Backend aggregation (Prisma)** | Fast, accurate, typed | Requires query optimization | ✅ **Chosen** |
| **Materialized views (Postgres)** | Fastest queries | Adds complexity, migration required | ❌ Rejected (out of scope) |

### Chosen Approach: Backend Aggregation with Prisma Queries

**Rationale**:
- Backend has direct DB access (faster than network round-trip)
- Prisma supports `aggregate()` for sums, averages, counts
- Backend can ensure all numbers are returned as `number` (not `Decimal` strings)
- Matches REST best practices (backend owns data transformation)

**Implementation Pattern**:

**Vendor Analytics** (`GET /analytics/vendor/:id`):
```typescript
async getVendorAnalytics(tenantId: string, vendorId: string) {
  // Current month spend (single query)
  const currentMonth = await this.prisma.invoice.aggregate({
    _sum: { normalizedAmount: true },
    where: {
      tenantId,
      vendorId,
      invoiceDate: {
        gte: startOfMonth(new Date()),
        lte: endOfMonth(new Date()),
      },
    },
  });

  // Monthly average (group by month, then average)
  const monthlyTotals = await this.prisma.$queryRaw`
    SELECT DATE_TRUNC('month', "invoiceDate") AS month,
           SUM("normalizedAmount") AS total
    FROM "Invoice"
    WHERE "tenantId" = ${tenantId} AND "vendorId" = ${vendorId}
    GROUP BY month
  `;
  const monthlyAvg = monthlyTotals.reduce((sum, m) => sum + m.total, 0) / monthlyTotals.length;

  // Line chart data (spend by month)
  const lineChartData = monthlyTotals.map(m => Number(m.total));

  return {
    kpis: {
      currentMonthSpend: Number(currentMonth._sum.normalizedAmount || 0),
      monthlyAverage: monthlyAvg,
      yearlyAverage: monthlyAvg * 12,  // Simplified for POC
    },
    lineChart: {
      labels: monthlyTotals.map(m => format(m.month, 'MMM yyyy')),
      datasets: [{
        label: 'Monthly Spend',
        data: lineChartData,  // Already typed as number[]
      }],
    },
  };
}
```

**Overall Analytics** (`GET /analytics/overall`):
```typescript
async getOverallAnalytics(tenantId: string) {
  // Top 5 vendors by spend (pie chart)
  const topVendors = await this.prisma.$queryRaw`
    SELECT v.name AS vendor, SUM(i."normalizedAmount") AS total
    FROM "Invoice" i
    JOIN "Vendor" v ON i."vendorId" = v.id
    WHERE i."tenantId" = ${tenantId}
    GROUP BY v.name
    ORDER BY total DESC
    LIMIT 5
  `;

  const grandTotal = topVendors.reduce((sum, v) => sum + Number(v.total), 0);

  return {
    pieChart: {
      segments: topVendors.map(v => ({
        label: v.vendor,
        value: Number(v.total),
        percentage: (Number(v.total) / grandTotal) * 100,
      })),
    },
  };
}
```

**Type Safety**:
- Always convert Prisma `Decimal` to `number` before returning: `Number(decimal)`
- DTOs enforce `number` type (not `string` or `any`)

---

## 6. Analytics: Frontend Defensive Parsing

### Problem Statement
Even with backend returning typed numbers, network/JSON serialization can introduce string types. Frontend crashes with `TypeError: type 'String' is not a subtype of type 'num'`.

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Strict type checking** | Enforces contract compliance | Crashes on type mismatch | ❌ Rejected (too fragile) |
| **Defensive parsing with fallbacks** | Handles both types gracefully | Hides backend bugs | ✅ **Chosen** |
| **Runtime schema validation (Freezed)** | Typed + validated | Adds boilerplate | ❌ Rejected (out of scope) |

### Chosen Approach: Defensive Parsing with Fallback Defaults

**Rationale**:
- Frontend should never crash on bad data (graceful degradation)
- Simple helper function handles both `num` and `String` types
- Fallback to `0.0` prevents chart rendering errors
- Acceptable trade-off for POC (production would use stricter validation)

**Implementation**:
```dart
// Shared helper (used in all analytics providers)
static double _parseDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0.0;
  return 0.0;  // Fallback for null/unexpected types
}

// Usage in fromJson:
factory VendorKpis.fromJson(Map<String, dynamic> json) {
  return VendorKpis(
    currentMonthSpend: _parseDouble(json['currentMonthSpend']),
    monthlyAverage: _parseDouble(json['monthlyAverage']),
    yearlyAverage: _parseDouble(json['yearlyAverage']),
  );
}
```

**Apply to All Numeric Fields**:
- KPI values (spend, averages, limits)
- Chart data points (line chart values, pie chart percentages)
- Invoice amounts (original, normalized)

**Already Implemented**: This pattern was added in a previous iteration. This research confirms it's the correct approach for stabilization.

---

## 7. Auth UX: Inline Validation

### Problem Statement
Current login/signup forms show errors only after backend submission. Users don't know if email format is wrong or password is too weak until after delay.

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Backend-only validation** | Single source of truth | Slow feedback, poor UX | ❌ Rejected |
| **Frontend-only validation** | Instant feedback | Can diverge from backend rules | ❌ Rejected |
| **Frontend + backend validation** | Best UX + security | Duplication of rules | ✅ **Chosen** |

### Chosen Approach: Frontend Inline + Backend Final Validation

**Rationale**:
- Frontend validation provides instant feedback (<200ms requirement)
- Backend validation ensures security (client can be bypassed)
- Duplication is acceptable for simple rules (email format, password length)

**Frontend Validators**:
```dart
// frontend/lib/core/utils/validators.dart
class Validators {
  static String? email(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }
    final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+$');
    if (!emailRegex.hasMatch(value)) {
      return 'Please enter a valid email address';
    }
    return null;  // Valid
  }

  static String? password(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    return null;  // Valid
  }
}
```

**Form Integration**:
```dart
// In login_screen.dart
TextFormField(
  decoration: InputDecoration(
    labelText: 'Email',
    errorText: _emailError,  // Show inline error
  ),
  onChanged: (value) {
    setState(() {
      _emailError = Validators.email(value);
    });
  },
)

// Disable submit button when errors exist
ElevatedButton(
  onPressed: _emailError == null && _passwordError == null
      ? _submit
      : null,  // Disabled
  child: Text('Sign In'),
)
```

**Backend Error Mapping**:
- Supabase `AuthApiException` → User-friendly message
- 409 Conflict → "An account with this email already exists"
- 401 Unauthorized → "Invalid email or password"

---

## 8. Responsive Design: Breakpoint Strategy

### Problem Statement
Current implementation has no responsive breakpoints. App is unusable on mobile (375px) and inefficient on desktop (1440px).

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Separate mobile/desktop apps** | Optimal UX per platform | Double development effort | ❌ Rejected (out of scope) |
| **Responsive web with breakpoints** | Single codebase, works on all devices | Requires layout adaptation | ✅ **Chosen** |
| **Mobile-first only** | Simple, works on small screens | Wastes desktop space | ❌ Rejected |

### Chosen Approach: Mobile-First with 3 Breakpoints

**Rationale**:
- Flutter web supports responsive layouts via `MediaQuery` + `LayoutBuilder`
- 3 breakpoints cover most devices (mobile, tablet, desktop)
- Mobile-first approach ensures usability on smallest screens

**Breakpoints**:
- **Mobile**: ≤640px (iPhone SE, most phones)
- **Tablet**: 641px-1024px (iPad, small laptops)
- **Desktop**: >1024px (laptops, monitors)

**Layout Patterns**:

| Screen | Mobile (≤640px) | Tablet (641-1024px) | Desktop (>1024px) |
|--------|----------------|---------------------|-------------------|
| **Home** | Single-column vendor list | 2-column grid | 3-column grid |
| **Analytics** | Stacked KPIs + charts | 2-column grid (KPIs left, charts right) | 3-column (KPIs, line chart, pie chart) |
| **Forms** | Full-width | Centered 400px card | Centered 500px card |
| **Dialogs** | Full-screen | Modal 600px | Modal 800px |

**Implementation Pattern**:
```dart
// frontend/lib/core/theme/breakpoints.dart
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

  static int getColumns(BuildContext context) {
    final size = getScreenSize(context);
    switch (size) {
      case ScreenSize.mobile: return 1;
      case ScreenSize.tablet: return 2;
      case ScreenSize.desktop: return 3;
    }
  }
}

// Usage in home_screen.dart
GridView.builder(
  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: Breakpoints.getColumns(context),
    crossAxisSpacing: 16,
    mainAxisSpacing: 16,
  ),
  itemBuilder: (context, index) => VendorCard(...),
)
```

**Touch Targets**:
- Minimum 44x44px on mobile (Apple HIG guideline)
- Increase button/icon padding on mobile screens

---

## Decision Summary

| Area | Chosen Approach | Key Benefit |
|------|----------------|-------------|
| **Observability** | Manual structured logging | Simple, controllable, no new dependencies |
| **OCR Robustness** | Preprocessing + multi-PSM + scoring | Already implemented; adds relevant text selection |
| **LLM Fallback** | Save with needsReview flag | Never loses user data |
| **Upload Progress** | Client-side stage simulation | No backend changes, sufficient UX |
| **Analytics Aggregation** | Backend Prisma queries | Fast, accurate, type-safe |
| **Frontend Parsing** | Defensive parsing with fallbacks | Crash-proof, graceful degradation |
| **Auth Validation** | Frontend inline + backend final | Instant feedback + security |
| **Responsive Design** | Mobile-first with 3 breakpoints | Works on all devices, single codebase |

---

## Next Steps

1. **Phase 1**: Create data-model.md (confirm existing schema)
2. **Phase 1**: Update contracts/ (analytics, auth, upload DTOs)
3. **Phase 1**: Update quickstart.md (add debug flags)
4. **Phase 1**: Run update-agent-context.sh
5. **Phase 2**: Generate tasks.md via `/speckit.tasks`
