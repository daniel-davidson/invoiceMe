# Data Model: InvoiceMe MVP (Version 002)

**Version**: 2.0  
**Date**: 2026-01-20  
**Status**: AUTHORITATIVE - Database schema MUST match this model

---

## Overview

This document defines the complete database schema for InvoiceMe MVP, including all tables, fields, relationships, indexes, and constraints.

**Technology**: PostgreSQL + Prisma ORM

---

## Schema Definition

### User

**Purpose**: User accounts (synced from Supabase Auth)

**Fields**:
- `id` (String, PK): User UUID from Supabase
- `email` (String, unique): User email
- `fullName` (String): Full name
- `personalBusinessId` (String, nullable): Personal business ID (e.g., tax ID)
- `systemCurrency` (String, default: "USD"): ISO 4217 currency code
- `createdAt` (DateTime): Account creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Relations**:
- `vendors` (Vendor[]): User's businesses/vendors
- `invoices` (Invoice[]): User's invoices
- `insights` (Insight[]): User's AI insights

**Indexes**:
- Primary: `id`
- Unique: `email`

---

### Vendor (Business)

**Purpose**: Businesses/vendors where money was spent

**Fields**:
- `id` (String, PK): Vendor UUID
- `tenantId` (String, FK → User.id): Owner user ID
- `name` (String): Business name
- `displayOrder` (Int, default: 0): UI sort order (drag-and-drop)
- `monthlyLimit` (Decimal(15,2), nullable): Optional spending limit
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Relations**:
- `user` (User): Owner
- `invoices` (Invoice[]): Invoices from this vendor

**Indexes**:
- Primary: `id`
- Index: `tenantId`
- Index: `(tenantId, displayOrder)` (for sorted lists)

**Constraints**:
- Unique: `(tenantId, name)` - Vendor names unique per user

**Cascade Behavior**:
- DELETE User → CASCADE DELETE Vendors
- DELETE Vendor → CASCADE DELETE Invoices

---

### Invoice

**Purpose**: Individual invoices/receipts uploaded by user

**Fields**:
- `id` (String, PK): Invoice UUID
- `tenantId` (String, FK → User.id): Owner user ID
- `vendorId` (String, FK → Vendor.id): Assigned vendor
- `name` (String, nullable): User-editable display name
- `originalAmount` (Decimal(15,2)): Invoice total in original currency
- `originalCurrency` (String): ISO 4217 currency code
- `normalizedAmount` (Decimal(15,2), nullable): Total in system currency
- `fxRate` (Decimal(15,6), nullable): Exchange rate used
- `fxDate` (DateTime, nullable): Exchange rate date
- `invoiceDate` (DateTime): Invoice date from document
- `invoiceNumber` (String, nullable): Invoice number from document
- `fileUrl` (String): Storage path to original file (PDF/image)
- `fileHash` (String, nullable): SHA-256 hash for dedupe detection
- `useItemsTotal` (Boolean, default: true): **NEW** - Auto-calculate total from line items
- `needsReview` (Boolean, default: false): Requires manual review
- `createdAt` (DateTime): Upload timestamp
- `updatedAt` (DateTime): Last update timestamp

**Relations**:
- `user` (User): Owner
- `vendor` (Vendor): Assigned business
- `extractionRuns` (ExtractionRun[]): OCR/LLM processing history
- `items` (InvoiceItem[]): **NEW** - Line items

**Indexes**:
- Primary: `id`
- Index: `tenantId`
- Index: `(tenantId, vendorId)` (for vendor analytics)
- Index: `(tenantId, invoiceDate)` (for date-based queries)
- Index: `(tenantId, fileHash)` (for dedupe lookup)

**Constraints**:
- Unique: `(tenantId, fileHash)` - **NEW** - Prevent duplicate file uploads per user

**Cascade Behavior**:
- DELETE User → CASCADE DELETE Invoices
- DELETE Vendor → CASCADE DELETE Invoices
- DELETE Invoice → CASCADE DELETE InvoiceItems + ExtractionRuns

---

### InvoiceItem (NEW)

**Purpose**: Line items extracted from invoices (normalized storage)

**Fields**:
- `id` (String, PK): Item UUID
- `invoiceId` (String, FK → Invoice.id): Parent invoice
- `tenantId` (String, FK → User.id): Owner user ID (for scoping)
- `description` (String): Item description/name
- `quantity` (Decimal(10,3), nullable): Quantity (e.g., 2.5 units)
- `unitPrice` (Decimal(15,2), nullable): Price per unit
- `total` (Decimal(15,2)): Line item total amount
- `currency` (String, nullable): Currency (defaults to invoice currency if null)
- `displayOrder` (Int, default: 0): Item order in invoice
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Relations**:
- `invoice` (Invoice): Parent invoice

