# Implementation Plan - Invoice Items & Business Assignment

**Date**: 2026-01-20  
**Scope**: Implement features 1-11 per new requirements  
**Status**: 🟡 In Progress

---

## Implementation Order (Small Commits)

### 🗄️ **Commit 1: Database Migration**
✅ Files:
- `backend/prisma/schema.prisma` (add InvoiceItem, fileHash, useItemsTotal)
- `backend/prisma/migrations/20260120_add_invoice_items_and_dedupe/migration.sql`

✅ Test: `npx prisma generate` succeeds

---

### 📦 **Commit 2: Backend - Invoice Items DTOs & Helper**
⏭️ Files:
- `backend/src/invoices/dto/invoice-item.dto.ts` (NEW)
- `backend/src/invoices/dto/update-invoice.dto.ts` (add items[], useItemsTotal, invoiceNumber)
- `backend/src/invoices/dto/check-duplicate.dto.ts` (NEW)
- `backend/src/invoices/invoices.service.ts` (add updateWithItems method)

⏭️ Test: Backend compiles

---

### 🔒 **Commit 3: Backend - File Dedupe**
⏭️ Files:
- `backend/src/invoices/invoices.service.ts` (compute fileHash on upload)
- `backend/src/invoices/invoices.controller.ts` (add POST /invoices/check-duplicate)

⏭️ Test: Upload same file twice → 409 Conflict

---

### 🔍 **Commit 4: Backend - Search Enhancement**
⏭️ Files:
- `backend/src/vendors/vendors.service.ts` (add search param)
- `backend/src/invoices/invoices.service.ts` (enhance search: vendor, number, amount)

⏭️ Test: GET /vendors?search=acme, GET /invoices?search=150

---

### 📊 **Commit 5: Backend - CSV Export**
⏭️ Files:
- `backend/src/analytics/analytics.service.ts` (add exportVendorCsv, exportOverallCsv)
- `backend/src/analytics/analytics.controller.ts` (add GET /export endpoints)

⏭️ Test: GET /analytics/vendor/:id/export → CSV download

---

### 🧠 **Commit 6: Backend - LLM Extract Items**
⏭️ Files:
- `backend/src/extraction/llm/extraction-schema.ts` (ensure lineItems in schema)
- `backend/src/extraction/extraction.service.ts` (save extracted items to DB)

⏭️ Test: Upload invoice with items → items stored in invoice_items table

---

### 📱 **Commit 7: Frontend - Remove Camera**
⏭️ Files:
- `frontend/lib/features/home/presentation/providers/home_provider.dart` (remove camera methods)
- `frontend/lib/features/home/presentation/screens/home_screen.dart` (remove camera button)

⏭️ Test: Upload modal only shows Gallery + PDF

---

### 🎯 **Commit 8: Frontend - Post-Upload Assignment Modal**
⏭️ Files:
- `frontend/lib/features/invoices/presentation/widgets/assign_business_modal.dart` (NEW)
- `frontend/lib/features/home/presentation/providers/home_provider.dart` (show modal after upload)

⏭️ Test: Upload invoice → modal appears with business dropdown

---

### ✏️ **Commit 9: Frontend - Edit Invoice Screen**
⏭️ Files:
- `frontend/lib/features/invoices/presentation/screens/edit_invoice_screen.dart` (NEW)
- `frontend/lib/features/invoices/presentation/providers/edit_invoice_provider.dart` (NEW)
- `frontend/lib/features/invoices/domain/models/invoice_item.dart` (NEW model)

⏭️ Test: Navigate to edit, modify fields + items, save

---

### 🔍 **Commit 10: Frontend - Search Inputs**
⏭️ Files:
- `frontend/lib/features/home/presentation/screens/home_screen.dart` (add search for businesses)
- `frontend/lib/features/invoices/presentation/screens/invoices_list_screen.dart` (add search)

⏭️ Test: Type in search → filters list

---

### 🍞 **Commit 11: Frontend - Snackbar Fixes**
⏭️ Files:
- `frontend/lib/core/utils/snackbar_helper.dart` (NEW - single snackbar manager)
- All screens using snackbars (use helper)

⏭️ Test: Multiple actions → only one snackbar at a time

---

## Current Progress

| Commit | Status | Files | Notes |
|--------|--------|-------|-------|
| 1. Database Migration | ✅ Complete | schema.prisma, migration.sql | Prisma client generated |
| 2. Invoice Items DTOs | 🟡 In Progress | DTOs created | Working on service methods |
| 3-11 | ⏭️ Pending | - | - |

---

**Next**: Implement invoices.service.ts updateWithItems method (atomic items update)
