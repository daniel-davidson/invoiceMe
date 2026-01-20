# Tasks: InvoiceMe MVP

**Branch**: `001-invoiceme-mvp` | **Date**: 2026-01-18  
**Input**: Design documents from `/specs/001-invoiceme-mvp/`  
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ ✅, research.md ✅, quickstart.md ✅

---

## Format: `[ID] [P?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- Tasks organized by milestones per user request

---

## Milestone 0: Repository + Specification Documents

**Purpose**: Establish spec documents as source of truth for all implementation decisions

**Acceptance**: Specs are consistent and remove ambiguity about tenant/vendor/currency/PDF handling

- [ ] T001 Create project root structure with backend/ and frontend/ directories
- [ ] T002 [P] Create specs/001-invoiceme-mvp/PRD.md summarizing product requirements from spec.md
- [ ] T003 [P] Verify specs/001-invoiceme-mvp/data-model.md contains complete Prisma schema with tenantId
- [ ] T004 [P] Create specs/001-invoiceme-mvp/API_CONTRACTS.md summarizing all endpoints from contracts/*.yaml
- [ ] T005 [P] Create specs/001-invoiceme-mvp/PIPELINE.md documenting OCR→LLM extraction flow with state machine
- [ ] T006 [P] Create specs/001-invoiceme-mvp/AI_INSIGHTS.md documenting 3 insight types and SQL→LLM rules
- [ ] T007 [P] Create specs/001-invoiceme-mvp/TEST_PLAN.md with unit, integration, and smoke test scenarios
- [ ] T008 [P] Create specs/001-invoiceme-mvp/RUNBOOK.md with local setup steps (Postgres, Supabase, Ollama, Tesseract)
- [ ] T009 [P] Create specs/001-invoiceme-mvp/DECISIONS.md consolidating research.md technical decisions

**Checkpoint**: All spec documents complete and consistent

---

## Milestone 1: Database + Prisma Schema

**Purpose**: Establish database foundation with tenant isolation

**Acceptance**: Can query invoices by tenant and vendor; indexes exist for tenantId, vendorId, invoiceDate

### Backend Setup

- [ ] T010 Initialize NestJS project in backend/ with `nest new backend --skip-git`
- [ ] T011 Install Prisma dependencies in backend/package.json (`prisma`, `@prisma/client`)
- [ ] T012 Create backend/prisma/schema.prisma with datasource and generator blocks
- [ ] T013 [P] Define User model in backend/prisma/schema.prisma with all fields from data-model.md
- [ ] T014 [P] Define Vendor model in backend/prisma/schema.prisma with tenantId FK and indexes
- [ ] T015 [P] Define Invoice model in backend/prisma/schema.prisma with tenantId, vendorId FKs and all fields
- [ ] T016 [P] Define ExtractionRun model in backend/prisma/schema.prisma with status enum
- [ ] T017 [P] Define Insight model in backend/prisma/schema.prisma with insightType enum
- [ ] T018 [P] Define FxRateCache model in backend/prisma/schema.prisma (optional DB cache)
- [ ] T019 Add composite indexes for (tenantId), (tenantId, vendorId), (tenantId, invoiceDate) in schema.prisma
- [ ] T020 Run `npx prisma migrate dev --name init` to create initial migration in backend/prisma/migrations/
- [ ] T021 Create backend/prisma/seed.ts with demo user, 5 vendors, 20 invoices
- [ ] T022 Add seed script to backend/package.json and run `npx prisma db seed`
- [ ] T023 Create backend/src/prisma/prisma.module.ts with PrismaService
- [ ] T024 Create backend/src/prisma/prisma.service.ts extending PrismaClient with onModuleInit

**Checkpoint**: Database schema deployed, seed data queryable

---

## Milestone 2: Authentication (Supabase) + Tenant Guard

**Purpose**: Implement JWT verification and tenant isolation middleware

**Acceptance**: Protected endpoints reject invalid token; tenantId available in controllers/services

### Auth Module

- [ ] T025 Install auth dependencies: `@nestjs/passport`, `@nestjs/jwt`, `passport`, `passport-jwt`
- [ ] T026 Create backend/.env.example with SUPABASE_URL, SUPABASE_JWT_SECRET, DATABASE_URL
- [ ] T027 Create backend/src/config/configuration.ts with environment variable validation
- [ ] T028 Create backend/src/auth/auth.module.ts importing PassportModule and JwtModule
- [ ] T029 Create backend/src/auth/strategies/jwt.strategy.ts verifying Supabase JWT with `sub` extraction
- [ ] T030 Create backend/src/auth/dto/login.dto.ts with email, password validation
- [ ] T031 Create backend/src/auth/dto/signup.dto.ts with fullName, email, password, systemCurrency validation
- [ ] T032 Create backend/src/auth/auth.service.ts with signUp, signIn, signOut methods proxying to Supabase
- [ ] T033 Create backend/src/auth/auth.controller.ts with POST /auth/signup, POST /auth/login, POST /auth/logout

### Tenant Guard Infrastructure

- [ ] T034 Create backend/src/common/interfaces/request-with-tenant.ts extending Express Request with tenantId
- [ ] T035 Create backend/src/common/decorators/tenant.decorator.ts with @Tenant() param decorator
- [ ] T036 Create backend/src/common/guards/tenant.guard.ts extracting tenantId from JWT sub claim
- [ ] T037 Create backend/src/common/guards/jwt-auth.guard.ts extending AuthGuard('jwt')
- [ ] T038 Create backend/src/common/filters/http-exception.filter.ts with standardized error responses
- [ ] T039 Register TenantGuard as global guard in backend/src/app.module.ts
- [ ] T040 Create backend/src/users/users.module.ts
- [ ] T041 Create backend/src/users/users.service.ts with findById, create, update methods (tenant-scoped)
- [ ] T042 Create backend/src/users/users.controller.ts with GET /settings/profile, PATCH /settings/profile

**Checkpoint**: Auth flow works end-to-end; tenantId injected into all protected requests

---

## Milestone 3: File Upload + Extraction Pipeline

**Purpose**: Implement invoice upload with OCR, LLM extraction, vendor matching, and currency conversion

**Acceptance**: Uploading a sample invoice creates vendor and invoice; returns success; failure recorded with reason

### Storage Module

- [ ] T043 Install file handling dependencies: `multer`, `@types/multer`
- [ ] T044 Create backend/src/storage/storage.module.ts
- [ ] T045 Create backend/src/storage/storage.service.ts with saveFile, getFile, deleteFile methods
- [ ] T046 Configure multer in storage.module.ts with destination `uploads/{tenantId}/`
- [ ] T047 Add `uploads/` to backend/.gitignore

### OCR Module

- [ ] T048 Install OCR dependencies: `tesseract.js`, `pdf-parse`, `pdf-poppler`
- [ ] T049 Create backend/src/extraction/ocr/pdf-processor.ts with extractTextFromPdf, convertPdfToImages
- [ ] T050 Create backend/src/extraction/ocr/ocr.service.ts wrapping Tesseract.js with heb+eng languages
- [ ] T051 Implement PDF text detection: if text > 50 chars, skip OCR; else convert to images and OCR
- [ ] T052 Limit PDF processing to first 2 pages in pdf-processor.ts

### LLM Module

- [ ] T053 Install HTTP client: `axios` (if not already installed)
- [ ] T054 Create backend/src/extraction/llm/extraction-schema.ts with JSON schema definition from plan.md
- [ ] T055 Create backend/src/extraction/llm/ollama.service.ts with HTTP client to localhost:11434
- [ ] T056 Implement extractFromText method with prompt template returning strict JSON schema
- [ ] T057 Add retry logic (max 2 retries) for Ollama connection failures

### Vendor Matching

- [ ] T058 Create backend/src/extraction/vendor-matcher.service.ts with normalizeVendorName function
- [ ] T059 Implement matchVendor: exact match → fuzzy match (Levenshtein ≤ 2) → create new vendor
- [ ] T060 Add tenant-scoped vendor lookup in vendor-matcher.service.ts

### Currency Module

- [ ] T061 Create backend/src/currency/currency.module.ts
- [ ] T062 Create backend/src/currency/fx-cache.service.ts with in-memory Map and 12h TTL
- [ ] T063 Create backend/src/currency/currency.service.ts calling exchangeratesapi.io /latest endpoint
- [ ] T064 Implement convert method: fetch rate → apply → return { normalizedAmount, fxRate, fxDate }
- [ ] T065 Add graceful fallback when API unavailable (store original currency, flag for later)

### Extraction Orchestration

- [ ] T066 Create backend/src/extraction/extraction.module.ts importing all sub-modules
- [ ] T067 Create backend/src/extraction/extraction.service.ts orchestrating full pipeline
- [ ] T068 Implement processInvoice: saveFile → detectPdfText/OCR → LLM extract → validate → matchVendor → convertCurrency
- [ ] T069 Create ExtractionRun record with status transitions: PENDING → OCR_COMPLETE → LLM_COMPLETE → SUCCESS/ERROR
- [ ] T070 Implement validation rules: positive amount, valid date, valid currency, confidence ≥ 0.7
- [ ] T071 Set needsReview = true on validation failures or low confidence

### Invoices Module (Upload)

- [ ] T072 Create backend/src/invoices/invoices.module.ts importing ExtractionModule
- [ ] T073 Create backend/src/invoices/dto/upload-invoice.dto.ts with file validation
- [ ] T074 Create backend/src/invoices/invoices.service.ts with upload method calling extraction.service
- [ ] T075 Create backend/src/invoices/invoices.controller.ts with POST /invoices/upload using @UseInterceptors(FileInterceptor)
- [ ] T076 Return { invoice, vendor, extraction: { status, confidence, warnings } } on success

**Checkpoint**: Can upload invoice, see extracted data, vendor created/matched

---

## Milestone 4: CRUD APIs

**Purpose**: Implement all entity management endpoints with tenant scoping

**Acceptance**: All endpoints are tenant-scoped; pagination works

### Vendors CRUD

- [ ] T077 Create backend/src/vendors/vendors.module.ts
- [ ] T078 Create backend/src/vendors/dto/create-vendor.dto.ts with name, monthlyLimit validation
- [ ] T079 Create backend/src/vendors/dto/update-vendor.dto.ts extending PartialType
- [ ] T080 Create backend/src/vendors/dto/reorder-vendors.dto.ts with vendorIds array
- [ ] T081 Create backend/src/vendors/vendors.service.ts with list, create, update, delete, reorder methods
- [ ] T082 Ensure ALL vendor queries include WHERE tenantId = @tenantId
- [ ] T083 Implement cascade delete: delete vendor → delete all related invoices
- [ ] T084 Create backend/src/vendors/vendors.controller.ts with GET/POST/PATCH/DELETE /vendors endpoints
- [ ] T085 Add POST /vendors/reorder endpoint updating displayOrder

### Invoices CRUD

- [ ] T086 Create backend/src/invoices/dto/update-invoice.dto.ts with name, amount, currency, date, vendorId
- [ ] T087 Create backend/src/invoices/dto/invoice-query.dto.ts with vendorId, search, startDate, endDate, page, limit
- [ ] T088 Extend invoices.service.ts with list, getById, update, delete methods
- [ ] T089 Implement pagination in list: offset/limit with total count
- [ ] T090 Implement search: ILIKE on invoice name, vendor name
- [ ] T091 Extend invoices.controller.ts with GET /invoices, GET /invoices/:id, PATCH /invoices/:id, DELETE /invoices/:id
- [ ] T092 Add GET /invoices/:id/file endpoint serving file from storage with tenant verification

### Settings/Users

- [ ] T093 Create backend/src/users/dto/update-user.dto.ts with fullName, systemCurrency
- [ ] T094 Extend users.service.ts with updateProfile, updateSystemCurrency methods
- [ ] T095 Add PATCH /settings/currency endpoint with currency code validation
- [ ] T096 Create backend/src/settings/settings.controller.ts aggregating profile endpoints

**Checkpoint**: All CRUD operations work with tenant isolation verified

---

## Milestone 5: Analytics Queries

**Purpose**: Implement SQL aggregations for dashboards

**Acceptance**: Correct calculations verified with test fixtures

### Analytics Module

- [ ] T097 Create backend/src/analytics/analytics.module.ts
- [ ] T098 Create backend/src/analytics/dto/analytics-response.dto.ts with KPIs, pieData, lineData shapes
- [ ] T099 Create backend/src/analytics/analytics.service.ts with SQL aggregation queries

### Vendor Analytics

- [ ] T100 Implement getVendorKPIs: current month spend, monthly avg, yearly avg (tenant + vendor scoped)
- [ ] T101 Implement getVendorPieData: top 5 sub-categories or breakdown (for single vendor context)
- [ ] T102 Implement getVendorLineData: monthly spend for last 12 months
- [ ] T103 Add monthlyLimit from vendor record to KPIs response

### Overall Analytics

- [ ] T104 Implement getOverallKPIs: total spend, total limits, remaining balance, vendor count
- [ ] T105 Implement getOverallPieData: top 5 vendors by spend
- [ ] T106 Implement getOverallLineData: monthly spend across all vendors for last 12 months

### Analytics Controller

- [ ] T107 Create backend/src/analytics/analytics.controller.ts
- [ ] T108 Add GET /analytics/vendor/:vendorId endpoint
- [ ] T109 Add GET /analytics/overall endpoint
- [ ] T110 Add PATCH /analytics/vendor/:vendorId/limit endpoint to update monthlyLimit

**Checkpoint**: Analytics endpoints return correct aggregated data

---

## Milestone 6: AI Insights Generation

**Purpose**: Implement LLM-powered insights from SQL metrics

**Acceptance**: Insights generated and displayed; stored per tenant and time; never contradict SQL totals

### Insights Module

- [ ] T111 Create backend/src/insights/insights.module.ts importing AnalyticsModule
- [ ] T112 Create backend/src/insights/dto/insight.dto.ts with InsightType enum, content, relatedMetrics
- [ ] T113 Create backend/src/insights/insights.service.ts

### Insight Generation

- [ ] T114 Implement computeMonthlyNarrativeMetrics: SQL for current vs previous month, top vendor change
- [ ] T115 Implement computeRecurringChargesMetrics: SQL detecting repeated vendor+amount patterns
- [ ] T116 Implement computeAnomaliesMetrics: SQL for duplicates (same vendor+amount+date), spikes (>3x avg)
- [ ] T117 Create generateInsight method: compute SQL metrics → format prompt → call Ollama → parse narrative
- [ ] T118 Store generated insights in Insight table with tenantId, metrics JSON, narrative

### Insights Controller

- [ ] T119 Create backend/src/insights/insights.controller.ts
- [ ] T120 Add GET /insights endpoint listing recent insights for tenant
- [ ] T121 Add POST /insights/generate endpoint triggering insight generation
- [ ] T122 Add GET /insights/:id endpoint returning insight with full metrics
- [ ] T123 Add DELETE /insights/:id endpoint

**Checkpoint**: Insights generated correctly from SQL data, narratives coherent

---

## Milestone 7: Flutter UI

**Purpose**: Implement complete frontend with Clean Architecture and Riverpod

**Acceptance**: Complete user journey works with backend; loading/snackbar behavior correct; drag reorder works

### Flutter Project Setup

- [ ] T124 Create Flutter project in frontend/ with `flutter create frontend`
- [ ] T125 Configure frontend/pubspec.yaml with all dependencies from plan.md
- [ ] T126 Run `flutter pub get` to install dependencies
- [ ] T127 Create frontend/lib/core/constants/api_constants.dart with baseUrl, supabaseUrl
- [ ] T128 Create frontend/lib/core/constants/app_constants.dart with app name, default currency
- [ ] T129 Create frontend/lib/core/theme/app_theme.dart with light theme configuration
- [ ] T130 Create frontend/lib/core/network/api_client.dart with Dio instance and base configuration
- [ ] T131 Create frontend/lib/core/network/auth_interceptor.dart adding JWT to requests
- [ ] T132 Create frontend/lib/core/error/failures.dart with Failure classes
- [ ] T133 Create frontend/lib/core/error/exceptions.dart with ServerException, CacheException
- [ ] T134 Create frontend/lib/core/utils/currency_formatter.dart
- [ ] T135 Create frontend/lib/core/utils/date_formatter.dart
- [ ] T136 Configure frontend/lib/app.dart with MaterialApp and GoRouter

### Shared Widgets

- [ ] T137 Create frontend/lib/shared/widgets/loading_indicator.dart
- [ ] T138 Create frontend/lib/shared/widgets/error_snackbar.dart
- [ ] T139 Create frontend/lib/shared/widgets/confirmation_dialog.dart
- [ ] T140 Create frontend/lib/shared/providers/shared_providers.dart with Dio provider

### Auth Feature (US1)

- [ ] T141 [P] [US1] Create frontend/lib/features/auth/domain/entities/user.dart
- [ ] T142 [P] [US1] Create frontend/lib/features/auth/domain/repositories/auth_repository.dart (abstract)
- [ ] T143 [US1] Create frontend/lib/features/auth/domain/usecases/login.dart
- [ ] T144 [US1] Create frontend/lib/features/auth/domain/usecases/signup.dart
- [ ] T145 [US1] Create frontend/lib/features/auth/domain/usecases/logout.dart
- [ ] T146 [US1] Create frontend/lib/features/auth/data/models/user_model.dart
- [ ] T147 [US1] Create frontend/lib/features/auth/data/datasources/auth_remote_datasource.dart
- [ ] T148 [US1] Create frontend/lib/features/auth/data/repositories/auth_repository_impl.dart
- [ ] T149 [US1] Create frontend/lib/features/auth/presentation/providers/auth_notifier.dart (Riverpod)
- [ ] T150 [US1] Create frontend/lib/features/auth/presentation/screens/welcome_screen.dart
- [ ] T151 [US1] Create frontend/lib/features/auth/presentation/screens/login_screen.dart
- [ ] T152 [US1] Create frontend/lib/features/auth/presentation/screens/signup_screen.dart with currency_picker
- [ ] T153 [US1] Create frontend/lib/features/auth/presentation/widgets/auth_form.dart

### Home Feature (US2 partial)

- [ ] T154 [US2] Create frontend/lib/features/home/domain/entities/vendor_summary.dart
- [ ] T155 [US2] Create frontend/lib/features/home/presentation/providers/home_notifier.dart
- [ ] T156 [US2] Create frontend/lib/features/home/presentation/screens/home_screen.dart
- [ ] T157 [US2] Create frontend/lib/features/home/presentation/widgets/empty_state.dart with CTAs
- [ ] T158 [US2] Create frontend/lib/features/home/presentation/widgets/vendor_card.dart with expandable invoices
- [ ] T159 [US2] Create frontend/lib/features/home/presentation/widgets/upload_fab.dart

### Invoices Feature (US2 upload, US4 list/edit)

- [ ] T160 [US2] Create frontend/lib/features/invoices/domain/entities/invoice.dart
- [ ] T161 [US2] Create frontend/lib/features/invoices/domain/repositories/invoice_repository.dart
- [ ] T162 [US2] Create frontend/lib/features/invoices/domain/usecases/upload_invoice.dart
- [ ] T163 [US2] Create frontend/lib/features/invoices/data/datasources/invoice_remote_datasource.dart
- [ ] T164 [US2] Create frontend/lib/features/invoices/data/repositories/invoice_repository_impl.dart
- [ ] T165 [US2] Create frontend/lib/features/invoices/presentation/providers/invoices_notifier.dart
- [ ] T166 [US2] Create frontend/lib/features/invoices/presentation/screens/upload_screen.dart with file_picker
- [ ] T167 [US4] Create frontend/lib/features/invoices/presentation/screens/invoices_list_screen.dart with pagination
- [ ] T168 [US4] Create frontend/lib/features/invoices/presentation/screens/invoice_detail_screen.dart
- [ ] T169 [US4] Create frontend/lib/features/invoices/presentation/widgets/invoice_tile.dart
- [ ] T170 [US4] Create frontend/lib/features/invoices/presentation/widgets/month_group.dart
- [ ] T171 [US4] Create frontend/lib/features/invoices/presentation/widgets/search_bar.dart

### Vendors Feature (US3)

- [ ] T172 [US3] Create frontend/lib/features/vendors/domain/entities/vendor.dart
- [ ] T173 [US3] Create frontend/lib/features/vendors/domain/repositories/vendor_repository.dart
- [ ] T174 [US3] Create frontend/lib/features/vendors/domain/usecases/create_vendor.dart
- [ ] T175 [US3] Create frontend/lib/features/vendors/domain/usecases/update_vendor.dart
- [ ] T176 [US3] Create frontend/lib/features/vendors/domain/usecases/delete_vendor.dart
- [ ] T177 [US3] Create frontend/lib/features/vendors/domain/usecases/reorder_vendors.dart
- [ ] T178 [US3] Create frontend/lib/features/vendors/data/datasources/vendor_remote_datasource.dart
- [ ] T179 [US3] Create frontend/lib/features/vendors/data/repositories/vendor_repository_impl.dart
- [ ] T180 [US3] Create frontend/lib/features/vendors/presentation/providers/vendors_notifier.dart
- [ ] T181 [US3] Create frontend/lib/features/vendors/presentation/widgets/vendor_form_dialog.dart
- [ ] T182 [US3] Create frontend/lib/features/vendors/presentation/widgets/delete_confirmation.dart
- [ ] T183 [US3] Implement drag-and-drop reorder in home_screen.dart using ReorderableListView

### Analytics Feature (US5, US6)

- [ ] T184 [US5] Create frontend/lib/features/analytics/domain/entities/analytics_data.dart
- [ ] T185 [US5] Create frontend/lib/features/analytics/domain/repositories/analytics_repository.dart
- [ ] T186 [US5] Create frontend/lib/features/analytics/data/datasources/analytics_remote_datasource.dart
- [ ] T187 [US5] Create frontend/lib/features/analytics/data/repositories/analytics_repository_impl.dart
- [ ] T188 [US5] Create frontend/lib/features/analytics/presentation/providers/analytics_notifier.dart
- [ ] T189 [US5] Create frontend/lib/features/analytics/presentation/screens/vendor_analytics_screen.dart
- [ ] T190 [US5] Create frontend/lib/features/analytics/presentation/widgets/kpi_card.dart
- [ ] T191 [US5] Create frontend/lib/features/analytics/presentation/widgets/pie_chart.dart using fl_chart
- [ ] T192 [US5] Create frontend/lib/features/analytics/presentation/widgets/line_chart.dart using fl_chart
- [ ] T193 [US6] Create frontend/lib/features/analytics/presentation/screens/all_vendors_analytics_screen.dart
- [ ] T194 [US5] [US6] Create frontend/lib/features/analytics/presentation/widgets/export_button.dart

### Export Feature

- [ ] T195 Create backend/src/export/export.module.ts
- [ ] T196 Create backend/src/export/export.service.ts with generateInvoicesCsv, generateAnalyticsCsv
- [ ] T197 Create backend/src/export/export.controller.ts with GET /export/invoices, GET /export/analytics
- [ ] T198 [US5] [US6] Implement CSV download in Flutter using url_launcher or download.js for web

### Settings Feature (US7)

- [ ] T199 [US7] Create frontend/lib/features/settings/domain/entities/user_settings.dart
- [ ] T200 [US7] Create frontend/lib/features/settings/domain/repositories/settings_repository.dart
- [ ] T201 [US7] Create frontend/lib/features/settings/data/datasources/settings_remote_datasource.dart
- [ ] T202 [US7] Create frontend/lib/features/settings/data/repositories/settings_repository_impl.dart
- [ ] T203 [US7] Create frontend/lib/features/settings/presentation/providers/settings_notifier.dart
- [ ] T204 [US7] Create frontend/lib/features/settings/presentation/screens/settings_screen.dart
- [ ] T205 [US7] Create frontend/lib/features/settings/presentation/widgets/currency_picker_tile.dart using currency_picker

### Insights Feature (US8)

- [ ] T206 [US8] Create frontend/lib/features/insights/domain/entities/insight.dart
- [ ] T207 [US8] Create frontend/lib/features/insights/domain/repositories/insight_repository.dart
- [ ] T208 [US8] Create frontend/lib/features/insights/data/datasources/insight_remote_datasource.dart
- [ ] T209 [US8] Create frontend/lib/features/insights/data/repositories/insight_repository_impl.dart
- [ ] T210 [US8] Create frontend/lib/features/insights/presentation/providers/insights_notifier.dart
- [ ] T211 [US8] Create frontend/lib/features/insights/presentation/widgets/insight_card.dart

### App Routing

- [ ] T212 Configure GoRouter in frontend/lib/app.dart with all routes
- [ ] T213 Implement auth state redirect (unauthenticated → welcome, authenticated → home)
- [ ] T214 Create frontend/lib/main.dart with ProviderScope and runApp

**Checkpoint**: Complete UI functional with all screens navigable

---

## Milestone 8: Testing + Runbook

**Purpose**: Ensure quality and enable new developer onboarding

**Acceptance**: A new developer can run locally and upload an invoice successfully

### Backend Unit Tests

- [ ] T215 Create backend/test/auth/auth.service.spec.ts with signup/login tests
- [ ] T216 Create backend/test/vendors/vendors.service.spec.ts with CRUD + tenant isolation tests
- [ ] T217 Create backend/test/invoices/invoices.service.spec.ts with upload validation tests
- [ ] T218 Create backend/test/extraction/extraction.service.spec.ts with OCR/LLM mocks
- [ ] T219 Create backend/test/analytics/analytics.service.spec.ts with KPI calculation tests
- [ ] T220 Create backend/test/insights/insights.service.spec.ts with metric generation tests

### Backend Integration Tests

- [ ] T221 Create backend/test/e2e/auth.e2e-spec.ts with full auth flow
- [ ] T222 Create backend/test/e2e/upload-pipeline.e2e-spec.ts with sample PDF upload
- [ ] T223 Create backend/test/e2e/tenant-isolation.e2e-spec.ts verifying cross-tenant blocked
- [ ] T224 Add test fixtures: sample invoices (PDF, image) in backend/test/fixtures/

### Frontend Tests

- [ ] T225 Create frontend/test/features/auth/auth_notifier_test.dart
- [ ] T226 Create frontend/test/features/home/home_screen_test.dart widget test
- [ ] T227 Create frontend/test/features/invoices/upload_screen_test.dart widget test

### Runbook Finalization

- [ ] T228 Update specs/001-invoiceme-mvp/RUNBOOK.md with verified step-by-step local setup
- [ ] T229 Add troubleshooting section for common issues (Tesseract, Ollama, DB connection)
- [ ] T230 Create backend/.env.example with all required variables documented
- [ ] T231 Create frontend/lib/core/constants/api_constants.dart.example

### Smoke Test

- [ ] T232 Execute manual smoke test: signup → login → upload invoice → view analytics → generate insight
- [ ] T233 Document smoke test results in specs/001-invoiceme-mvp/TEST_RESULTS.md

**Checkpoint**: All tests pass, runbook validated, smoke test successful

---

## Dependencies & Execution Order

### Phase Dependencies

```
Milestone 0 (Specs)
     │
     ▼
Milestone 1 (Database) ──────────┐
     │                            │
     ▼                            │
Milestone 2 (Auth + Guard) ◄─────┘
     │
     ▼
Milestone 3 (Upload Pipeline)
     │
     ▼
Milestone 4 (CRUD APIs)
     │
     ├──────────────────────────────┐
     ▼                              ▼
Milestone 5 (Analytics)    Milestone 7 (Flutter UI - US1, US2, US3, US4)
     │                              │
     ▼                              ▼
Milestone 6 (AI Insights)  Milestone 7 (Flutter UI - US5, US6, US7, US8)
     │                              │
     └──────────────┬───────────────┘
                    ▼
            Milestone 8 (Testing + Runbook)
```

### Parallel Opportunities

**Within Milestone 0**: T002-T009 can all run in parallel  
**Within Milestone 1**: T013-T018 (model definitions) can run in parallel  
**Within Milestone 7**: Different feature folders can be developed in parallel  
**Cross-Milestone**: Backend (M1-M6) and early Flutter UI (M7 setup through US3) can proceed in parallel once M2 is complete

---

## Task Summary

| Milestone | Task Range | Count | Purpose |
|-----------|------------|-------|---------|
| M0: Specs | T001-T009 | 9 | Documentation |
| M1: Database | T010-T024 | 15 | Schema + Seed |
| M2: Auth | T025-T042 | 18 | Auth + Tenant Guard |
| M3: Pipeline | T043-T076 | 34 | Upload + Extraction |
| M4: CRUD | T077-T096 | 20 | Entity APIs |
| M5: Analytics | T097-T110 | 14 | SQL Aggregations |
| M6: Insights | T111-T123 | 13 | AI Generation |
| M7: Flutter | T124-T214 | 91 | Complete UI |
| M8: Testing | T215-T233 | 19 | Tests + Runbook |
| **Total** | **T001-T233** | **233** | |

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete M0 (Specs) + M1 (DB) + M2 (Auth) + M3 (Pipeline) + M4 (CRUD partial)
2. Complete Flutter US1 (Auth) + US2 (Upload)
3. **STOP and VALIDATE**: Users can signup, upload invoice, see result

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| 1 | US1 + US2 | Auth + Invoice Upload |
| 2 | US3 + US4 | Vendor + Invoice Management |
| 3 | US5 + US6 | Analytics Dashboards |
| 4 | US7 + US8 | Settings + AI Insights |

### Notes

- Every task includes exact file path for LLM executability
- [P] marks parallelizable tasks within same milestone
- [US#] marks user story association for traceability
- Tenant isolation verified at every database-touching task
- No Docker required - all services run locally
