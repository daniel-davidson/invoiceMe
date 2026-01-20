# API Contracts: InvoiceMe MVP

**Version**: 1.0
**Date**: 2026-01-18
**Source**: [contracts/](./contracts/)

---

## Overview

This document summarizes all REST API endpoints for the InvoiceMe MVP backend. All endpoints except authentication require JWT bearer token authentication. Every endpoint automatically scopes data by `tenantId` extracted from the JWT `sub` claim.

**Base URL**: `http://localhost:3000/api` (development)

**Authentication**: Bearer JWT token in `Authorization` header

---

## Authentication Endpoints

Source: [contracts/auth.yaml](./contracts/auth.yaml)

### POST /auth/signup
**Purpose**: Register a new user
**Auth**: None
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "personalBusinessId": "123456789",
  "systemCurrency": "USD"
}
```
**Response**: `201 Created`
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "...",
  "expiresIn": 3600,
  "user": { "id": "uuid", "email": "...", "fullName": "..." }
}
```

### POST /auth/login
**Purpose**: Login with email and password
**Auth**: None
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
**Response**: `200 OK` (same structure as signup)

### POST /auth/logout
**Purpose**: Logout current user
**Auth**: Required
**Response**: `200 OK`

### POST /auth/refresh
**Purpose**: Refresh access token
**Auth**: None
**Request Body**:
```json
{
  "refreshToken": "..."
}
```
**Response**: `200 OK` (returns new tokens)

---

## Vendor Endpoints

Source: [contracts/vendors.yaml](./contracts/vendors.yaml)

