# Feature Specification: InvoiceMe MVP

**Feature Branch**: `001-invoiceme-mvp`  
**Created**: 2026-01-18  
**Status**: Draft  
**Input**: Multi-tenant B2C invoice management app with OCR + LLM extraction, analytics dashboards, and AI-generated insights

---

## Overview

InvoiceMe is a local-runnable, multi-tenant (B2C) invoice management application. Each authenticated user acts as a tenant who can upload invoices (PDF or photo), have structured data extracted via OCR + LLM pipeline, store invoices in a database, view analytics dashboards, and receive AI-generated insights based on their spending patterns.

### Core Domain Definitions

| Term | Definition |
|------|------------|
| **Tenant** | An authenticated user (B2C model). `tenantId` = `userId` from Supabase Auth JWT `sub` claim |
| **Business/Vendor** | The supplier/vendor on an invoice where money was spent (e.g., Cellcom, IKEA, Google). UI displays "Business" but semantically represents vendor/supplier |
| **Invoice** | A financial document belonging to exactly one Vendor and one Tenant |
| **System Currency** | User's preferred currency for displaying normalized totals and analytics |

### Multi-Tenancy Requirements (Critical)

- All user data (vendors, invoices, insights, exports) MUST be scoped by `tenantId`
- Every API endpoint and database query MUST filter by `tenantId`
- No cross-tenant data access is permitted under any circumstances

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Registration and Authentication (Priority: P1)

New users can create an account and existing users can log in to access their personal invoice dashboard.

**Why this priority**: Authentication is the foundation for multi-tenancy. Without it, no other features can be secured or personalized.

**Independent Test**: Can be fully tested by creating a new account, logging out, and logging back in. Delivers secure access to personal data.

**Acceptance Scenarios**:

1. **Given** user is on welcome screen, **When** user taps "Sign Up", **Then** registration form displays with fields: Full Name, Email, Password, Personal/Business ID, System Currency selector
2. **Given** user fills valid registration data, **When** user submits form, **Then** account is created and user is redirected to Home screen
3. **Given** user has existing account, **When** user enters valid Email + Password on Login, **Then** user is authenticated and redirected to Home screen
4. **Given** user enters invalid credentials, **When** user submits login, **Then** error message displays without revealing which field is incorrect
5. **Given** user is authenticated, **When** session expires or user logs out, **Then** user is redirected to Welcome screen

---

### User Story 2 - Invoice Upload and Processing (Priority: P1)

Users can upload invoice images or PDFs and have them automatically processed to extract structured data.

**Why this priority**: Core value proposition of the app. Without invoice upload and extraction, the app provides no utility.

**Independent Test**: Can be tested by uploading a sample invoice and verifying extracted data appears correctly. Delivers the primary value of automated data entry.

**Acceptance Scenarios**:

1. **Given** user is on Home screen, **When** user taps upload button and selects PDF/image, **Then** loading indicator displays while processing
2. **Given** invoice is being processed, **When** OCR + LLM extraction completes successfully, **Then** snackbar shows success and invoice appears under correct vendor
3. **Given** invoice is being processed, **When** extraction fails, **Then** snackbar shows error message with reason
4. **Given** invoice from new vendor is uploaded, **When** vendor is not found in user's vendor list, **Then** new vendor is automatically created
5. **Given** invoice has currency different from system currency, **When** processing completes, **Then** both original amount and converted amount (with FX rate metadata) are stored

---

### User Story 3 - Vendor (Business) Management (Priority: P2)

Users can add, edit, reorder, and delete vendors/businesses to organize their invoices.

**Why this priority**: Enables users to customize their organization structure. Important for usability but invoices can still be uploaded without pre-defined vendors.

**Independent Test**: Can be tested by adding a business, editing its name, reordering in the list, and deleting it. Delivers organization and customization capability.

**Acceptance Scenarios**:

1. **Given** user is on Home (empty state), **When** user taps "Add Business", **Then** popup form displays for entering vendor name
2. **Given** user enters vendor name, **When** user saves, **Then** vendor appears in Home list
3. **Given** vendor exists, **When** user taps edit, **Then** popup displays with editable name and delete option
4. **Given** user drags vendor card, **When** user drops in new position, **Then** vendor order is saved and persists
5. **Given** user taps delete on vendor, **When** user confirms deletion, **Then** vendor and ALL related invoices are permanently deleted

---

### User Story 4 - Invoice Viewing and Editing (Priority: P2)

Users can view their invoices in an organized list and edit invoice details.

**Why this priority**: Users need to correct extraction errors and browse their invoice history. Essential for data accuracy.

**Independent Test**: Can be tested by opening invoice list, searching for an invoice, editing its details, and deleting it. Delivers data correction and browsing capability.

**Acceptance Scenarios**:

