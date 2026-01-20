# Product Requirements Document: InvoiceMe MVP

**Version**: 1.0
**Date**: 2026-01-18
**Status**: Active
**Source**: [spec.md](./spec.md)

---

## Executive Summary

InvoiceMe is a multi-tenant B2C invoice management application that enables users to upload invoices (PDF or images), automatically extract structured data using OCR and LLM technology, manage vendors, view analytics dashboards, and receive AI-generated spending insights. The system is designed to run locally without Docker dependencies while supporting shareable demos via Supabase-hosted database.

---

## Product Vision

Enable individuals and small businesses to effortlessly manage their invoices through automated data extraction, providing actionable insights into spending patterns without manual data entry.

---

## Core Domain Definitions

| Term | Definition |
|------|------------|
| **Tenant** | An authenticated user (B2C model). `tenantId` = `userId` from Supabase Auth JWT `sub` claim |
| **Business/Vendor** | The supplier/vendor on an invoice where money was spent (e.g., Cellcom, IKEA, Google). UI displays "Business" but semantically represents vendor/supplier |
| **Invoice** | A financial document belonging to exactly one Vendor and one Tenant |
| **System Currency** | User's preferred currency for displaying normalized totals and analytics |

---

## User Stories

### Priority 1 (P1) - Core Value

#### US1: User Registration and Authentication
**As a** new user
**I want to** create an account and log in securely
**So that** I can access my personal invoice dashboard

**Acceptance Criteria**:
- Registration form collects: Full Name, Email, Password, Personal/Business ID, System Currency
- Email/password authentication via Supabase Auth
- Session management with automatic redirect on expiration
- Error messages don't reveal which credential is incorrect

#### US2: Invoice Upload and Processing
**As a** user
**I want to** upload invoice PDFs or images and have data automatically extracted
**So that** I don't have to manually enter invoice details

**Acceptance Criteria**:
- Accepts PDF and common image formats (JPEG, PNG)
- Shows loading indicator during processing
- Displays success/failure notification via snackbar
- Automatically creates new vendors when detected
- Handles currency conversion when invoice currency differs from system currency

### Priority 2 (P2) - Essential Features

#### US3: Vendor (Business) Management
**As a** user
**I want to** add, edit, reorder, and delete vendors
**So that** I can organize my invoices by supplier

**Acceptance Criteria**:
- Add new vendors via popup form
- Edit vendor names
- Drag-and-drop reordering with persistence
- Delete vendors with confirmation (cascades to invoices)

#### US4: Invoice Viewing and Editing
**As a** user
**I want to** view and edit my invoices
**So that** I can correct extraction errors and browse history

**Acceptance Criteria**:
- Invoices grouped by month/year with expandable sections
- Pagination for large lists
- Search functionality across invoice and vendor names
- Edit: name, amount, currency, date, vendor assignment
- Delete with confirmation

#### US5: Vendor Analytics Dashboard
**As a** user
**I want to** view spending analytics for a specific vendor
**So that** I can track spending patterns and stay within budget

**Acceptance Criteria**:
- KPI cards: Current Monthly Spend, Monthly Limit (editable), Monthly AVG, Yearly AVG
- Pie chart showing spending breakdown
- Line chart showing monthly spend trend
- CSV export capability

### Priority 3 (P3) - Enhancement Features

#### US6: Overall Analytics Dashboard
**As a** user
**I want to** view aggregate spending analytics across all vendors
**So that** I can understand my overall financial picture

**Acceptance Criteria**:
- KPI showing remaining balance (total limits - total spend)
- Pie chart of top 5 vendors by spend
- Line chart of overall monthly spend
- CSV export capability

#### US7: User Settings
**As a** user
**I want to** update my profile settings
**So that** I can personalize my experience

**Acceptance Criteria**:
- Edit display name
- Change system currency with currency picker
- All amounts re-normalized to new currency

#### US8: AI-Generated Insights
**As a** user
**I want to** receive AI-generated insights about my spending
**So that** I can make informed financial decisions