### GET /vendors (UPDATED v2.0)
**Purpose**: List all vendors for current tenant with optional search
**Auth**: Required
**Query Params**:
- `includeInvoiceCount` (boolean): Include invoice count per vendor
- `search` (string, NEW): Filter vendors by name (partial match, case-insensitive)

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Acme Corp",
    "displayOrder": 0,
    "monthlyLimit": 5000.00,
    "invoiceCount": 12,
    "createdAt": "2026-01-18T10:00:00Z",
    "updatedAt": "2026-01-18T10:00:00Z"
  }
]
```

**Examples**:
- `GET /vendors?search=acme` → returns vendors matching "acme" (case-insensitive)
- `GET /vendors?includeInvoiceCount=true&search=corp` → filtered + counts

### POST /vendors
**Purpose**: Create a new vendor
**Auth**: Required
**Request Body**:
```json
{
  "name": "Acme Corp",
  "monthlyLimit": 5000.00
}
```
**Response**: `201 Created` (returns Vendor object)

### GET /vendors/{id}
**Purpose**: Get vendor by ID with recent invoices
**Auth**: Required
**Response**: `200 OK` (Vendor object + `recentInvoices` array)

### PATCH /vendors/{id}
**Purpose**: Update vendor
**Auth**: Required
**Request Body**:
```json
{
  "name": "Updated Name",
  "monthlyLimit": 6000.00
}
```
**Response**: `200 OK` (returns updated Vendor)

### DELETE /vendors/{id}
**Purpose**: Delete vendor and all related invoices
**Auth**: Required
**Response**: `200 OK`
```json
{
  "deletedVendorId": "uuid",
  "deletedInvoicesCount": 15
}
```

### POST /vendors/reorder
**Purpose**: Reorder vendors (drag-drop)
**Auth**: Required
**Request Body**:
```json
{
  "vendorIds": ["uuid1", "uuid2", "uuid3"]
}
```
**Response**: `200 OK` (returns reordered vendor array)

---

## Invoice Endpoints

Source: [contracts/invoices.yaml](./contracts/invoices.yaml)

### GET /invoices (UPDATED v2.0)
**Purpose**: List invoices with pagination, filtering, and search
**Auth**: Required
**Query Params**:
- `vendorId` (uuid): Filter by vendor
- `search` (string, ENHANCED): Search in multiple fields:
  - Vendor/business name (partial match, case-insensitive)
  - Invoice number (partial match)
  - Invoice name (partial match)
  - Amount (as string, e.g., "150" matches $150.00)
- `startDate` (date): Filter from date
- `endDate` (date): Filter to date
- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)
- `groupByMonth` (boolean): Group results by month/year

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "vendorId": "uuid",
      "vendorName": "Acme Corp",
      "name": "Office Supplies",
      "originalAmount": 150.00,
      "originalCurrency": "USD",
      "normalizedAmount": 150.00,
      "invoiceDate": "2026-01-15",
      "needsReview": false,
      "createdAt": "2026-01-18T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### POST /invoices/upload (UPDATED v2.0)
**Purpose**: Upload and process an invoice file
**Auth**: Required
**Request**: `multipart/form-data`
- `file` (binary, required): PDF or image (JPEG, PNG)
- `vendorId` (uuid, optional, DEPRECATED): Pre-assign to vendor (use post-upload assignment modal instead)

**Response**: `201 Created`
```json
{
  "invoice": {
    "id": "uuid",
    "vendorId": "uuid",
    "vendorName": "Acme Corp",
    "name": null,
    "originalAmount": 150.00,
    "originalCurrency": "USD",
    "normalizedAmount": 150.00,
    "invoiceDate": "2026-01-15",
    "invoiceNumber": "INV-001",
    "fileUrl": "/storage/tenant-id/abc123.pdf",
    "fileHash": "sha256:abc123def456...",
    "useItemsTotal": true,
    "needsReview": false,
    "createdAt": "2026-01-20T10:00:00Z",
    "items": [
      {
        "id": "uuid",
        "description": "Product A",
        "quantity": 2.0,
        "unitPrice": 50.25,
        "total": 100.50,
        "currency": "USD"
      },
      {
        "id": "uuid",
        "description": "Shipping",
        "quantity": null,
        "unitPrice": null,
        "total": 49.50,
        "currency": "USD"
      }
    ]
  },
  "vendor": {
    "id": "uuid",
    "name": "Acme Corp",
    "isNew": true,
    "confidence": 0.85
  },
  "extraction": {
    "status": "SUCCESS",
    "confidence": {
      "vendorName": 0.95,
      "invoiceDate": 0.92,
      "totalAmount": 0.98,
      "currency": 1.0
    },
    "warnings": []
  }
}
```

**Business Logic**:
- Computes `fileHash = SHA256(fileBytes)` on backend
- Checks for duplicate: if `(tenantId, fileHash)` exists, returns `409 Conflict` (see `/invoices/check-duplicate`)
- Extracts line items via LLM if available, stores in `invoice_items` table
- Sets `useItemsTotal = true` if items exist and total matches
- If extraction uncertain or items incomplete: sets `needsReview = true`

**Error Codes**:
- `400 Bad Request`: Invalid file type or missing file
- `409 Conflict`: Duplicate file (see response for existing invoice ID)
- `422 Unprocessable Entity`: File corrupted or cannot be processed

### GET /invoices/{id} (UPDATED v2.0)
**Purpose**: Get invoice details including line items
**Auth**: Required
**Response**: `200 OK`
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "vendorId": "uuid",
  "vendorName": "Acme Corp",
  "name": "Office Supplies",
  "originalAmount": 200.00,
  "originalCurrency": "USD",
  "normalizedAmount": 200.00,
  "invoiceDate": "2026-01-15",
  "invoiceNumber": "INV-001",
  "fileUrl": "/storage/...",
  "fileHash": "sha256:...",
  "useItemsTotal": true,
  "needsReview": false,
  "createdAt": "2026-01-18T10:00:00Z",
  "updatedAt": "2026-01-18T12:00:00Z",
  "items": [
    {
      "id": "uuid",
      "description": "Product A",
      "quantity": 2.0,
      "unitPrice": 75.00,
      "total": 150.00,
      "currency": "USD",
      "displayOrder": 0
    },
    {
      "id": "uuid",
      "description": "Shipping",
      "quantity": null,
      "unitPrice": null,
      "total": 50.00,
      "currency": "USD",
      "displayOrder": 1
    }
  ],
  "extractionRuns": [
    {
      "id": "uuid",
      "status": "SUCCESS",
      "ocrText": "...",
      "processingTimeMs": 15000,
      "createdAt": "2026-01-18T10:00:00Z"
    }
  ]
}
```

