# Data Model: InvoiceMe MVP

**Branch**: `001-invoiceme-mvp` | **Date**: 2026-01-18

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      User       │       │     Vendor      │       │     Invoice     │
│    (Profile)    │       │   (Business)    │       │                 │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │──┐    │ id (PK)         │
│ email           │  │    │ tenantId (FK)   │◄─┼────│ tenantId (FK)   │
│ fullName        │  │    │ name            │  │    │ vendorId (FK)   │──┐
│ personalBusinessId│ │    │ displayOrder    │  │    │ name            │  │
│ systemCurrency  │  │    │ monthlyLimit    │  │    │ originalAmount  │  │
│ createdAt       │  │    │ createdAt       │  │    │ originalCurrency│  │
│ updatedAt       │  │    │ updatedAt       │  │    │ normalizedAmount│  │
└─────────────────┘  │    └─────────────────┘  │    │ fxRate          │  │
                     │            ▲             │    │ fxDate          │  │
                     │            │             │    │ invoiceDate     │  │
                     │            │             │    │ fileUrl         │  │
                     │            │             │    │ needsReview     │  │
                     │            │             │    │ createdAt       │  │
                     │            └─────────────┼────│ updatedAt       │  │
                     │                          │    └─────────────────┘  │
                     │                          │             │           │
                     │                          │             ▼           │
                     │                          │    ┌─────────────────┐  │
                     │                          │    │ ExtractionRun   │  │
                     │                          │    ├─────────────────┤  │
                     │                          │    │ id (PK)         │  │
                     │                          └────│ tenantId (FK)   │  │
                     │                               │ invoiceId (FK)  │◄─┘
                     │                               │ status          │
                     │                               │ ocrText         │
                     │                               │ llmResponse     │
                     │                               │ errorMessage    │
                     │                               │ processingTimeMs│
                     │                               │ createdAt       │
                     │                               └─────────────────┘
                     │
                     │    ┌─────────────────┐       ┌─────────────────┐
                     │    │     Insight     │       │   FxRateCache   │
                     │    ├─────────────────┤       ├─────────────────┤
                     └────│ tenantId (FK)   │       │ id (PK)         │
                          │ id (PK)         │       │ baseCurrency    │
                          │ insightType     │       │ rates (JSON)    │
                          │ title           │       │ fetchedAt       │
                          │ content         │       │ expiresAt       │
                          │ relatedMetrics  │       └─────────────────┘
                          │ generatedAt     │
                          │ createdAt       │
                          └─────────────────┘
```

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// User / Profile (synced from Supabase Auth)
// ============================================================================
model User {
  id                 String    @id @default(uuid())
  email              String    @unique
  fullName           String
  personalBusinessId String?
  systemCurrency     String    @default("USD") // ISO 4217
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  // Relations
  vendors   Vendor[]
  invoices  Invoice[]
  insights  Insight[]

  @@map("users")
}

// ============================================================================
// Vendor (Business) - where money was spent
// ============================================================================
model Vendor {
  id           String    @id @default(uuid())
  tenantId     String    // FK to User.id
  name         String
  displayOrder Int       @default(0)
  monthlyLimit Decimal?  @db.Decimal(15, 2)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Relations
  user     User      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoices Invoice[]

  @@unique([tenantId, name]) // Vendor names unique per tenant
  @@index([tenantId])
  @@index([tenantId, displayOrder])
  @@map("vendors")
}

// ============================================================================
// Invoice
// ============================================================================
model Invoice {
  id               String    @id @default(uuid())
  tenantId         String    // FK to User.id
  vendorId         String    // FK to Vendor.id
  name             String?   // User-editable name
  originalAmount   Decimal   @db.Decimal(15, 2)
  originalCurrency String    // ISO 4217
  normalizedAmount Decimal?  @db.Decimal(15, 2) // In system currency
  fxRate           Decimal?  @db.Decimal(15, 6)
  fxDate           DateTime?
  invoiceDate      DateTime
  invoiceNumber    String?
  fileUrl          String    // Path to stored file
  needsReview      Boolean   @default(false)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Relations
  user           User            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  vendor         Vendor          @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  extractionRuns ExtractionRun[]

  @@index([tenantId])
  @@index([tenantId, vendorId])
  @@index([tenantId, invoiceDate])
  @@map("invoices")
}

// ============================================================================
// Extraction Run - tracks OCR/LLM processing
// ============================================================================
model ExtractionRun {
  id              String            @id @default(uuid())
  tenantId        String            // FK to User.id
  invoiceId       String            // FK to Invoice.id
  status          ExtractionStatus  @default(PENDING)
  ocrText         String?           @db.Text
  llmResponse     Json?             // Raw LLM JSON response
  errorMessage    String?
  processingTimeMs Int?
  createdAt       DateTime          @default(now())

  // Relations
  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([invoiceId])
  @@map("extraction_runs")
}

enum ExtractionStatus {
  PENDING
  OCR_COMPLETE
  LLM_COMPLETE
  VALIDATION_FAILED
  SUCCESS
  ERROR
}

// ============================================================================
// Insight - AI-generated spending insights
// ============================================================================
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
  @@map("insights")
}

enum InsightType {
  MONTHLY_NARRATIVE
  RECURRING_CHARGES
  ANOMALIES
}

// ============================================================================
// FX Rate Cache (optional - can use in-memory instead)
// ============================================================================
model FxRateCache {
  id           String   @id @default(uuid())
  baseCurrency String   // ISO 4217
  rates        Json     // { "USD": 1.0, "EUR": 0.92, ... }
  fetchedAt    DateTime @default(now())
  expiresAt    DateTime

  @@unique([baseCurrency])
  @@map("fx_rate_cache")
}
```

---

## Entity Definitions

