# Implementation Plan: InvoiceMe MVP

**Branch**: `001-invoiceme-mvp` | **Date**: 2026-01-18 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-invoiceme-mvp/spec.md`

---

## Summary

InvoiceMe is a multi-tenant B2C invoice management application enabling users to upload invoices (PDF/images), extract structured data via OCR + LLM pipeline, manage vendors, view analytics dashboards, and receive AI-generated spending insights. The system uses Flutter (Riverpod + Clean Architecture) for the frontend and NestJS (Prisma + PostgreSQL) for the backend, with Supabase handling authentication and database hosting.

---

## Technical Context

| Aspect | Decision |
|--------|----------|
| **Frontend** | Flutter 3.x with Riverpod (class-based notifiers), Clean Architecture |
| **Backend** | NestJS with TypeScript, Prisma ORM |
| **Database** | PostgreSQL (Supabase-hosted for demo, local option supported) |
| **Authentication** | Supabase Auth (email + password), JWT with `sub` claim as `tenantId` |
| **OCR** | Tesseract (heb + eng language packs) |
| **LLM** | Ollama (local), called as HTTP service from backend |
| **Currency Conversion** | exchangeratesapi.io "latest" endpoint, in-memory TTL cache (12h) |
| **File Storage** | Local filesystem (outside DB), metadata stored in DB |
| **Testing** | Jest (backend), Flutter test (frontend) |
| **Target Platform** | Web (Flutter Web), local-runnable without Docker |
| **Project Type** | Web application (frontend + backend) |
| **Performance Goals** | Invoice extraction < 30s, Dashboard load < 2s, Search < 3s |
| **Constraints** | No Docker required, tenant isolation mandatory, POC-level (single-user concurrency) |
| **Scale/Scope** | Single-tenant concurrent usage, ~10 screens, ~15 API endpoints |

---

## Constitution Check

*GATE: Passed - No custom constitution defined. Using standard POC practices.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Tenant Isolation | ✅ Required | Every table has `tenantId`, every query scoped |
| Specs as Source of Truth | ✅ Required | No features invented beyond spec |
| Local Runnable | ✅ Required | No Docker dependency |
| File Storage Outside DB | ✅ Required | Only metadata in DB |

---

## Architecture Overview

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLUTTER CLIENT                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Presentation│  │   Domain    │  │    Data     │  │   State (Riverpod)  │ │
│  │   Screens   │◄─┤  UseCases   │◄─┤ Repositories│◄─┤  ClassNotifiers     │ │
│  │   Widgets   │  │  Entities   │  │ DataSources │  │  Providers          │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTP (REST)
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NESTJS BACKEND                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Controllers  │  │   Services   │  │   Prisma     │  │    Guards       │  │
│  │  (REST API)  │◄─┤ (Business)   │◄─┤  (ORM)       │  │  (TenantGuard)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘  │
│         │                │                  │                    │          │
│         ▼                ▼                  ▼                    ▼          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Modules    │  │  Extractors  │  │  PostgreSQL  │  │  Supabase Auth  │  │
│  │ (NestJS DI)  │  │ OCR + LLM    │  │   (Prisma)   │  │  (JWT Verify)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                │                │
                ▼                ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│    Tesseract      │  │     Ollama        │  │ exchangeratesapi  │
│   (OCR Engine)    │  │   (Local LLM)     │  │    (FX Rates)     │
│   heb + eng       │  │   Extraction      │  │    POC Cache      │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

### Multi-Tenancy Flow

```
Request → JWT Header → TenantGuard → Extract sub → Attach tenantId to Request
                                                          │
                                                          ▼
                                              All DB queries include:
                                              WHERE tenantId = {request.tenantId}