### PATCH /invoices/{id} (UPDATED v2.0)
**Purpose**: Update invoice header and/or line items atomically
**Auth**: Required
**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "invoiceNumber": "INV-001",
  "originalAmount": 200.00,
  "originalCurrency": "USD",
  "invoiceDate": "2026-01-15",
  "vendorId": "uuid",
  "useItemsTotal": true,
  "needsReview": false,
  "items": [
    {
      "id": "existing-uuid",
      "description": "Product A (updated)",
      "quantity": 2.5,
      "unitPrice": 60.00,
      "total": 150.00,
      "currency": "USD"
    },
    {
      "description": "New Product B",
      "quantity": 1,
      "unitPrice": 50.00,
      "total": 50.00,
      "currency": null
    }
  ]
}
```

**Response**: `200 OK`
```json
{
  "invoice": { /* Full invoice detail with updated items */ },
  "items": [ /* Complete items array */ ]
}
```

**Business Logic**:
- **Items Full Replace**: Backend DELETEs items not in array, UPDATEs items with id, CREATEs items without id
- **Validation**: If `useItemsTotal = true` and items exist: `originalAmount` MUST equal `SUM(items.total)` (tolerance $0.01)
- **Validation**: Each item must have `description` and `total` (quantity/unitPrice nullable)
- If validation fails: returns `422 Unprocessable Entity` with specific error message
- All updates atomic in DB transaction (rollback on any failure)

**Error Codes**:
- `400 Bad Request`: Invalid field types or missing required fields
- `404 Not Found`: Invoice not found or not owned by tenant
- `422 Unprocessable Entity`: Validation failed (e.g., total mismatch, missing item fields)

**Validation Errors Example**:
```json
{
  "statusCode": 422,
  "message": "Validation failed",
  "errors": [
    "Total mismatch: invoice amount $200.00 ≠ items total $150.00 (useItemsTotal is true)",
    "Item 2 missing required field: description"
  ]
}
```

### DELETE /invoices/{id}
**Purpose**: Delete invoice (cascades to items)
**Auth**: Required
**Response**: `200 OK`
```json
{
  "deletedInvoiceId": "uuid"
}
```

### POST /invoices/check-duplicate (NEW v2.0)
**Purpose**: Check if file already uploaded (dedupe check before upload)
**Auth**: Required
**Request Body**:
```json
{
  "fileHash": "sha256:abc123def456..."
}
```

**Response** (if duplicate exists): `200 OK`
```json
{
  "isDuplicate": true,
  "existingInvoice": {
    "id": "uuid",
    "name": "Existing Invoice",
    "vendorName": "Acme Corp",
    "originalAmount": 150.00,
    "originalCurrency": "USD",
    "invoiceDate": "2026-01-15",
    "createdAt": "2026-01-10T10:00:00Z"
  }
}
```

**Response** (if not duplicate): `404 Not Found`
```json
{
  "isDuplicate": false
}
```

**Usage**: Frontend computes `SHA256(fileBytes)`, calls this endpoint before upload. If duplicate, show "This invoice already exists" message with link to existing invoice.

### GET /invoices/{id}/file
**Purpose**: Download invoice file
**Auth**: Required
**Response**: `200 OK` (binary file: PDF, JPEG, or PNG)

---

## Analytics Endpoints

Source: [contracts/analytics.yaml](./contracts/analytics.yaml)

### GET /analytics/vendor/{vendorId}
**Purpose**: Get analytics for a single vendor
**Auth**: Required
**Query Params**:
- `year` (integer): Filter to specific year (default: current year)

**Response**: `200 OK`
```json
{
  "vendorId": "uuid",
  "vendorName": "Acme Corp",
  "kpis": {
    "currentMonthSpend": 1200.00,
    "monthlyLimit": 5000.00,
    "monthlyAverage": 1500.00,
    "yearlyAverage": 18000.00,
    "limitUtilization": 24.0
  },
  "pieChart": {
    "title": "Spending Breakdown",
    "segments": [
      { "label": "Category A", "value": 500, "percentage": 41.67, "color": "#FF6384" }
    ]
  },
  "lineChart": {
    "title": "Monthly Spending",
    "labels": ["Jan", "Feb", "Mar"],
    "datasets": [
      { "label": "Spend", "data": [1200, 1500, 1300], "color": "#36A2EB" }
    ]
  }
}
```

### GET /analytics/overall
**Purpose**: Get aggregate analytics across all vendors
**Auth**: Required
**Query Params**:
- `year` (integer): Filter to specific year

**Response**: `200 OK`
```json
{
  "kpis": {
    "totalSpend": 5200.00,
    "totalLimits": 15000.00,
    "remainingBalance": 9800.00,
    "vendorCount": 8,
    "invoiceCount": 45
  },
  "pieChart": { /* Top 5 vendors by spend */ },
  "lineChart": { /* Overall monthly spend */ }
}
```

### PATCH /analytics/vendor/{vendorId}/limit
**Purpose**: Update vendor monthly spending limit
**Auth**: Required
**Request Body**:
```json
{
  "monthlyLimit": 6000.00
}
```
**Response**: `200 OK`
```json
{
  "vendorId": "uuid",
  "monthlyLimit": 6000.00
}
```

### GET /analytics/vendor/{vendorId}/export (NEW v2.0)
**Purpose**: Export vendor analytics as CSV
**Auth**: Required
**Query Params**: (same as GET /analytics/vendor/{vendorId})

**Response**: `200 OK`
```csv
Headers:
  Content-Type: text/csv
  Content-Disposition: attachment; filename="vendor-analytics-{vendorName}-{date}.csv"