1. **Given** user navigates to Invoices list, **When** list loads, **Then** invoices are grouped by month/year with expandable sections
2. **Given** invoice list has many items, **When** user scrolls, **Then** additional invoices load via pagination
3. **Given** user enters search term, **When** results update, **Then** matching invoices are displayed
4. **Given** user taps invoice, **When** edit form opens, **Then** user can modify: name, amount, currency, invoice date, vendor assignment
5. **Given** user taps delete on invoice, **When** user confirms, **Then** invoice is permanently removed

---

### User Story 5 - Vendor Analytics Dashboard (Priority: P2)

Users can view spending analytics for a single vendor with KPIs, charts, and export capability.

**Why this priority**: Provides insights on spending patterns per vendor. Valuable for budgeting but not blocking core functionality.

**Independent Test**: Can be tested by selecting a vendor and viewing KPI cards, pie chart, line chart, and exporting data. Delivers vendor-level spending insights.

**Acceptance Scenarios**:

1. **Given** user opens vendor analysis, **When** dashboard loads, **Then** KPI cards display: Current Monthly Spend, Monthly Limit, Monthly AVG, Yearly AVG
2. **Given** Monthly Limit card is shown, **When** user taps edit, **Then** user can set/update the limit value
3. **Given** vendor has invoices, **When** pie chart loads, **Then** top 5 vendors (or categories if implemented) are displayed
4. **Given** vendor has invoice history, **When** line chart loads, **Then** spend by month is visualized
5. **Given** user taps export button, **When** export completes, **Then** CSV file is downloaded

---

### User Story 6 - Overall Analytics Dashboard (Priority: P3)

Users can view aggregate spending analytics across all vendors.

**Why this priority**: Provides holistic spending overview. Builds on vendor analytics foundation.

**Independent Test**: Can be tested by opening All Businesses analysis and viewing aggregate KPIs, charts, and export. Delivers portfolio-level insights.

**Acceptance Scenarios**:

1. **Given** user opens All Businesses analysis, **When** dashboard loads, **Then** KPI card shows remaining balance (total limits - total spend)
2. **Given** user has multiple vendors with invoices, **When** pie chart loads, **Then** top 5 vendors by spend are displayed
3. **Given** user has invoice history, **When** line chart loads, **Then** overall spend by month is visualized
4. **Given** user taps export, **When** export completes, **Then** CSV file is downloaded

---

### User Story 7 - User Settings (Priority: P3)

Users can update their profile settings including name and system currency.

**Why this priority**: Personalization feature. Not blocking core workflows.

**Independent Test**: Can be tested by opening settings, changing name and currency, and verifying changes persist. Delivers personalization.

**Acceptance Scenarios**:

1. **Given** user opens Settings, **When** screen loads, **Then** current name and system currency are displayed
2. **Given** user edits name, **When** user saves, **Then** name is updated
3. **Given** user changes system currency, **When** user saves, **Then** all amount displays are converted/re-normalized to new currency

---

### User Story 8 - AI-Generated Insights (Priority: P3)

Users receive AI-generated insights and suggestions based on their spending patterns.

**Why this priority**: Differentiating feature but requires all other data flows to be functional first.

**Independent Test**: Can be tested by viewing insights section after having invoice data. Delivers actionable spending recommendations.

**Acceptance Scenarios**:

1. **Given** user has sufficient invoice data, **When** insights section loads, **Then** AI-generated summaries and suggestions are displayed
2. **Given** AI generates insights, **When** insights are based on metrics, **Then** totals and calculations come from SQL-computed values (not LLM computation)
3. **Given** spending pattern changes, **When** user checks insights, **Then** insights reflect updated data

---

### Edge Cases

- What happens when OCR cannot read the invoice? → Show error with manual entry option
- What happens when invoice has no detectable vendor? → Prompt user to select/create vendor manually
- What happens when currency conversion API is unavailable? → Store original currency with flag for later conversion
- What happens when user uploads duplicate invoice? → Detect and warn user based on amount + date + vendor match
- What happens when deleting a vendor with many invoices? → Show confirmation with invoice count before proceeding
- What happens with very large PDF files? → Enforce reasonable size limit (10MB POC)
- What happens when LLM extraction returns invalid data? → Validate against schema, fallback to manual entry

---

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Multi-Tenancy

- **FR-001**: System MUST display a welcome screen with "Login" and "Sign Up" options for unauthenticated users
- **FR-002**: System MUST collect Full Name, Email, Password, Personal/Business ID, and System Currency during registration
- **FR-003**: System MUST authenticate users via Supabase Auth (email/password)
- **FR-004**: System MUST derive `tenantId` from Supabase Auth JWT `sub` claim
- **FR-005**: System MUST scope ALL data queries by `tenantId` with no exceptions
- **FR-006**: System MUST prevent any cross-tenant data access

#### Invoice Upload & Processing