**Indexes**:
- Primary: `id`
- Index: `invoiceId` (for fetching items by invoice)
- Index: `tenantId` (for tenant scoping)
- Index: `(invoiceId, displayOrder)` (for ordered item lists)

**Cascade Behavior**:
- DELETE Invoice → CASCADE DELETE InvoiceItems

**Business Logic**:
- When `invoice.useItemsTotal = true`: `invoice.originalAmount` MUST equal `SUM(items.total)`
- When `invoice.useItemsTotal = false`: Items are informational only, manual total overrides
- If items exist but incomplete (e.g., missing unitPrice), set `invoice.needsReview = true`

---

### ExtractionRun

**Purpose**: Tracks OCR/LLM processing runs for invoices

**Fields**:
- `id` (String, PK): Run UUID
- `tenantId` (String, FK → User.id): Owner user ID
- `invoiceId` (String, FK → Invoice.id): Processed invoice
- `status` (ExtractionStatus): Processing status (enum)
- `ocrText` (Text, nullable): Raw OCR extracted text
- `llmResponse` (JSON, nullable): Raw LLM JSON response (includes extracted items)
- `errorMessage` (String, nullable): Error details if failed
- `processingTimeMs` (Int, nullable): Total processing time
- `createdAt` (DateTime): Run timestamp

**Relations**:
- `invoice` (Invoice): Processed invoice

**Indexes**:
- Primary: `id`
- Index: `tenantId`
- Index: `invoiceId` (for fetching extraction history)

**Enums**:
```prisma
enum ExtractionStatus {
  PENDING
  OCR_COMPLETE
  LLM_COMPLETE
  VALIDATION_FAILED
  SUCCESS
  ERROR
}
```

**Cascade Behavior**:
- DELETE Invoice → CASCADE DELETE ExtractionRuns

---

### Insight

**Purpose**: AI-generated spending insights

**Fields**:
- `id` (String, PK): Insight UUID
- `tenantId` (String, FK → User.id): Owner user ID
- `insightType` (InsightType): Type of insight (enum)
- `title` (String): Insight title
- `content` (Text): Insight content/description
- `relatedMetrics` (JSON): Metrics used to generate insight
- `generatedAt` (DateTime): Insight generation timestamp
- `createdAt` (DateTime): Creation timestamp

**Relations**:
- `user` (User): Owner

**Indexes**:
- Primary: `id`
- Index: `tenantId`
- Index: `(tenantId, generatedAt)` (for sorted insights)

**Enums**:
```prisma
enum InsightType {
  MONTHLY_NARRATIVE
  RECURRING_CHARGES
  ANOMALIES
}
```

**Cascade Behavior**:
- DELETE User → CASCADE DELETE Insights

---

### FxRateCache

**Purpose**: Cache for currency exchange rates

**Fields**:
- `id` (String, PK): Cache entry UUID
- `baseCurrency` (String): Base currency (e.g., "ILS")
- `rates` (JSON): Rate map (e.g., `{"USD": 0.27, "EUR": 0.25}`)
- `fetchedAt` (DateTime): Fetch timestamp
- `expiresAt` (DateTime): Expiry timestamp

**Indexes**:
- Primary: `id`
- Unique: `baseCurrency` (only one cache entry per base currency)

---

## Complete Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                 String    @id @default(uuid())
  email              String    @unique
  fullName           String
  personalBusinessId String?
  systemCurrency     String    @default("USD")
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  vendors   Vendor[]
  invoices  Invoice[]
  insights  Insight[]

  @@map("users")
}

model Vendor {
  id           String    @id @default(uuid())
  tenantId     String
  name         String
  displayOrder Int       @default(0)
  monthlyLimit Decimal?  @db.Decimal(15, 2)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  user     User      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoices Invoice[]

  @@unique([tenantId, name])
  @@index([tenantId])
  @@index([tenantId, displayOrder])
  @@map("vendors")
}