```

---

## Sequence Flows

### 1. Invoice Upload Flow

```
┌──────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐     ┌────────┐     ┌────────┐
│Client│     │ Upload   │     │Extraction│     │Tesseract│     │ Ollama │     │Database│
└──┬───┘     │Controller│     │ Service  │     │  OCR    │     │  LLM   │     └───┬────┘
   │         └────┬─────┘     └────┬─────┘     └────┬────┘     └───┬────┘         │
   │ POST /invoices/upload        │                 │              │              │
   │ (file + tenantId)            │                 │              │              │
   │─────────────────────────────►│                 │              │              │
   │                              │ Save file       │              │              │
   │                              │ to disk         │              │              │
   │                              │                 │              │              │
   │                              │ Is PDF with     │              │              │
   │                              │ selectable text?│              │              │
   │                              │─────────────────┤              │              │
   │                              │    YES: Extract │              │              │
   │                              │    NO: Convert  │              │              │
   │                              │    to images    │              │              │
   │                              │                 │              │              │
   │                              │─────────────────┼─────────────►│              │
   │                              │                 │  OCR (heb+eng)              │
   │                              │                 │◄─────────────│              │
   │                              │                 │  raw text    │              │
   │                              │                 │              │              │
   │                              │─────────────────┼──────────────┼─────────────►│
   │                              │                 │              │ LLM Extract  │
   │                              │                 │              │ (JSON schema)│
   │                              │◄────────────────┼──────────────┼──────────────│
   │                              │                 │              │              │
   │                              │ Validate schema │              │              │
   │                              │ Match/create    │              │              │
   │                              │ vendor          │              │              │
   │                              │ Convert currency│              │              │
   │                              │                 │              │              │
   │                              │─────────────────┼──────────────┼──────────────►│
   │                              │                 │              │  Save Invoice │
   │                              │                 │              │  + Extraction │
   │◄─────────────────────────────│                 │              │              │
   │  201 Created                 │                 │              │              │
   │  { invoice, vendor }         │                 │              │              │
```

### 2. Analytics Dashboard Flow

```
┌──────┐     ┌──────────┐     ┌──────────┐     ┌────────┐
│Client│     │Analytics │     │ Analytics│     │Database│
└──┬───┘     │Controller│     │ Service  │     └───┬────┘
   │         └────┬─────┘     └────┬─────┘         │
   │ GET /analytics/vendor/{id}   │                │
   │─────────────────────────────►│                │
   │                              │ SQL Aggregate  │
   │                              │ (tenantId)     │
   │                              │────────────────►│
   │                              │                │
   │                              │ KPIs:          │
   │                              │ - monthly_spend│
   │                              │ - monthly_avg  │
   │                              │ - yearly_avg   │
   │                              │ - chart_data   │
   │                              │◄───────────────│
   │◄─────────────────────────────│                │
   │  { kpis, pieData, lineData } │                │
```

### 3. AI Insights Flow

```
┌──────┐     ┌──────────┐     ┌──────────┐     ┌────────┐     ┌────────┐
│Client│     │ Insights │     │ Insights │     │Database│     │ Ollama │
└──┬───┘     │Controller│     │ Service  │     └───┬────┘     └───┬────┘
   │         └────┬─────┘     └────┬─────┘         │              │
   │ POST /insights/generate       │               │              │
   │──────────────────────────────►│               │              │
   │                               │ SQL: Compute  │              │
   │                               │ all metrics   │              │
   │                               │───────────────►│              │
   │                               │ - totals      │              │
   │                               │ - anomalies   │              │
   │                               │ - recurring   │              │
   │                               │◄──────────────│              │
   │                               │               │              │
   │                               │ LLM: Summarize│              │
   │                               │ (metrics JSON)│              │
   │                               │───────────────┼─────────────►│
   │                               │               │  Narrative   │
   │                               │◄──────────────┼──────────────│
   │                               │               │              │
   │                               │ Store insight │              │
   │                               │───────────────►│              │
   │◄──────────────────────────────│               │              │
   │  { insights[] }               │               │              │
```

### 4. CSV Export Flow

```
┌──────┐     ┌──────────┐     ┌──────────┐     ┌────────┐
│Client│     │ Export   │     │ Export   │     │Database│
└──┬───┘     │Controller│     │ Service  │     └───┬────┘
   │         └────┬─────┘     └────┬─────┘         │
   │ GET /export/invoices?vendor={id}              │
   │─────────────────────────────►│                │
   │                              │ Query invoices │
   │                              │ (tenantId)     │
   │                              │────────────────►│
   │                              │◄───────────────│
   │                              │                │
   │                              │ Generate CSV   │
   │                              │ stream         │
   │◄─────────────────────────────│                │
   │  Content-Type: text/csv      │                │
   │  Content-Disposition: attach │                │
```

---

## Project Structure

### Documentation (this feature)

```
specs/001-invoiceme-mvp/
├── plan.md              # This file
├── research.md          # Technical decisions
├── data-model.md        # Entity definitions with Prisma schema
├── quickstart.md        # Local setup and test scenarios
├── contracts/           # API endpoint contracts
│   ├── auth.yaml
│   ├── vendors.yaml
│   ├── invoices.yaml
│   ├── analytics.yaml
│   ├── insights.yaml
│   └── settings.yaml
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Backend (NestJS)