Body (CSV):
Month,Spend,Invoice Count,Monthly Limit,Utilization %
Jan 2026,1200.00,5,5000.00,24.0
Feb 2026,1500.00,7,5000.00,30.0
...
```

### GET /analytics/overall/export (NEW v2.0)
**Purpose**: Export overall analytics as CSV
**Auth**: Required

**Response**: `200 OK`
```csv
Headers:
  Content-Type: text/csv
  Content-Disposition: attachment; filename="overall-analytics-{date}.csv"

Body (CSV):
Business,Total Spend,Invoice Count,Monthly Limit,Latest Invoice
Acme Corp,5200.00,12,5000.00,2026-01-15
XYZ Inc,3800.00,8,3000.00,2026-01-14
...
```

---

## Insights Endpoints

Source: [contracts/insights.yaml](./contracts/insights.yaml)

### GET /insights
**Purpose**: Get recent insights for current tenant
**Auth**: Required
**Query Params**:
- `type` (enum): Filter by MONTHLY_NARRATIVE, RECURRING_CHARGES, or ANOMALIES
- `limit` (integer, default: 10, max: 50)

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "insightType": "MONTHLY_NARRATIVE",
    "title": "January 2026 Spending Summary",
    "content": "Your spending increased by 8.3% this month...",
    "generatedAt": "2026-01-18T10:00:00Z",
    "createdAt": "2026-01-18T10:00:00Z"
  }
]
```

### POST /insights/generate
**Purpose**: Generate new insights based on current data
**Auth**: Required
**Request Body** (optional):
```json
{
  "types": ["MONTHLY_NARRATIVE", "ANOMALIES"]
}
```
**Response**: `201 Created`
```json
{
  "generated": [ /* Array of Insight objects */ ],
  "processingTimeMs": 2500
}
```

### GET /insights/{id}
**Purpose**: Get insight by ID with full metrics
**Auth**: Required
**Response**: `200 OK` (Insight object + `relatedMetrics` JSON)

### DELETE /insights/{id}
**Purpose**: Delete insight
**Auth**: Required
**Response**: `200 OK`

---

## Settings & Export Endpoints

Source: [contracts/settings.yaml](./contracts/settings.yaml)

### GET /settings/profile
**Purpose**: Get current user profile
**Auth**: Required
**Response**: `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "personalBusinessId": "123456789",
  "systemCurrency": "USD",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-18T10:00:00Z",
  "stats": {
    "vendorCount": 8,
    "invoiceCount": 45,
    "totalSpendThisMonth": 5200.00
  }
}
```