model Invoice {
  id               String    @id @default(uuid())
  tenantId         String
  vendorId         String
  name             String?
  originalAmount   Decimal   @db.Decimal(15, 2)
  originalCurrency String
  normalizedAmount Decimal?  @db.Decimal(15, 2)
  fxRate           Decimal?  @db.Decimal(15, 6)
  fxDate           DateTime?
  invoiceDate      DateTime
  invoiceNumber    String?
  fileUrl          String
  fileHash         String?
  useItemsTotal    Boolean   @default(true)
  needsReview      Boolean   @default(false)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  user           User            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  vendor         Vendor          @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  extractionRuns ExtractionRun[]
  items          InvoiceItem[]

  @@unique([tenantId, fileHash])
  @@index([tenantId])
  @@index([tenantId, vendorId])
  @@index([tenantId, invoiceDate])
  @@index([tenantId, fileHash])
  @@map("invoices")
}

model InvoiceItem {
  id           String    @id @default(uuid())
  invoiceId    String
  tenantId     String
  description  String
  quantity     Decimal?  @db.Decimal(10, 3)
  unitPrice    Decimal?  @db.Decimal(15, 2)
  total        Decimal   @db.Decimal(15, 2)
  currency     String?
  displayOrder Int       @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
  @@index([tenantId])
  @@index([invoiceId, displayOrder])
  @@map("invoice_items")
}

model ExtractionRun {
  id               String            @id @default(uuid())
  tenantId         String
  invoiceId        String
  status           ExtractionStatus  @default(PENDING)
  ocrText          String?           @db.Text
  llmResponse      Json?
  errorMessage     String?
  processingTimeMs Int?
  createdAt        DateTime          @default(now())

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

model Insight {
  id             String      @id @default(uuid())
  tenantId       String
  insightType    InsightType
  title          String
  content        String      @db.Text
  relatedMetrics Json
  generatedAt    DateTime    @default(now())
  createdAt      DateTime    @default(now())

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

model FxRateCache {
  id           String   @id @default(uuid())
  baseCurrency String
  rates        Json
  fetchedAt    DateTime @default(now())
  expiresAt    DateTime

  @@unique([baseCurrency])
  @@map("fx_rate_cache")
}
```

---

## Migration Notes

### From Version 1.0 to 2.0

**Breaking Changes**:
1. **Invoice.vendorId**: Remains NOT NULL (business assignment mandatory)
2. **Invoice.fileHash**: New unique constraint (existing invoices get NULL, no duplicates enforced retroactively)

**Additions**:
1. **InvoiceItem** table (NEW): Stores line items normalized
2. **Invoice.fileHash** field: For duplicate detection
3. **Invoice.useItemsTotal** field: Auto-calc toggle

**Migration Steps**:
1. Add `fileHash`, `useItemsTotal` fields to Invoice (nullable initially)
2. Create InvoiceItem table
3. Migrate existing LLM JSON line items to InvoiceItem table (optional backfill)
4. Set `useItemsTotal = true` for all invoices with items, `false` otherwise

---

## Data Integrity Rules

### Multi-Tenancy
- **CRITICAL**: Every query MUST filter by `tenantId`
- No cross-tenant reads/writes under any circumstances
- `tenantId` derived from JWT `sub` claim (never from request body)

### Invoice-Vendor Relationship
- Invoice MUST have a valid vendor (NOT NULL)
- Vendor deletion cascades to invoices (warn user)

### Invoice Items
- Items are optional (invoice can exist without items)
- If `useItemsTotal = true` and items exist: `originalAmount` MUST equal `SUM(items.total)` (validated by backend)
- Currency defaults to invoice currency if item currency is NULL

### File Dedupe
- `fileHash` computed as `SHA256(fileBytes)` on backend
- Unique per tenant (same file can be uploaded by different users)
- Duplicate upload returns `409 Conflict` with existing invoice ID

### Currency Handling
- All amounts stored with 2 decimal precision (Decimal(15,2))
- `originalAmount` + `originalCurrency` = source of truth
- `normalizedAmount` computed via FX rates (cached, 12h TTL)

---

## Performance Considerations

### Indexes
- All queries by `tenantId` use index
- Vendor analytics queries: `(tenantId, vendorId)` index
- Date range queries: `(tenantId, invoiceDate)` index
- Dedupe lookup: `(tenantId, fileHash)` index

### Query Patterns
- Fetch vendors with latest invoices: JOIN with LIMIT 5 per vendor
- Analytics aggregations: Use Prisma aggregations (not in-memory)
- Search: `ILIKE` for simple search, full-text search for advanced (future)

---

**Last Updated**: 2026-01-20  
**Change Log**:
- v2.0: Added InvoiceItem, fileHash, useItemsTotal
- v1.0: Initial schema