```
backend/
├── prisma/
│   ├── schema.prisma           # Database schema with tenantId
│   ├── migrations/             # Prisma migrations
│   └── seed.ts                 # Demo data seeder
├── src/
│   ├── main.ts                 # Application entry
│   ├── app.module.ts           # Root module
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   └── tenant.decorator.ts      # @Tenant() param decorator
│   │   ├── guards/
│   │   │   └── tenant.guard.ts          # JWT verification + tenant extraction
│   │   ├── interceptors/
│   │   │   └── tenant-scope.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   └── interfaces/
│   │       └── request-with-tenant.ts
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts          # Login/signup proxy to Supabase
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts         # Supabase JWT verification
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── signup.dto.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │       └── update-user.dto.ts
│   │
│   ├── vendors/
│   │   ├── vendors.module.ts
│   │   ├── vendors.controller.ts
│   │   ├── vendors.service.ts
│   │   └── dto/
│   │       ├── create-vendor.dto.ts
│   │       ├── update-vendor.dto.ts
│   │       └── reorder-vendors.dto.ts
│   │
│   ├── invoices/
│   │   ├── invoices.module.ts
│   │   ├── invoices.controller.ts
│   │   ├── invoices.service.ts
│   │   └── dto/
│   │       ├── upload-invoice.dto.ts
│   │       ├── update-invoice.dto.ts
│   │       └── invoice-query.dto.ts
│   │
│   ├── extraction/
│   │   ├── extraction.module.ts
│   │   ├── extraction.service.ts        # Orchestrates OCR + LLM
│   │   ├── ocr/
│   │   │   ├── ocr.service.ts           # Tesseract wrapper
│   │   │   └── pdf-processor.ts         # PDF text/image extraction
│   │   ├── llm/
│   │   │   ├── ollama.service.ts        # Ollama HTTP client
│   │   │   └── extraction-schema.ts     # JSON schema definition
│   │   └── vendor-matcher.service.ts    # Normalize + match vendors
│   │
│   ├── currency/
│   │   ├── currency.module.ts
│   │   ├── currency.service.ts          # FX conversion logic
│   │   └── fx-cache.service.ts          # In-memory TTL cache (12h)
│   │
│   ├── analytics/
│   │   ├── analytics.module.ts
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts         # SQL aggregations
│   │   └── dto/
│   │       └── analytics-response.dto.ts
│   │
│   ├── insights/
│   │   ├── insights.module.ts
│   │   ├── insights.controller.ts
│   │   ├── insights.service.ts          # Metrics → LLM summary
│   │   └── dto/
│   │       └── insight.dto.ts
│   │
│   ├── export/
│   │   ├── export.module.ts
│   │   ├── export.controller.ts
│   │   └── export.service.ts            # CSV generation
│   │
│   └── storage/
│       ├── storage.module.ts
│       └── storage.service.ts           # Local file storage
│
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── uploads/                             # Invoice file storage (gitignored)
├── .env.example
├── nest-cli.json
├── package.json
└── tsconfig.json
```

### Frontend (Flutter)

