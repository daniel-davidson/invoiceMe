# Data Model: InvoiceMe Stabilization (Version 002)

**Date**: 2026-01-20  
**Scope**: Existing schema validation for stabilization requirements  
**Schema Changes**: **NONE** - All stabilization work uses existing fields

---

## Schema Overview

The existing Prisma schema (Version 001) already contains all fields required for stabilization. This document confirms field usage for new features (observability, upload reliability, responsive UI).

---

## Entities

### 1. User (Tenant)

**Purpose**: Authenticated user representing a tenant in B2C multi-tenancy model

```prisma
model User {
  id                 String    @id @default(uuid())
  email              String    @unique
  fullName           String
  personalBusinessId String?
  systemCurrency     String    @default("USD")  // ISO 4217
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  // Relations
  vendors   Vendor[]
  invoices  Invoice[]
  insights  Insight[]
}
```

**Stabilization Notes**:
- `systemCurrency`: Used for analytics aggregation (normalize all amounts)
- No changes required

---

### 2. Vendor (Business)

**Purpose**: Supplier/merchant where money was spent

```prisma
model Vendor {
  id           String    @id @default(uuid())
  tenantId     String    // FK to User.id
  name         String
  displayOrder Int       @default(0)
  monthlyLimit Decimal   @db.Decimal(15, 2)  // ❗ REQUIRED (v2.0), must be > 0
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Relations
  user     User      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoices Invoice[]

  @@unique([tenantId, name])
  @@index([tenantId])
  @@index([tenantId, displayOrder])
}
```

**Stabilization Notes (v2.0)**:
- **`monthlyLimit`**: ✅ **Made required (non-nullable)**
  - Backend validates: must be provided + must be > 0
  - Frontend enforces: input field required, Save button disabled until valid
  - Default value: None (user must explicitly set)
- Analytics KPIs depend on this field (remaining balance calculation)
- `displayOrder`: Used for vendor card ordering on home screen

---

### 3. Invoice

**Purpose**: Financial document with extracted data

```prisma
model Invoice {
  id               String    @id @default(uuid())
  tenantId         String    // FK to User.id
  vendorId         String?   // FK to Vendor.id (nullable until user assigns - v2.0)
  name             String?   // User-editable name
  originalAmount   Decimal   @db.Decimal(15, 2)
  originalCurrency String    // ISO 4217
  normalizedAmount Decimal?  @db.Decimal(15, 2)  // In system currency
  fxRate           Decimal?  @db.Decimal(15, 6)
  fxDate           DateTime?
  invoiceDate      DateTime
  invoiceNumber    String?
  fileUrl          String    // Path to stored file
  fileHash         String?   // SHA-256 hash for dedupe (v2.0)
  useItemsTotal    Boolean   @default(true)  // Use items sum for total (v2.0)
  needsReview      Boolean   @default(false)  // ✅ CRITICAL for Step 3 (LLM fallback)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Relations
  user           User            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  vendor         Vendor?         @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  extractionRuns ExtractionRun[]
  items          InvoiceItem[]   // Line items (v2.0)

  @@unique([tenantId, fileHash])  // Dedupe constraint (v2.0)
  @@index([tenantId])
  @@index([tenantId, vendorId])
  @@index([tenantId, invoiceDate])
  @@index([tenantId, fileHash])  // Dedupe index (v2.0)
}
```

**Stabilization Notes (v2.0)**:
- **`vendorId`**: ✅ **Made nullable**
  - Set to `null` on upload (never auto-created)
  - User assigns via post-upload modal or Edit Invoice Screen
  - If null: `needsReview` MUST be true
- **`needsReview`**: ✅ **Always true when vendorId is null**
- **`fileHash`**: ✅ **Added for dedupe (v2.0)**
  - SHA-256 hash of uploaded file
  - Unique constraint prevents duplicate uploads per tenant
- **`useItemsTotal`**: ✅ **Added for items sum toggle (v2.0)**
  - Default true: totalAmount calculated from items
  - False: manual totalAmount entry
- Backend validates: `(vendorId != null) OR (needsReview == true)`

---

### 4. ExtractionRun

**Purpose**: Audit trail for OCR + LLM processing

```prisma
model ExtractionRun {
  id              String            @id @default(uuid())
  tenantId        String            // FK to User.id
  invoiceId       String            // FK to Invoice.id
  status          ExtractionStatus  @default(PENDING)
  ocrText         String?           @db.Text  // ✅ CRITICAL for Step 2 (OCR robustness)
  llmResponse     Json?             // ✅ CRITICAL for Step 3 (LLM fallback)
  errorMessage    String?
  processingTimeMs Int?             // ✅ OPTIONAL for Step 1 (observability)
  createdAt       DateTime          @default(now())

  // Relations
  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([invoiceId])
}

enum ExtractionStatus {
  PENDING
  OCR_COMPLETE
  LLM_COMPLETE
  VALIDATION_FAILED
  SUCCESS
  ERROR
}
```

**Stabilization Notes**:
- **`ocrText`**: ✅ **Used in Step 2 (OCR Robustness)**
  - Stores best OCR result (after multi-PSM scoring)
  - Preserved even if LLM extraction fails (for manual review)
- **`llmResponse`**: ✅ **Used in Step 3 (LLM Fallback)**
  - Stores raw LLM JSON (even if validation fails)
  - Contains confidence score, extracted fields, warnings
- **`processingTimeMs`**: ✅ **Optional for Step 1 (Observability)**
  - Could store total processing time (if backend tracks it)
  - Currently not used in plan (manual timing logs sufficient)
- **`status`**: Tracks pipeline stage (PENDING → OCR_COMPLETE → LLM_COMPLETE → SUCCESS/ERROR)
- **`errorMessage`**: Stores specific error for debugging
- No changes required

