# Baseline Performance Metrics (Version 002)

**Purpose**: Document baseline performance metrics for invoice upload and analytics queries  
**Created**: 2026-01-20  
**Status**: BASELINE - Use for comparison after performance optimizations

---

## Observability Implementation

**Status**: ✅ Timing logs added to all critical paths

### Backend Logging (Added)

- **PDF Processor**: `[PdfProcessorService] PDF conversion took Xms`, `Extracted X characters of text from PDF in Xms`
- **OCR Service**: Multi-pass OCR with timing for each PSM mode + total duration
- **LLM Extraction**: `[OllamaService] LLM extraction took Xms (LLM: Xms, parsing/validation: Xms)`
- **Database Save**: `[ExtractionService] DB save took Xms`
- **Analytics Queries**: 
  - `[AnalyticsService] Vendor analytics query took Xms`
  - `[AnalyticsService] Overall analytics query took Xms`

### Frontend Logging (Added)

- **Upload Flow**: `[HomeProvider] Upload took Xms total (request: Xms, reload: Xms)`
- Logs: upload start, request sent, response received, render complete

---

## Baseline Metrics (TO BE RECORDED)

**Instructions**: Run 3 sample uploads and record timings from backend + frontend logs

### Test Case 1: Hebrew Invoice (Image)

**File**: [Hebrew invoice image file name]  
**Size**: [File size in KB/MB]  
**Date Tested**: [YYYY-MM-DD]

