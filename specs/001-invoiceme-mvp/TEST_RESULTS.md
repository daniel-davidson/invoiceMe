# InvoiceMe - Smoke Test Results

**Test Date**: _______________  
**Tester**: _______________  
**Environment**: Local / Staging / Production

---

## Smoke Test Checklist

### Authentication (US1)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 1 | Open app → Welcome screen displays | ⬜ | |
| 2 | Tap "Sign Up" → Registration form appears | ⬜ | |
| 3 | Submit signup with valid data → Success | ⬜ | |
| 4 | Tap "Log In" → Login form appears | ⬜ | |
| 5 | Submit login with valid credentials → Home screen | ⬜ | |
| 6 | Invalid credentials → Error message shown | ⬜ | |
| 7 | Logout → Returns to Welcome screen | ⬜ | |

### Invoice Upload (US2)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 8 | Tap "Upload Invoice" FAB → File picker opens | ⬜ | |
| 9 | Select PDF file → Upload starts | ⬜ | |
| 10 | Loading indicator shows during processing | ⬜ | |
| 11 | Successful upload → Snackbar appears | ⬜ | |
| 12 | New vendor created if not exists | ⬜ | |
| 13 | Invoice appears under correct vendor | ⬜ | |
| 14 | Upload image (JPG/PNG) → Same success flow | ⬜ | |
| 15 | Invalid file type → Error shown | ⬜ | |

### Vendor Management (US3)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 16 | Home screen shows vendor cards | ⬜ | |
| 17 | Tap "Add Business" → Form appears | ⬜ | |
| 18 | Create vendor with name → Success | ⬜ | |
| 19 | Tap vendor card → Expands/navigates | ⬜ | |
| 20 | Long press vendor → Edit option shows | ⬜ | |
| 21 | Edit vendor name → Updates | ⬜ | |
| 22 | Delete vendor → Confirmation dialog | ⬜ | |
| 23 | Confirm delete → Vendor removed | ⬜ | |
| 24 | Drag to reorder vendors → Order persists | ⬜ | |

### Invoice Management (US4)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 25 | View invoices list → Grouped by month | ⬜ | |
| 26 | Search invoices → Filters results | ⬜ | |
| 27 | Tap invoice → Detail screen | ⬜ | |
| 28 | Edit invoice → Save changes | ⬜ | |
| 29 | Delete invoice → Confirmation + removal | ⬜ | |
| 30 | Pagination works on scroll | ⬜ | |

### Single Vendor Analytics (US5)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 31 | Navigate to vendor analytics | ⬜ | |
| 32 | KPI cards display: current spend, limit, avg | ⬜ | |
| 33 | Line chart shows 12-month trend | ⬜ | |
| 34 | Edit monthly limit → Updates | ⬜ | |
| 35 | Export button → CSV downloads | ⬜ | |

### Overall Analytics (US6)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 36 | Navigate to overall analytics | ⬜ | |
| 37 | Total spend and balance shown | ⬜ | |
| 38 | Pie chart shows top 5 vendors | ⬜ | |
| 39 | Line chart shows overall trend | ⬜ | |
| 40 | Export button → CSV downloads | ⬜ | |

### Settings (US7)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 41 | Navigate to Settings | ⬜ | |
| 42 | Edit user name → Saves | ⬜ | |
| 43 | Change system currency → Updates | ⬜ | |
| 44 | Currency picker shows all currencies | ⬜ | |

### AI Insights (US8)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 45 | Navigate to Insights | ⬜ | |
| 46 | "Generate Insights" → Loading shows | ⬜ | |
| 47 | Insights cards display after generation | ⬜ | |
| 48 | Monthly narrative insight present | ⬜ | |
| 49 | Recurring charges insight (if applicable) | ⬜ | |
| 50 | Anomalies insight (if applicable) | ⬜ | |

---

## Performance Tests

| Test | Target | Actual | Status |
|------|--------|--------|--------|
| App launch time | < 3s | ___s | ⬜ |
| Invoice upload (small file) | < 10s | ___s | ⬜ |
| Invoice upload (large file) | < 30s | ___s | ⬜ |
| Analytics page load | < 2s | ___s | ⬜ |
| Insights generation | < 15s | ___s | ⬜ |

---

## Cross-Tenant Isolation Test

| # | Test Case | Status |
|---|-----------|--------|
| 1 | Create User A, add vendor "CompanyX" | ⬜ |
| 2 | Create User B, verify "CompanyX" not visible | ⬜ |
| 3 | User B uploads invoice → Own vendor created | ⬜ |
| 4 | User A cannot see User B's invoices | ⬜ |
| 5 | Analytics only show own tenant's data | ⬜ |

---

## Error Handling Tests

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 1 | Network offline → Appropriate error | ⬜ | |
| 2 | Backend down → Connection error | ⬜ | |
| 3 | Token expired → Redirects to login | ⬜ | |
| 4 | OCR fails → Graceful degradation | ⬜ | |
| 5 | LLM unavailable → Fallback behavior | ⬜ | |

---

## Summary

| Category | Passed | Failed | Blocked |
|----------|--------|--------|---------|
| Authentication | /7 | | |
| Invoice Upload | /8 | | |
| Vendor Mgmt | /9 | | |
| Invoice Mgmt | /6 | | |
| Vendor Analytics | /5 | | |
| Overall Analytics | /5 | | |
| Settings | /4 | | |
| AI Insights | /6 | | |
| **Total** | **/50** | | |

---

## Issues Found

| # | Severity | Description | Steps to Reproduce |
|---|----------|-------------|-------------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## Sign-off

- [ ] All critical tests pass
- [ ] No blockers found
- [ ] Ready for release

**Signed**: _______________  
**Date**: _______________