**Example llmResponse JSON**:
```json
{
  "vendorName": "Creative Software",
  "totalAmount": 70.00,
  "currency": "USD",
  "invoiceDate": "2026-01-15",
  "confidence": 0.85,
  "warnings": [],
  "lineItems": [
    {"description": "Software License", "amount": 70.00}
  ]
}
```

---

### 5. Insight

**Purpose**: AI-generated spending insights

```prisma
model Insight {
  id             String      @id @default(uuid())
  tenantId       String      // FK to User.id
  insightType    InsightType
  title          String
  content        String      @db.Text
  relatedMetrics Json        // Metrics used to generate insight
  generatedAt    DateTime    @default(now())
  createdAt      DateTime    @default(now())

  // Relations
  user User @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, generatedAt])
}

enum InsightType {
  MONTHLY_NARRATIVE
  RECURRING_CHARGES
  ANOMALIES
}
```

**Stabilization Notes**:
- No changes required for stabilization
- Out of scope for Version 002 (AI insights are P3 feature)

---

### 6. FxRateCache

**Purpose**: Cache currency exchange rates

```prisma
model FxRateCache {
  id           String   @id @default(uuid())
  baseCurrency String   // ISO 4217
  rates        Json     // { "USD": 1.0, "EUR": 0.92, ... }
  fetchedAt    DateTime @default(now())
  expiresAt    DateTime

  @@unique([baseCurrency])
}
```

**Stabilization Notes**:
- No changes required
- Used by currency conversion service (already implemented)

---

## Field Usage Summary for Stabilization

| Field | Table | Stabilization Step | Usage |
|-------|-------|-------------------|-------|
| `needsReview` | Invoice | Step 3 (LLM Fallback) | Flag invoices with low confidence for manual review |
| `ocrText` | ExtractionRun | Step 2 (OCR Robustness) | Store best OCR result (multi-PSM + scoring) |
| `llmResponse` | ExtractionRun | Step 3 (LLM Fallback) | Store raw LLM JSON (even if validation fails) |
| `normalizedAmount` | Invoice | Step 5 (Analytics Aggregation) | Backend aggregates using this field |
| `systemCurrency` | User | Step 5 (Analytics Aggregation) | Normalize all amounts for aggregation |
| `monthlyLimit` | Vendor | Step 5 (Analytics KPIs) | Calculate remaining balance |

---

## Validation Rules (No Schema Changes)

### Invoice Validation

**Required Fields** (enforced in code, not schema):
- `vendorId`: Must reference existing vendor
- `originalAmount`: Must be > 0
- `originalCurrency`: Must be valid ISO 4217 code
- `invoiceDate`: Must be valid date

**Optional Fields** (graceful degradation):
- `name`: Defaults to vendor name + date if missing
- `normalizedAmount`: Calculated if currency differs from systemCurrency
- `invoiceNumber`: User can manually add later

### ExtractionRun Validation

**Optional Fields** (never required):
- `ocrText`: May be null if OCR completely fails (edge case)
- `llmResponse`: May be null if LLM times out or errors
- `errorMessage`: Populated only on failure

---

## Migration Status

**Version 001 → Version 002**: ✅ **No migrations required**

All fields needed for stabilization already exist in the schema. No `prisma migrate` commands needed.

---

## Data Integrity Notes

### Multi-Tenancy Enforcement

**Critical for all queries**:
```typescript
// CORRECT: Always filter by tenantId
await prisma.invoice.findMany({
  where: { tenantId: currentUser.id },  // ✅ Required
});

// WRONG: Missing tenantId filter (security risk)
await prisma.invoice.findMany({});  // ❌ Forbidden
```

### Cascade Deletes

**Configured in schema**:
- Delete User → Cascade deletes Vendors, Invoices, Insights
- Delete Vendor → Cascade deletes Invoices (POC behavior)
- Delete Invoice → Cascade deletes ExtractionRuns

**Impact on stabilization**:
- None (cascade behavior unchanged)

---

## Indexing Performance

**Existing indexes support analytics queries**:
- `Invoice.tenantId, invoiceDate`: Fast date-range queries (monthly aggregations)
- `Invoice.tenantId, vendorId`: Fast vendor-specific queries
- `Vendor.tenantId, displayOrder`: Fast vendor list ordering

**No new indexes needed for stabilization**.

---

## Type Safety (Prisma → Backend → Frontend)

### Decimal Handling

**Prisma Type**: `Decimal` (precise numeric type)  
**Backend Conversion**: `Number(decimal)` → TypeScript `number`  
**Frontend Expectation**: `double` (Dart)

**Example**:
```typescript
// Backend DTO
export class VendorKpisDto {
  @IsNumber()
  currentMonthSpend: number;  // NOT Decimal

  @IsOptional()
  @IsNumber()
  monthlyLimit: number | null;
}

// Conversion in service
return {
  currentMonthSpend: Number(aggregateResult._sum.normalizedAmount || 0),
  monthlyLimit: vendor.monthlyLimit ? Number(vendor.monthlyLimit) : null,
};
```

**Frontend Defensive Parsing** (Step 6):
```dart
static double _parseDouble(dynamic value) {
  if (value is num) return value.toDouble();  // Handles both int and double
  if (value is String) return double.tryParse(value) ?? 0.0;  // Fallback for string
  return 0.0;  // Default for null/unexpected
}
```

---

## Next Steps

1. ✅ **Data model confirmed**: No schema changes needed
2. **Update API contracts**: Ensure DTOs return `number` (not Decimal strings)
3. **Update quickstart.md**: Document existing schema for new developers
4. **Generate tasks.md**: Break down implementation steps