```
frontend/
├── lib/
│   ├── main.dart
│   ├── app.dart                         # MaterialApp + routing
│   │
│   ├── core/
│   │   ├── constants/
│   │   │   ├── api_constants.dart
│   │   │   └── app_constants.dart
│   │   ├── error/
│   │   │   ├── failures.dart
│   │   │   └── exceptions.dart
│   │   ├── network/
│   │   │   ├── api_client.dart          # Dio HTTP client
│   │   │   └── auth_interceptor.dart    # JWT injection
│   │   ├── theme/
│   │   │   └── app_theme.dart
│   │   └── utils/
│   │       ├── currency_formatter.dart
│   │       └── date_formatter.dart
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── data/
│   │   │   │   ├── datasources/
│   │   │   │   │   └── auth_remote_datasource.dart
│   │   │   │   ├── models/
│   │   │   │   │   └── user_model.dart
│   │   │   │   └── repositories/
│   │   │   │       └── auth_repository_impl.dart
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── user.dart
│   │   │   │   ├── repositories/
│   │   │   │   │   └── auth_repository.dart
│   │   │   │   └── usecases/
│   │   │   │       ├── login.dart
│   │   │   │       ├── signup.dart
│   │   │   │       └── logout.dart
│   │   │   └── presentation/
│   │   │       ├── providers/
│   │   │       │   └── auth_notifier.dart
│   │   │       ├── screens/
│   │   │       │   ├── welcome_screen.dart
│   │   │       │   ├── login_screen.dart
│   │   │       │   └── signup_screen.dart
│   │   │       └── widgets/
│   │   │           └── auth_form.dart
│   │   │
│   │   ├── home/
│   │   │   ├── data/...
│   │   │   ├── domain/...
│   │   │   └── presentation/
│   │   │       ├── providers/
│   │   │       │   └── home_notifier.dart
│   │   │       ├── screens/
│   │   │       │   └── home_screen.dart
│   │   │       └── widgets/
│   │   │           ├── vendor_card.dart
│   │   │           ├── empty_state.dart
│   │   │           └── upload_fab.dart
│   │   │
│   │   ├── vendors/
│   │   │   ├── data/...
│   │   │   ├── domain/...
│   │   │   └── presentation/
│   │   │       ├── providers/
│   │   │       │   └── vendors_notifier.dart
│   │   │       ├── screens/
│   │   │       │   └── vendor_detail_screen.dart
│   │   │       └── widgets/
│   │   │           ├── vendor_form_dialog.dart
│   │   │           └── delete_confirmation.dart
│   │   │
│   │   ├── invoices/
│   │   │   ├── data/...
│   │   │   ├── domain/...
│   │   │   └── presentation/
│   │   │       ├── providers/
│   │   │       │   └── invoices_notifier.dart
│   │   │       ├── screens/
│   │   │       │   ├── invoices_list_screen.dart
│   │   │       │   ├── invoice_detail_screen.dart
│   │   │       │   └── upload_screen.dart
│   │   │       └── widgets/
│   │   │           ├── invoice_tile.dart
│   │   │           ├── month_group.dart
│   │   │           └── search_bar.dart
│   │   │
│   │   ├── analytics/
│   │   │   ├── data/...
│   │   │   ├── domain/...
│   │   │   └── presentation/
│   │   │       ├── providers/
│   │   │       │   └── analytics_notifier.dart
│   │   │       ├── screens/
│   │   │       │   ├── vendor_analytics_screen.dart
│   │   │       │   └── all_vendors_analytics_screen.dart
│   │   │       └── widgets/
│   │   │           ├── kpi_card.dart
│   │   │           ├── pie_chart.dart
│   │   │           ├── line_chart.dart
│   │   │           └── export_button.dart
│   │   │
│   │   ├── insights/
│   │   │   ├── data/...
│   │   │   ├── domain/...
│   │   │   └── presentation/
│   │   │       ├── providers/
│   │   │       │   └── insights_notifier.dart
│   │   │       └── widgets/
│   │   │           └── insight_card.dart
│   │   │
│   │   └── settings/
│   │       ├── data/...
│   │       ├── domain/...
│   │       └── presentation/
│   │           ├── providers/
│   │           │   └── settings_notifier.dart
│   │           ├── screens/
│   │           │   └── settings_screen.dart
│   │           └── widgets/
│   │               └── currency_picker_tile.dart
│   │
│   └── shared/
│       ├── widgets/
│       │   ├── loading_indicator.dart
│       │   ├── error_snackbar.dart
│       │   └── confirmation_dialog.dart
│       └── providers/
│           └── shared_providers.dart
│
├── test/
│   ├── widget_test.dart
│   └── features/
├── pubspec.yaml
└── analysis_options.yaml
```

---

## AI Extraction Contract

