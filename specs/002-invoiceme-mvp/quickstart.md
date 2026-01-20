# Quickstart: InvoiceMe Version 002 (Stabilization)

**Purpose**: Local development setup with debugging tools for stabilization work  
**Audience**: Developers working on Version 002 fixes  
**Prerequisites**: See `RUNBOOK.md` in Version 001 for full environment setup

---

## Version 002 Development Enhancements

This guide focuses on **new debugging capabilities** added for stabilization. For complete setup instructions, refer to `../001-invoiceme-mvp/RUNBOOK.md`.

---

## Quick Start (Existing Project)

If you already have Version 001 running:

```bash
# 1. Switch to stabilization branch
git checkout 002-invoiceme-mvp

# 2. Install any new dependencies (if applicable)
cd backend && npm install
cd ../frontend && flutter pub get

# 3. Enable debugging flags (see below)
# Edit backend/.env and add debugging vars

# 4. Run normally
cd backend && npm run start:dev
cd frontend && flutter run -d chrome
```

---

## New Environment Variables (Version 002)

### Backend Debugging Flags

Add to `backend/.env`:

```bash
# Timing Logs (Step 1: Observability)
ENABLE_TIMING_LOGS=true          # Enable structured timing logs
LOG_LEVEL=debug                  # More verbose logging

# OCR Debugging (Step 2: OCR Robustness)
OCR_DEBUG=true                   # Log multi-PSM scores, chosen mode, text preview

# Extraction Debugging (Step 3: LLM Fallback)
LLM_DEBUG=true                   # Log raw LLM prompts and responses
SAVE_FAILED_EXTRACTIONS=true     # Save invoices even when extraction fails
```

**Production Values** (disable debugging):
```bash
ENABLE_TIMING_LOGS=false
OCR_DEBUG=false
LLM_DEBUG=false
```

### Frontend Debugging

Flutter web automatically logs to browser console. No additional flags needed.

---

## Testing Responsive Breakpoints (Step 10)

### Using Browser DevTools

1. **Open Flutter web app** in Chrome: `http://localhost:XXXXX`
2. **Open DevTools**: F12 or Cmd+Opt+I
3. **Toggle Device Toolbar**: Cmd+Shift+M (Mac) or Ctrl+Shift+M (Windows)

### Test These Viewports

| Device | Width | Expected Layout |
|--------|-------|----------------|
| **iPhone SE** | 375px | Single-column vendor list, stacked analytics |
| **iPad** | 768px | 2-column vendor grid, 2-column analytics |
| **Desktop** | 1440px | 3-column vendor grid, 3-column analytics |

**How to Test**:
- Select device preset (e.g., "iPhone SE")
- Navigate through app: Home → Vendor Analytics → Overall Analytics → Settings
- Verify no horizontal scrolling
- Check that touch targets are ≥44x44px on mobile

---

## Testing Upload Progress (Step 4)

### Simulate Slow Network

**Chrome DevTools**:
1. Open DevTools → Network tab
2. Throttling dropdown → Select "Slow 3G"
3. Upload an invoice
4. Observe 4 progress stages:
   - "Uploading..." with percentage bar
   - "Reading invoice (OCR)..." with spinner
   - "Extracting data..." with spinner
   - "Saving..." with spinner
   - Success snackbar with vendor name

**Reset**: Throttling → "No throttling"

---

## Testing Auth Inline Validation (Step 8)

### Test Scenarios

1. **Invalid Email**:
   - Enter: `notanemail` → **Expected**: Inline error "Please enter a valid email address"
   - Enter: `test@example.com` → **Expected**: Error clears

2. **Weak Password**:
   - Enter: `abc123` → **Expected**: Inline error "Password must be at least 8 characters"
   - Enter: `SecurePass123!` → **Expected**: Error clears

3. **Submit Button State**:
   - With errors → **Expected**: Button disabled
   - No errors → **Expected**: Button enabled

4. **Backend Errors**:
   - Register with existing email → **Expected**: "An account with this email already exists"
   - Login with wrong password → **Expected**: "Invalid email or password"

---

## Testing OCR Robustness (Step 2)

### Test with Poor Quality Invoices

**Sample Invoice Types**:
- Low resolution image (< 72 DPI)
- Skewed/rotated photo
- Partially blurred text
- Mixed Hebrew/English

**Expected Behavior** (with `OCR_DEBUG=true`):
1. Backend logs show multiple PSM attempts: `[OCR] Trying PSM 6...`
2. Scoring for each PSM: `[OCR] PSM 6 score: 45.3`
3. Chosen best mode: `[OCR] Selected PSM 4 (score: 67.8)`
4. Text preview: `[OCR] Top 50 chars: "חשבונית Creative Software..."`
5. Invoice saved (even if partially incomplete)

**Check Backend Logs**:
```bash
tail -f backend/logs/combined.log | grep OCR
```

---

## Testing LLM Extraction Fallback (Step 3)

### Trigger Low Confidence Extraction

**Test Cases**:
1. **Missing Vendor**: Upload invoice with unclear vendor name
   - **Expected**: Invoice saved with `vendorName: "Unknown Vendor"`, `needsReview: true`
   - **Expected Warning**: "Vendor name could not be extracted"

2. **Missing Amount**: Upload invoice with unclear total
   - **Expected**: Invoice saved with `totalAmount: 0`, `needsReview: true`
   - **Expected Warning**: "Amount could not be extracted"