#### Backend Breakdown
- **PDF Conversion**: N/A (image file)
- **OCR Processing**: 
  - PSM 6: [X]ms
  - PSM 4: [X]ms
  - PSM 11: [X]ms
  - PSM 3: [X]ms
  - PSM 12: [X]ms
  - **Best PSM Selected**: [PSM #] (score=[X], conf=[X]%)
  - **Total OCR**: [X]ms
- **LLM Extraction**: 
  - LLM request: [X]ms
  - Parsing/validation: [X]ms
  - **Total LLM**: [X]ms
- **DB Save**: [X]ms
- **Total Backend**: [X]ms

#### Frontend Breakdown
- **Request duration**: [X]ms
- **Reload duration**: [X]ms
- **Total Frontend**: [X]ms

#### Extraction Results
- **Vendor Name**: [Extracted name] (confidence: [X])
- **Total Amount**: [Amount] [Currency] (confidence: [X])
- **Invoice Date**: [Date] (confidence: [X])
- **Needs Review**: [true/false]
- **Warnings**: [List of warnings if any]

---

### Test Case 2: English Invoice (PDF with selectable text)

**File**: [English PDF file name]  
**Size**: [File size in KB/MB]  
**Date Tested**: [YYYY-MM-DD]

#### Backend Breakdown
- **PDF Text Extraction**: [X]ms (selectable text found)
- **OCR Processing**: N/A (skipped due to selectable text)
- **LLM Extraction**: 
  - LLM request: [X]ms
  - Parsing/validation: [X]ms
  - **Total LLM**: [X]ms
- **DB Save**: [X]ms
- **Total Backend**: [X]ms

#### Frontend Breakdown
- **Request duration**: [X]ms
- **Reload duration**: [X]ms
- **Total Frontend**: [X]ms

#### Extraction Results
- **Vendor Name**: [Extracted name] (confidence: [X])
- **Total Amount**: [Amount] [Currency] (confidence: [X])
- **Invoice Date**: [Date] (confidence: [X])
- **Needs Review**: [true/false]
- **Warnings**: [List of warnings if any]

---

### Test Case 3: Hebrew Invoice (PDF requiring OCR)

**File**: [Hebrew PDF file name]  
**Size**: [File size in KB/MB]  
**Date Tested**: [YYYY-MM-DD]

#### Backend Breakdown
- **PDF Text Extraction**: [X]ms (insufficient text, OCR needed)
- **OCR Processing**: 
  - PSM 6: [X]ms
  - PSM 4: [X]ms
  - PSM 11: [X]ms
  - PSM 3: [X]ms
  - PSM 12: [X]ms
  - **Best PSM Selected**: [PSM #] (score=[X], conf=[X]%)
  - **Total OCR**: [X]ms
- **LLM Extraction**: 
  - LLM request: [X]ms
  - Parsing/validation: [X]ms
  - **Total LLM**: [X]ms
- **DB Save**: [X]ms
- **Total Backend**: [X]ms

#### Frontend Breakdown
- **Request duration**: [X]ms
- **Reload duration**: [X]ms
- **Total Frontend**: [X]ms

#### Extraction Results
- **Vendor Name**: [Extracted name] (confidence: [X])
- **Total Amount**: [Amount] [Currency] (confidence: [X])
- **Invoice Date**: [Date] (confidence: [X])
- **Needs Review**: [true/false]
- **Warnings**: [List of warnings if any]

---

## Analytics Performance Baseline

**Instructions**: Open analytics screens and record query times from logs

### Vendor Analytics (Single Business)

**Test Conditions**:
- **Vendor ID**: [Vendor with significant invoice history]
- **Invoice Count**: [Number of invoices for this vendor]
- **Date Tested**: [YYYY-MM-DD]

**Query Duration**: [X]ms (from `[AnalyticsService] Vendor analytics query took Xms`)

**Breakdown**:
- Current month spend: [query time if logged separately]
- Monthly average (12 months): [query time if logged separately]
- Yearly average: [query time if logged separately]
- Line chart data (12 months): [query time if logged separately]

---

### Overall Analytics (All Businesses)

**Test Conditions**:
- **Total Vendors**: [Number of vendors]
- **Total Invoices**: [Number of invoices]
- **Date Tested**: [YYYY-MM-DD]

**Query Duration**: [X]ms (from `[AnalyticsService] Overall analytics query took Xms`)

**Breakdown**:
- Total spend calculation: [query time if logged separately]
- Top 5 vendors aggregation: [query time if logged separately]
- Line chart data (12 months): [query time if logged separately]

---

## Bottleneck Identification

**Based on baseline metrics above, identify bottlenecks:**

### Upload Pipeline
1. **Slowest Component**: [OCR/LLM/DB/Other] ([X]ms avg)
2. **Second Slowest**: [Component] ([X]ms avg)
3. **Optimization Target**: [Which component to optimize first]

### Analytics Queries
1. **Vendor Analytics**: [Fast/Acceptable/Slow] ([X]ms avg)
2. **Overall Analytics**: [Fast/Acceptable/Slow] ([X]ms avg)
3. **Optimization Target**: [Which query to optimize first]

---

## Performance Goals (Post-Optimization)

**Target Improvements**:

### Upload Pipeline
- **Current Avg Total**: [X]ms
- **Target Total**: [<15000ms for typical invoice]
- **Critical Components**:
  - OCR: Target <8000ms (currently [X]ms)
  - LLM: Target <5000ms (currently [X]ms)
  - DB: Target <100ms (currently [X]ms)

### Analytics Queries
- **Vendor Analytics**: Target <2000ms (currently [X]ms)
- **Overall Analytics**: Target <2000ms (currently [X]ms)

---

## Testing Procedure

**To Record Baseline Metrics**:

1. **Start Backend**: `cd backend && npm run start:dev`
2. **Start Frontend**: `cd frontend && flutter run -d chrome`
3. **Prepare Test Files**: 
   - Hebrew invoice image (.jpg/.png)
   - English invoice PDF (with selectable text)
   - Hebrew invoice PDF (scanned, requires OCR)
4. **Upload Each File**: Monitor console logs (backend + frontend)
5. **Record Timings**: Copy timing logs to this document
6. **Test Analytics**: Navigate to analytics screens, record query times
7. **Update Document**: Fill in all [X] placeholders with actual measurements

---

## Notes

- All timings should be measured on the same machine/environment for consistency
- Run each test 2-3 times and use average values
- Document any anomalies or unusual conditions
- This baseline is used to measure impact of future optimizations

---

**Status**: ⏳ Observability added, awaiting baseline measurements
