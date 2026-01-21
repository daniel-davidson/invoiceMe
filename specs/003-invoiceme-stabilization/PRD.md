# Product Requirements: InvoiceMe Stabilization

**Version**: 003  
**Date**: 2026-01-21  
**Status**: Active Implementation

## Executive Summary

InvoiceMe currently has 20 specific issues that impact user experience and functionality. This PRD defines the scope for fixing these issues to deliver a stable, responsive, and user-friendly MVP.

## Goals

1. **Fix Broken Functionality** (8 items): Profile settings, export, line items edit, password validation, type errors
2. **Improve Responsiveness** (4 items): Mobile layout, charts, dialogs, button sizing
3. **Enhance UX** (8 items): Snackbars, loading indicators, home screen clarity, AI insights, analytics messages

## Target Users

- **Primary**: Small business owners using the app on mobile and web
- **Secondary**: Accountants accessing from desktop
- **Use Cases**: Daily invoice uploads, budget tracking, spending analytics

## The 20 Items

### Critical Fixes (Must Work)
1. App background color independence
2. Mobile responsive layout
3. Password validation consistency (8 chars)
4. Snackbar auto-dismiss + manual dismiss
5. Home empty state (2 centered buttons)
6. Monthly limit in business dialog
7. Home with businesses (centered upload)
8. App bar icon cleanup
9. Remove view file button
10. Line items edit consistency
11. **Profile settings working**
12. Mobile dialog positioning
13. **Export functionality working**
14. **Fix type error in all invoices**
15. **Currency change validation**
16. Image file size validation
17. Analytics loading message
18. Dialog loading indicators
19. AI insights human-friendly
20. Charts responsive with axes

## User Value

**Before Fixes**:
- Users frustrated by broken profile settings
- Export buttons don't work (can't get data out)
- Mobile users see overflowing UI elements
- Confusing duplicate buttons
- Crashes on invoice list screen

**After Fixes**:
- All core functionality works reliably
- Clean, intuitive interface on all devices
- Professional appearance (responsive, polished)
- Clear feedback for all actions
- Data export works

## Success Metrics

- **Functionality**: 100% of 20 items working (20/20)
- **Responsiveness**: 0 overflow errors on mobile
- **User Satisfaction**: Users can complete all tasks without errors
- **Code Quality**: `flutter analyze` passes with 0 errors

## Timeline

- **Phase P0** (Critical): Items 3, 11, 13, 14, 15 - 2-3 days
- **Phase P1** (UX): Items 4, 5, 6, 7, 8, 9, 10, 18 - 3-4 days
- **Phase P2** (Polish): Items 1, 2, 12, 16, 17, 19, 20 - 2-3 days

**Total**: 7-10 days

## Risks

- **Responsive testing**: Requires actual device testing (can't fully simulate)
- **Currency propagation**: Must verify across all screens
- **Mobile dialogs**: Keyboard behavior varies by platform

## Assumptions

- Backend APIs already support all required operations
- Database schema has necessary fields (or can be added)
- No breaking changes to existing functionality
- Users primarily use mobile for uploads, desktop for analytics