3. **Low Confidence**: Upload invoice that barely passes OCR
   - **Expected**: Invoice saved, `needsReview: true`
   - **Expected Warning**: "Low confidence extraction - please review"

**Verify in Database**:
```sql
SELECT id, "needsReview", "originalAmount"
FROM invoices
WHERE "needsReview" = true
ORDER BY "createdAt" DESC
LIMIT 5;
```

**Check ExtractionRun Table**:
```sql
SELECT "invoiceId", "ocrText", "llmResponse"
FROM extraction_runs
WHERE "invoiceId" = 'YOUR_INVOICE_ID';
```

Raw OCR text and LLM response should be persisted even if extraction failed.

---

## Testing Analytics Performance (Step 5 & 6)

### Measure Load Time

1. **Open Browser Console**: F12
2. **Navigate to Vendor Analytics**: Click a vendor card
3. **Check Timing Logs**:
   ```
   [TIMING] analytics.fetch 1250ms
   [TIMING] analytics.render 180ms
   ```

**Success Criteria**: Total time < 2 seconds

### Verify No Type Errors

**Console should show ZERO errors like**:
- ❌ `TypeError: type 'String' is not a subtype of type 'num'`
- ❌ `FormatException: Invalid number`

**If you see type errors**:
1. Check backend response: DevTools → Network → `/analytics/vendor/:id` → Preview
2. Verify all numeric fields are numbers (not quoted strings)
3. Frontend should handle both gracefully (defensive parsing)

---

## Testing Vendor Analytics Tab Removal (Step 7)

### Verify UI Changes

1. **Open Vendor Analytics**: Click any vendor card
2. **Expected**: Single view with KPIs + charts (NO tabs)
3. **NOT Present**: "Analytics" / "Invoices" tab bar
4. **How to Access Invoices**: 
   - Go to Home screen
   - Expand vendor card (click chevron)
   - See latest 5 invoices
   - Click "View All XX Invoices" → Navigate to main Invoices list

---

## Debugging Tips

### Backend Timing Logs Format

```json
{
  "type": "TIMING",
  "operation": "extraction.ocr",
  "duration": 8500,
  "timestamp": "2026-01-20T10:15:30.123Z"
}
```

**Parse with `jq`** (if installed):
```bash
cat backend/logs/combined.log | grep TIMING | jq '.operation, .duration'
```

### Frontend Timing Logs

**Browser Console**:
```
[TIMING] upload.request 15200ms
[TIMING] analytics.fetch 1100ms
```

### Common Issues

| Issue | Debug Steps |
|-------|-------------|
| **OCR always fails** | 1. Check Tesseract is installed: `tesseract --version`<br>2. Verify language packs: `tesseract --list-langs` (should show `heb`, `eng`)<br>3. Enable `OCR_DEBUG=true` |
| **Type errors in analytics** | 1. Check backend response in DevTools Network tab<br>2. Verify `Number(decimal)` conversion in analytics service<br>3. Ensure frontend defensive parsing is applied |
| **Upload shows no progress** | 1. Check `UploadProgress` state updates in Flutter DevTools<br>2. Verify `uploadStateProvider` is being watched<br>3. Check network throttling isn't hiding stages |
| **Inline validation not working** | 1. Check validator functions return `null` for valid input<br>2. Verify `onChanged` callback is setting state<br>3. Check submit button `onPressed` checks `_emailError == null` |

---

## Data Reset (For Testing)

### Reset All Invoices
```sql
-- WARNING: Deletes all invoices for tenant
DELETE FROM invoices WHERE "tenantId" = 'YOUR_USER_ID';
```

### Reset Single Vendor
```sql
-- Delete vendor and cascade invoices
DELETE FROM vendors WHERE id = 'VENDOR_ID' AND "tenantId" = 'YOUR_USER_ID';
```

### Clear Analytics Cache (if implemented)
```sql
-- Clear in-memory cache (backend restart)
-- OR delete Redis keys (if using Redis)
```

---

## Performance Benchmarks (Version 002 Targets)

| Operation | Target | How to Measure |
|-----------|--------|----------------|
| **Invoice Upload (total)** | <30s | Browser Network tab (request start → response received) |
| **OCR Processing** | <15s | Backend timing log: `extraction.ocr` |
| **LLM Extraction** | <10s | Backend timing log: `extraction.llm` |
| **Vendor Analytics Load** | <2s | Frontend timing log: `analytics.fetch` + `analytics.render` |
| **Overall Analytics Load** | <2s | Frontend timing log: `analytics.fetch` + `analytics.render` |
| **Auth Inline Validation** | <200ms | Time from blur to error display (should be instant) |

---

## Next Steps

After local testing passes:
1. ✅ **Verify all acceptance criteria** from `spec.md`
2. ✅ **Run linter**: `npm run lint` (backend), `flutter analyze` (frontend)
3. ✅ **Run tests**: `npm test` (backend), `flutter test` (frontend)
4. ✅ **Check compliance**: Use checklist in `spec.md` (Validation & Acceptance section)
5. ✅ **Document findings**: Update `TEST_RESULTS.md` with actual timings

---

## Related Documents

- **Full Setup**: `../001-invoiceme-mvp/RUNBOOK.md`
- **Implementation Plan**: `plan.md`
- **Research Decisions**: `research.md`
- **API Contracts**: `contracts/*.yaml`
- **Data Model**: `data-model.md`