- **FR-007**: System MUST accept invoice uploads in PDF and common image formats (JPEG, PNG)
- **FR-008**: System MUST process uploaded files through OCR pipeline using Tesseract (Hebrew + English)
- **FR-009**: System MUST send OCR text to LLM (Ollama) for structured data extraction into defined JSON schema
- **FR-010**: System MUST validate extracted data against schema before persistence
- **FR-011**: System MUST display loading state during invoice processing
- **FR-012**: System MUST show success/failure notification via snackbar after processing
- **FR-013**: System MUST automatically match extracted vendor to existing vendor list or create new vendor
- **FR-014**: System MUST handle currency conversion when invoice currency differs from system currency using exchangeratesapi.io

#### Vendor Management

- **FR-015**: System MUST allow users to add new vendors/businesses
- **FR-016**: System MUST allow users to edit vendor names
- **FR-017**: System MUST allow users to reorder vendors via drag-and-drop
- **FR-018**: System MUST allow users to delete vendors with confirmation dialog
- **FR-019**: System MUST cascade delete all related invoices when vendor is deleted (POC behavior)

#### Invoice Management

- **FR-020**: System MUST display invoices grouped by month/year with expandable sections
- **FR-021**: System MUST support search functionality across invoices
- **FR-022**: System MUST implement backend pagination for invoice lists
- **FR-023**: System MUST allow editing of invoice: name, amount, currency, date, vendor assignment
- **FR-024**: System MUST allow invoice deletion with confirmation

#### Home Screen

- **FR-025**: System MUST show empty state with CTAs "Add Business" and "Upload an Invoice" when no data exists
- **FR-026**: System MUST display vendor cards with latest 5 invoices expandable per vendor
- **FR-027**: System MUST provide "See All" navigation to full invoice list per vendor
- **FR-028**: System MUST always show upload button on Home screen

#### Analytics & Insights

- **FR-029**: System MUST compute and display vendor KPIs: Current Monthly Spend, Monthly Limit (editable), Monthly AVG, Yearly AVG
- **FR-030**: System MUST display pie chart for top 5 vendors by spend
- **FR-031**: System MUST display line chart for spend by month
- **FR-032**: System MUST compute aggregate KPI: remaining balance (total limits - total spend)
- **FR-033**: System MUST support CSV export for analytics data
- **FR-034**: System MUST generate AI insights based on SQL-computed metrics (LLM summarizes, does not compute)

#### Settings

- **FR-035**: System MUST allow users to edit their display name
- **FR-036**: System MUST allow users to change system currency with currency picker

### Key Entities

- **User/Tenant**: Authenticated user serving as tenant. Attributes: id, email, fullName, personalBusinessId, systemCurrency, createdAt
- **Vendor (Business)**: Supplier/merchant on invoices. Attributes: id, tenantId, name, displayOrder, monthlyLimit, createdAt
- **Invoice**: Financial document. Attributes: id, tenantId, vendorId, name, originalAmount, originalCurrency, normalizedAmount, fxRate, fxDate, invoiceDate, fileUrl, extractedData, createdAt
- **Insight**: AI-generated recommendation. Attributes: id, tenantId, insightType, content, relatedMetrics, generatedAt

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete registration in under 2 minutes
- **SC-002**: Invoice upload and extraction completes within 30 seconds for standard invoices
- **SC-003**: 90% of invoice extractions produce accurate vendor and amount data without manual correction
- **SC-004**: Users can find any invoice using search within 3 seconds
- **SC-005**: Analytics dashboards load within 2 seconds
- **SC-006**: CSV export generates and downloads within 5 seconds for up to 1000 invoices
- **SC-007**: System maintains complete tenant isolation with zero cross-tenant data leaks
- **SC-008**: OCR successfully processes invoices in both Hebrew and English
- **SC-009**: Users can complete the full journey (signup → upload → view analytics) in under 5 minutes
- **SC-010**: AI insights provide actionable recommendations that users find valuable

---

## Assumptions

1. Supabase provides the authentication backend with JWT tokens containing `sub` claim
2. Tesseract OCR is available locally with Hebrew and English language packs
3. Ollama is running locally with an appropriate LLM model for structured extraction
4. exchangeratesapi.io API is accessible for currency conversion (free tier sufficient for POC)
5. Users have modern browsers supporting drag-and-drop and file uploads
6. PDF invoices are text-based or have sufficient quality for OCR
7. Invoice amounts are in recognizable currency formats
8. Single-user concurrent usage is sufficient for POC (no horizontal scaling required)
9. Soft delete is out of scope for POC; hard delete is acceptable
10. Email/FTP export integrations are out of scope; CSV download is sufficient

---

## Out of Scope (POC)

- Multi-user organization/team accounts
- Invoice approval workflows
- Recurring invoice detection
- Mobile native applications (web responsive only)
- Email/FTP export integrations
- Historical FX rate lookups (using "latest" endpoint only)
- Invoice categories (using vendors as primary grouping)
- Soft delete functionality
- Audit logging beyond basic timestamps