### PATCH /settings/profile
**Purpose**: Update user profile
**Auth**: Required
**Request Body**:
```json
{
  "fullName": "John Smith",
  "personalBusinessId": "987654321"
}
```
**Response**: `200 OK` (returns updated UserProfile)

### GET /settings/currency
**Purpose**: Get available currencies
**Auth**: Required
**Response**: `200 OK`
```json
[
  { "code": "USD", "name": "United States Dollar", "symbol": "$", "flag": "🇺🇸" },
  { "code": "EUR", "name": "Euro", "symbol": "€", "flag": "🇪🇺" }
]
```

### PATCH /settings/currency
**Purpose**: Update system currency
**Auth**: Required
**Request Body**:
```json
{
  "systemCurrency": "EUR"
}
```
**Response**: `200 OK`
```json
{
  "systemCurrency": "EUR",
  "message": "System currency updated. Normalized amounts will be recalculated."
}
```

### GET /export/invoices
**Purpose**: Export invoices as CSV
**Auth**: Required
**Query Params**:
- `vendorId` (uuid): Filter by vendor
- `startDate` (date)
- `endDate` (date)

**Response**: `200 OK` (CSV file download)
**Headers**: `Content-Disposition: attachment; filename="invoices_2026-01-18.csv"`

### GET /export/analytics
**Purpose**: Export analytics data as CSV
**Auth**: Required
**Query Params**:
- `vendorId` (uuid): Export for specific vendor (omit for all)
- `year` (integer)

**Response**: `200 OK` (CSV file download)

---

## Common Response Schemas

### ErrorResponse
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "BadRequest"
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing or invalid JWT |
| 404 | Not Found | Resource not found or not owned by tenant |
| 409 | Conflict | Duplicate resource (e.g., vendor name) |
| 422 | Unprocessable Entity | Extraction failed, not enough data |

---

## Multi-Tenancy Enforcement

**Critical**: Every endpoint (except auth) automatically filters data by `tenantId` extracted from JWT `sub` claim. This ensures:

1. Users can only access their own data
2. Cross-tenant data leaks are impossible
3. 404 responses for resources owned by other tenants
4. No `tenantId` parameter needed in requests

---

## Pagination Pattern

Endpoints returning lists use consistent pagination:

**Request**:
- `page` (integer, default: 1)
- `limit` (integer, default: 20)

**Response**:
```json
{
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## File Upload Pattern

Invoice upload uses `multipart/form-data`:

**Accepted Formats**: PDF, JPEG, PNG
**Max Size**: 10MB (POC limit)
**Field Name**: `file`

---

## Extraction Pipeline States

Invoice extraction progresses through states:

1. **PENDING** - Upload received, not processed
2. **OCR_COMPLETE** - OCR finished, awaiting LLM
3. **LLM_COMPLETE** - LLM finished, awaiting validation
4. **VALIDATION_FAILED** - Validation issues found
5. **SUCCESS** - Fully processed
6. **ERROR** - Processing failed

---

## Insight Types

| Type | Description | SQL Metrics | LLM Role |
|------|-------------|-------------|----------|
| MONTHLY_NARRATIVE | Month-over-month analysis | Current vs previous spend, top vendor change | Summarize narrative |
| RECURRING_CHARGES | Detected subscriptions | Repeated vendor+amount patterns | Explain findings |
| ANOMALIES | Duplicates, spikes, mismatches | Outlier detection, duplicate detection | Recommend actions |

**Rule**: All totals, averages, and comparisons computed via SQL. LLM only generates narrative text.

---

## Summary

**Total Endpoints**: 29

| Category | Count | Endpoints |
|----------|-------|-----------|
| Auth | 4 | signup, login, logout, refresh |
| Vendors | 6 | list, create, get, update, delete, reorder |
| Invoices | 6 | list, upload, get, update, delete, download |
| Analytics | 3 | vendor, overall, update limit |
| Insights | 4 | list, generate, get, delete |
| Settings | 6 | profile (get/update), currency (list/update), export (invoices/analytics) |