**Acceptance Criteria**:
- AI-generated summaries based on spending patterns
- Insights based on SQL-computed metrics (LLM summarizes, doesn't compute)
- Insights update as spending patterns change

---

## Functional Requirements

### Authentication & Multi-Tenancy

- **FR-001**: Display welcome screen with "Login" and "Sign Up" for unauthenticated users
- **FR-002**: Collect Full Name, Email, Password, Personal/Business ID, System Currency during registration
- **FR-003**: Authenticate users via Supabase Auth (email/password)
- **FR-004**: Derive `tenantId` from Supabase Auth JWT `sub` claim
- **FR-005**: Scope ALL data queries by `tenantId` with no exceptions
- **FR-006**: Prevent any cross-tenant data access

### Invoice Upload & Processing

- **FR-007**: Accept invoice uploads in PDF and common image formats (JPEG, PNG)
- **FR-008**: Process uploaded files through OCR pipeline using Tesseract (Hebrew + English)
- **FR-009**: Send OCR text to LLM (Ollama) for structured data extraction
- **FR-010**: Validate extracted data against schema before persistence
- **FR-011**: Display loading state during invoice processing
- **FR-012**: Show success/failure notification via snackbar
- **FR-013**: Automatically match extracted vendor or create new vendor
- **FR-014**: Handle currency conversion using exchangeratesapi.io

### Vendor Management

- **FR-015**: Allow users to add new vendors/businesses
- **FR-016**: Allow users to edit vendor names
- **FR-017**: Allow users to reorder vendors via drag-and-drop
- **FR-018**: Allow users to delete vendors with confirmation dialog
- **FR-019**: Cascade delete all related invoices when vendor is deleted

### Invoice Management

- **FR-020**: Display invoices grouped by month/year with expandable sections
- **FR-021**: Support search functionality across invoices
- **FR-022**: Implement backend pagination for invoice lists
- **FR-023**: Allow editing of invoice: name, amount, currency, date, vendor assignment
- **FR-024**: Allow invoice deletion with confirmation

### Home Screen

- **FR-025**: Show empty state with CTAs "Add Business" and "Upload an Invoice"
- **FR-026**: Display vendor cards with latest 5 invoices expandable per vendor
- **FR-027**: Provide "See All" navigation to full invoice list per vendor
- **FR-028**: Always show upload button on Home screen

### Analytics & Insights

- **FR-029**: Compute and display vendor KPIs: Current Monthly Spend, Monthly Limit (editable), Monthly AVG, Yearly AVG
- **FR-030**: Display pie chart for top 5 vendors by spend
- **FR-031**: Display line chart for spend by month
- **FR-032**: Compute aggregate KPI: remaining balance (total limits - total spend)
- **FR-033**: Support CSV export for analytics data
- **FR-034**: Generate AI insights based on SQL-computed metrics

### Settings

- **FR-035**: Allow users to edit their display name
- **FR-036**: Allow users to change system currency with currency picker

---

## Non-Functional Requirements

### Performance

- **NFR-001**: Invoice upload and extraction completes within 30 seconds
- **NFR-002**: Analytics dashboards load within 2 seconds
- **NFR-003**: Search returns results within 3 seconds
- **NFR-004**: CSV export completes within 5 seconds for up to 1000 invoices

### Security

- **NFR-005**: Complete tenant isolation with zero cross-tenant data leaks
- **NFR-006**: JWT-based authentication for all protected endpoints
- **NFR-007**: Secure file storage with tenant-scoped access

### Usability

- **NFR-008**: Registration completes in under 2 minutes
- **NFR-009**: Complete user journey (signup → upload → analytics) in under 5 minutes
- **NFR-010**: 90% of invoice extractions produce accurate data without manual correction

### Reliability

- **NFR-011**: OCR successfully processes invoices in both Hebrew and English
- **NFR-012**: Graceful fallback when currency conversion API unavailable

---

## Technical Constraints

1. **Local Runnable**: No Docker required for development/deployment
2. **Multi-Tenancy**: Every user-owned table includes `tenantId`
3. **File Storage**: Store invoice files outside DB (filesystem)
4. **LLM Rules**: SQL computes totals/KPIs; LLM only summarizes/explains
5. **PDF/OCR Rules**:
   - If PDF has selectable text: extract it (no OCR)
   - Else OCR the first 2 pages max
   - OCR uses Tesseract with heb+eng

---

## Success Metrics

- **SC-001**: Users can complete registration in under 2 minutes
- **SC-002**: Invoice upload and extraction completes within 30 seconds
- **SC-003**: 90% of invoice extractions produce accurate vendor and amount data
- **SC-004**: Users can find any invoice using search within 3 seconds
- **SC-005**: Analytics dashboards load within 2 seconds
- **SC-006**: CSV export generates within 5 seconds for up to 1000 invoices
- **SC-007**: System maintains complete tenant isolation with zero cross-tenant data leaks
- **SC-008**: OCR successfully processes invoices in both Hebrew and English
- **SC-009**: Users can complete full journey in under 5 minutes
- **SC-010**: AI insights provide actionable recommendations

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

---

## Assumptions

1. Supabase provides authentication backend with JWT tokens
2. Tesseract OCR available locally with Hebrew and English language packs
3. Ollama running locally with appropriate LLM model
4. exchangeratesapi.io API accessible (free tier sufficient)
5. Users have modern browsers supporting drag-and-drop and file uploads
6. PDF invoices are text-based or have sufficient quality for OCR
7. Invoice amounts in recognizable currency formats
8. Single-user concurrent usage sufficient for POC
9. Soft delete out of scope; hard delete acceptable
10. CSV download sufficient; email/FTP integrations out of scope