### Strict JSON Schema Output from Ollama

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["vendorName", "totalAmount", "currency", "confidence", "warnings"],
  "properties": {
    "vendorName": {
      "type": "string",
      "description": "Extracted vendor/supplier name from invoice"
    },
    "invoiceDate": {
      "type": "string",
      "format": "date",
      "description": "Invoice date in ISO 8601 format (YYYY-MM-DD)"
    },
    "totalAmount": {
      "type": "number",
      "description": "Total amount due on invoice"
    },
    "currency": {
      "type": "string",
      "pattern": "^[A-Z]{3}$",
      "description": "ISO 4217 currency code (e.g., USD, EUR, ILS)"
    },
    "invoiceNumber": {
      "type": "string",
      "description": "Optional: Invoice reference number"
    },
    "vatAmount": {
      "type": "number",
      "description": "Optional: VAT/tax amount"
    },
    "subtotalAmount": {
      "type": "number",
      "description": "Optional: Subtotal before tax"
    },
    "lineItems": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": { "type": "string" },
          "quantity": { "type": "number" },
          "unitPrice": { "type": "number" },
          "amount": { "type": "number" }
        }
      },
      "description": "Optional: Itemized line items"
    },
    "confidence": {
      "type": "object",
      "properties": {
        "vendorName": { "type": "number", "minimum": 0, "maximum": 1 },
        "invoiceDate": { "type": "number", "minimum": 0, "maximum": 1 },
        "totalAmount": { "type": "number", "minimum": 0, "maximum": 1 },
        "currency": { "type": "number", "minimum": 0, "maximum": 1 }
      },
      "description": "Confidence score (0-1) for each extracted field"
    },
    "warnings": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Any issues or uncertainties during extraction"
    }
  }
}
```

### Backend Validation Rules

| Field | Validation | Action if Invalid |
|-------|------------|-------------------|
| `totalAmount` | Must be positive number | Set `needsReview = true` |
| `invoiceDate` | Must be valid ISO date, not future | Set `needsReview = true` |
| `currency` | Must be valid ISO 4217 code | Default to user's system currency |
| `confidence.*` | Any field < 0.7 | Set `needsReview = true` |
| `warnings` | Non-empty array | Set `needsReview = true` |

---

## AI Insights Definitions

### Insight 1: Monthly Narrative

**Input**: SQL-computed metrics for current and previous month  
**Output**: Natural language summary of spending changes

```json
{
  "type": "monthly_narrative",
  "metrics": {
    "currentMonthSpend": 5200.00,
    "previousMonthSpend": 4800.00,
    "changePercent": 8.33,
    "topVendorChange": { "name": "AWS", "change": 300.00 }
  },
  "narrative": "Your spending increased by 8.3% this month, primarily driven by a $300 increase at AWS. Consider reviewing your cloud costs."
}
```

### Insight 2: Recurring Charges Detection

**Input**: SQL-detected repeated vendor+amount patterns  
**Output**: List of likely recurring subscriptions

```json
{
  "type": "recurring_charges",
  "detected": [
    { "vendor": "Spotify", "amount": 9.99, "frequency": "monthly", "confidence": 0.95 },
    { "vendor": "AWS", "amount": 450.00, "frequency": "monthly", "confidence": 0.80 }
  ],
  "narrative": "We detected 2 recurring charges totaling $459.99/month. Spotify has been consistent for 6 months."
}
```

### Insight 3: Anomalies

**Input**: SQL-detected outliers (duplicates, spikes, mismatches)  
**Output**: Flagged items with recommended actions

```json
{
  "type": "anomalies",
  "items": [
    {
      "category": "duplicate",
      "invoices": ["inv_123", "inv_124"],
      "amount": 150.00,
      "action": "Review for potential double-charge"
    },
    {
      "category": "spike",
      "vendor": "Office Supplies",
      "amount": 2500.00,
      "averageAmount": 200.00,
      "action": "Unusually high - verify this purchase"
    }
  ],
  "narrative": "Found 1 potential duplicate ($150) and 1 spending spike at Office Supplies (12.5x normal). Review recommended."
}
```

**Rule**: All totals, averages, and comparisons are computed via SQL. The LLM only generates the `narrative` field and formats the output.

---

## Complexity Tracking

| Decision | Reason | Alternative Rejected |
|----------|--------|---------------------|
| In-memory FX cache vs Redis | Docker not required; POC single-instance | Redis adds operational complexity |
| Local file storage vs S3 | Local-runnable requirement | S3 requires network; can add later |
| Supabase-hosted DB | Shareable demo requirement | Pure local Postgres lacks sharing |

---

## Dependencies

### Backend (package.json)

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@prisma/client": "^5.0.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "tesseract.js": "^5.0.0",
    "pdf-parse": "^1.1.1",
    "pdf-poppler": "^0.5.0",
    "axios": "^1.6.0",
    "multer": "^1.4.5",
    "csv-writer": "^1.6.0"
  }
}
```

### Frontend (pubspec.yaml)

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.4.0
  riverpod_annotation: ^2.3.0
  dio: ^5.4.0
  go_router: ^13.0.0
  currency_picker: ^2.0.0
  fl_chart: ^0.66.0
  file_picker: ^6.1.0
  image_picker: ^1.0.0
  shared_preferences: ^2.2.0
  intl: ^0.19.0
  equatable: ^2.0.5

dev_dependencies:
  flutter_test:
    sdk: flutter
  riverpod_generator: ^2.3.0
  build_runner: ^2.4.0
  mockito: ^5.4.0
```

---

## Next Steps

1. **Run `/speckit.tasks`** to generate detailed task breakdown
2. Execute Milestone 0: Create spec documents in `/specs`
3. Execute Milestone 1: Database schema + Prisma setup
4. Continue through milestones sequentially

**Artifacts Generated**:
- `plan.md` (this file)
- `research.md` (next)
- `data-model.md` (next)
- `contracts/` (next)
- `quickstart.md` (next)