### User (Profile)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key, matches Supabase Auth `sub` |
| `email` | String | Yes | User email (from Supabase) |
| `fullName` | String | Yes | Display name |
| `personalBusinessId` | String | No | Tax ID or business number |
| `systemCurrency` | String | Yes | Default display currency (ISO 4217) |
| `createdAt` | DateTime | Yes | Record creation timestamp |
| `updatedAt` | DateTime | Yes | Last update timestamp |

**Validation Rules**:
- `email`: Valid email format, unique
- `systemCurrency`: Valid ISO 4217 code (e.g., USD, EUR, ILS)

---

### Vendor (Business)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `tenantId` | UUID | Yes | FK to User (tenant isolation) |
| `name` | String | Yes | Vendor display name |
| `displayOrder` | Int | Yes | Order in UI list (drag-drop) |
| `monthlyLimit` | Decimal | No | Spending limit for alerts |
| `createdAt` | DateTime | Yes | Record creation timestamp |
| `updatedAt` | DateTime | Yes | Last update timestamp |

**Validation Rules**:
- `name`: 1-200 characters, unique per tenant
- `displayOrder`: >= 0
- `monthlyLimit`: > 0 if set

**Cascade Behavior**:
- DELETE vendor → DELETE all related invoices (POC behavior)

---

### Invoice

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `tenantId` | UUID | Yes | FK to User (tenant isolation) |
| `vendorId` | UUID | Yes | FK to Vendor |
| `name` | String | No | User-editable invoice name |
| `originalAmount` | Decimal | Yes | Amount as extracted |
| `originalCurrency` | String | Yes | Currency as extracted (ISO 4217) |
| `normalizedAmount` | Decimal | No | Amount in system currency |
| `fxRate` | Decimal | No | Exchange rate used |
| `fxDate` | DateTime | No | Date of exchange rate |
| `invoiceDate` | DateTime | Yes | Date on invoice |
| `invoiceNumber` | String | No | Invoice reference number |
| `fileUrl` | String | Yes | Path to stored file |
| `needsReview` | Boolean | Yes | Flag for low-confidence extraction |
| `createdAt` | DateTime | Yes | Record creation timestamp |
| `updatedAt` | DateTime | Yes | Last update timestamp |

**Validation Rules**:
- `originalAmount`: > 0
- `originalCurrency`: Valid ISO 4217 code
- `invoiceDate`: Not in future
- `fileUrl`: Valid path format

---

### ExtractionRun

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `tenantId` | UUID | Yes | FK to User (for isolation) |
| `invoiceId` | UUID | Yes | FK to Invoice |
| `status` | Enum | Yes | Processing status |
| `ocrText` | Text | No | Raw OCR output |
| `llmResponse` | JSON | No | Raw LLM extraction result |
| `errorMessage` | String | No | Error details if failed |
| `processingTimeMs` | Int | No | Processing duration |
| `createdAt` | DateTime | Yes | Record creation timestamp |

**Status Enum**:
- `PENDING` - Upload received, not processed
- `OCR_COMPLETE` - OCR finished, awaiting LLM
- `LLM_COMPLETE` - LLM finished, awaiting validation
- `VALIDATION_FAILED` - Validation issues found
- `SUCCESS` - Fully processed
- `ERROR` - Processing failed

---

### Insight

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `tenantId` | UUID | Yes | FK to User (tenant isolation) |
| `insightType` | Enum | Yes | Type of insight |
| `title` | String | Yes | Short display title |
| `content` | Text | Yes | LLM-generated narrative |
| `relatedMetrics` | JSON | Yes | SQL-computed metrics used |
| `generatedAt` | DateTime | Yes | When insight was generated |
| `createdAt` | DateTime | Yes | Record creation timestamp |

**InsightType Enum**:
- `MONTHLY_NARRATIVE` - Month-over-month analysis
- `RECURRING_CHARGES` - Detected subscriptions
- `ANOMALIES` - Duplicates, spikes, mismatches

---

### FxRateCache (Optional)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `baseCurrency` | String | Yes | Base currency code |
| `rates` | JSON | Yes | Exchange rates map |
| `fetchedAt` | DateTime | Yes | When rates were fetched |
| `expiresAt` | DateTime | Yes | Cache expiration time |

**Note**: This table is optional. For POC, in-memory cache is preferred. Database cache can be used if persistence across restarts is needed.

---

## Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `vendors` | `tenantId` | Tenant isolation queries |
| `vendors` | `tenantId, displayOrder` | Ordered list retrieval |
| `invoices` | `tenantId` | Tenant isolation queries |
| `invoices` | `tenantId, vendorId` | Vendor-specific lists |
| `invoices` | `tenantId, invoiceDate` | Date-based queries/grouping |
| `extraction_runs` | `tenantId` | Tenant isolation |
| `extraction_runs` | `invoiceId` | Invoice lookup |
| `insights` | `tenantId` | Tenant isolation |
| `insights` | `tenantId, generatedAt` | Recent insights |

---

## Multi-Tenancy Enforcement

**Every query MUST include `tenantId` in WHERE clause:**

```typescript
// ✅ CORRECT
const vendors = await prisma.vendor.findMany({
  where: { tenantId: request.tenantId }
});

// ❌ WRONG - Missing tenant filter
const vendors = await prisma.vendor.findMany();
```

**Prisma Middleware for Safety:**

```typescript
// prisma/middleware/tenant-scope.ts
prisma.$use(async (params, next) => {
  const tenantScopedModels = ['Vendor', 'Invoice', 'ExtractionRun', 'Insight'];
  
  if (tenantScopedModels.includes(params.model)) {
    if (!params.args.where?.tenantId) {
      throw new Error(`Query on ${params.model} missing tenantId`);
    }
  }
  
  return next(params);
});
```
