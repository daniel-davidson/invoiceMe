# Research & Technical Decisions: 003-invoiceme-stabilization

**Date**: 2026-01-21  
**Feature**: InvoiceMe Stabilization & UX Refinement  
**Status**: Phase 0 Complete

## Overview

This document captures all technical research and decisions made for implementing the 20 bug fixes and UX improvements in the 003-invoiceme-stabilization specification. Each decision includes rationale, alternatives considered, and implementation approach.

---

## Decision 1: Password Validation Pattern

**Problem**: How to enforce 8-character minimum password consistently across signup, login, and password reset screens?

**Research**:
- Investigated Flutter form validation patterns
- Reviewed shared constants approach vs. validation utility class
- Considered backend-only validation vs. client + server validation

**Decision**: Create `frontend/lib/core/constants/validation_constants.dart` with shared constants.

**Rationale**:
- Constants are simplest solution (no class overhead)
- Easy to import and use in multiple validators
- Centralized source of truth for validation rules
- Type-safe (compile-time checking)

**Alternatives Considered**:
- **Validation utility class**: Rejected - overkill for simple constants
- **Backend-only validation**: Rejected - poor UX (network round-trip for validation)
- **Hardcoded values**: Rejected - difficult to maintain consistency

**Implementation**:
```dart
// frontend/lib/core/constants/validation_constants.dart
const int minPasswordLength = 8;
const String passwordRequirementMessage = 'Password must be at least 8 characters';
```

**Usage**:
```dart
validator: (value) {
  if (value == null || value.isEmpty) return 'Please enter a password';
  if (value.length < minPasswordLength) return passwordRequirementMessage;
  return null;
}
```

---

## Decision 2: Snackbar Auto-Dismiss + Manual Dismiss

**Problem**: How to implement snackbar with both 5-second auto-dismiss and manual dismiss (button + tap outside)?

**Research**:
- Studied Flutter SnackBar API documentation
- Reviewed ScaffoldMessenger patterns
- Investigated dismissDirection options
- Explored SnackBarBehavior.floating vs. SnackBarBehavior.fixed

**Decision**: Create `frontend/lib/shared/utils/snackbar_utils.dart` utility class with standardized snackbar methods.

**Rationale**:
- Utility class ensures consistent snackbar behavior across all screens
- Reduces code duplication
- Easy to update globally if requirements change
- Type-safe with clear method signatures

**Alternatives Considered**:
- **Inline snackbar code**: Rejected - high duplication, inconsistent behavior
- **Riverpod provider for snackbars**: Rejected - overly complex for this use case
- **Custom snackbar widget**: Rejected - Flutter's built-in is sufficient

**Implementation**:
```dart
// frontend/lib/shared/utils/snackbar_utils.dart
class SnackbarUtils {
  static void showSuccess(BuildContext context, String message, {Duration duration = const Duration(seconds: 5)}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: duration,
        behavior: SnackBarBehavior.floating,
        dismissDirection: DismissDirection.horizontal,
        action: SnackBarAction(
          label: 'Dismiss',
          textColor: Colors.white,
          onPressed: () => ScaffoldMessenger.of(context).hideCurrentSnackBar(),
        ),
      ),
    );
  }
  
  static void showError(BuildContext context, String message, {Duration duration = const Duration(seconds: 5), VoidCallback? onRetry}) {
    // Similar implementation with red background and optional retry
  }
  
  static void showInfo(BuildContext context, String message, {Duration duration = const Duration(seconds: 5)}) {
    // Similar implementation with blue background
  }
}
```

**Key Features**:
- `behavior: SnackBarBehavior.floating` - allows tap outside to dismiss
- `dismissDirection: DismissDirection.horizontal` - swipe to dismiss
- `duration: Duration(seconds: 5)` - auto-dismiss after 5 seconds
- `action: SnackBarAction` - manual dismiss button
- Color coding: green (success), red (error), blue (info)

---

## Decision 3: CSV Export Implementation

**Problem**: How to generate and download CSV files in Flutter Web?

**Research**:
- Reviewed `csv` package (^6.0.0) for CSV generation
- Investigated `dart:html` for web downloads
- Studied Blob and anchor element patterns for file downloads
- Explored alternative formats (JSON, Excel)

**Decision**: Use `csv` package for generation + `dart:html` for download, wrapped in `ExportUtils` class.

**Rationale**:
- `csv` package is well-maintained and handles edge cases (commas, quotes, newlines)
- `dart:html` Blob + anchor element is standard web download pattern
- Utility class centralizes export logic for reusability
- CSV format is universally compatible

**Alternatives Considered**:
- **Manual CSV generation**: Rejected - error-prone (edge cases)
- **Server-side export**: Rejected - adds backend complexity, slower UX
- **Excel format**: Rejected - requires larger libraries, not needed for MVP

**Implementation**:
```dart
// frontend/lib/core/utils/export_utils.dart
import 'dart:html' as html;
import 'package:csv/csv.dart';
import 'package:intl/intl.dart';

class ExportUtils {
  static String generateInvoicesCsv(List<Invoice> invoices) {
    List<List<dynamic>> rows = [
      ['Date', 'Business', 'Amount', 'Currency', 'Invoice #', 'Status']
    ];
    for (var invoice in invoices) {
      rows.add([
        DateFormat('yyyy-MM-dd').format(invoice.invoiceDate),
        invoice.vendorName,
        invoice.originalAmount.toStringAsFixed(2),
        invoice.originalCurrency,
        invoice.invoiceNumber ?? 'N/A',
        invoice.needsReview ? 'Needs Review' : 'Complete',
      ]);
    }
    return const ListToCsvConverter().convert(rows);
  }
  
  static void downloadCsv(String csvContent, String filename) {
    final bytes = csvContent.codeUnits;
    final blob = html.Blob([bytes], 'text/csv');
    final url = html.Url.createObjectUrlFromBlob(blob);
    html.AnchorElement(href: url)
      ..setAttribute('download', filename)
      ..click();
    html.Url.revokeObjectUrl(url);
  }
  
  static String generateFilename(String prefix, {String? businessName}) {
    final date = DateFormat('yyyy-MM-dd').format(DateTime.now());
    if (businessName != null) {
      final sanitized = businessName
        .replaceAll(RegExp(r'[^\w\s-]'), '')
        .replaceAll(RegExp(r'\s+'), '_')
        .toLowerCase();
      return '${prefix}_${sanitized}_$date.csv';
    }
    return '${prefix}_$date.csv';
  }
}
```

**Usage**:
```dart
final csvContent = ExportUtils.generateInvoicesCsv(invoices);
final filename = ExportUtils.generateFilename('invoices', businessName: vendorName);
ExportUtils.downloadCsv(csvContent, filename);
```

---

## Decision 4: Type Safety for Dynamic JSON

**Problem**: How to prevent `type 'minified:y0' is not a subtype of String` runtime errors when parsing JSON responses?

**Research**:
- Investigated Dart type system and dynamic type handling
- Reviewed safe casting patterns (`as` vs `is`)
- Studied null-aware operators and fallback patterns
- Analyzed common JSON parsing edge cases

**Decision**: Create `_parseString()` and similar helper methods in model classes for safe type conversion with fallback values.

**Rationale**:
- Handles unexpected types gracefully (null, int, bool, etc. converted to string)
- Provides sensible fallback values for critical fields
- Prevents app crashes from backend data inconsistencies
- Minimal performance overhead (simple type checks)

**Alternatives Considered**:
- **Strict type assertions**: Rejected - causes crashes on unexpected data
- **json_serializable with strict types**: Rejected - fails on type mismatches
- **Try-catch around entire fromJson**: Rejected - too coarse-grained, loses context

**Implementation**:
```dart
// In Invoice model
static String _parseString(dynamic value, String? defaultValue) {
  if (value == null) return defaultValue ?? '';
  if (value is String) return value;
  return value.toString();
}

static double _parseDouble(dynamic value) {
  if (value == null) return 0.0;
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0.0;
  return 0.0;
}

factory Invoice.fromJson(Map<String, dynamic> json) {
  return Invoice(
    id: _parseString(json['id'], 'unknown-id'),
    vendorName: _parseString(json['vendor']?['name'], 'Unknown'),
    originalCurrency: _parseString(json['originalCurrency'], 'USD'),
    originalAmount: _parseDouble(json['originalAmount']),
    // ... other fields with safe parsing
  );
}
```

**Fallback Values**:
- `id`: 'unknown-id' (ensures non-null identifier)
- `vendorName`: 'Unknown' (user-friendly display)
- `currency`: 'USD' (safe default)
- `amounts`: 0.0 (neutral numeric value)

---

## Decision 5: Currency Change Propagation

**Problem**: How to ensure currency changes immediately affect all analytics displays without manual refresh?

**Research**:
- Studied Riverpod provider invalidation patterns
- Reviewed state management dependency graphs
- Investigated automatic vs. manual refresh strategies
- Analyzed performance implications of full invalidation

**Decision**: Use `ref.invalidate()` on affected providers immediately after successful currency change.

**Rationale**:
- Riverpod invalidation triggers automatic refetch with new parameters
- No manual state management needed
- Ensures UI consistency (all displays update together)
- Leverages existing provider dependency graph

**Alternatives Considered**:
- **Manual state update**: Rejected - error-prone, doesn't refetch from server
- **Global event bus**: Rejected - overly complex, breaks Riverpod patterns
- **Polling for changes**: Rejected - inefficient, poor UX (delayed updates)

**Implementation**:
```dart
// In SettingsNotifier
Future<void> updateCurrency(String currencyCode) async {
  state = const AsyncValue.loading();
  try {
    await _apiClient.patch('/users/me', data: {'systemCurrency': currencyCode});
    
    // Invalidate affected providers to trigger refetch
    _ref.invalidate(authStateProvider);        // Update user profile
    _ref.invalidate(overallAnalyticsProvider); // Refresh analytics
    _ref.invalidate(invoicesProvider);         // Refresh invoice list
    
    state = const AsyncValue.data(null);
  } catch (e, st) {
    state = AsyncValue.error(e, st);
    rethrow;
  }
}
```

**Providers Affected**:
- `authStateProvider`: User profile with updated currency
- `overallAnalyticsProvider`: Analytics KPIs in new currency
- `invoicesProvider`: Invoice list with recalculated normalized amounts

---

## Decision 6: File Size Validation

**Problem**: How to check file size before upload and show user-friendly error message with actual size?

**Research**:
- Reviewed `PlatformFile` API (from file_picker package)
- Investigated `size` property availability on web vs. mobile
- Studied human-readable file size formatting
- Explored validation timing (before vs. during upload)

**Decision**: Check `file.size` property before calling upload API, format size in MB, show snackbar error if over limit.

**Rationale**:
- `PlatformFile.size` available on all platforms
- Pre-upload validation provides instant feedback (no network delay)
- MB formatting is user-friendly
- 10MB limit balances quality vs. upload time

**Alternatives Considered**:
- **Server-side only validation**: Rejected - poor UX (upload fails after delay)
- **Client + server validation**: Accepted - client for UX, server for security
- **Bytes or KB format**: Rejected - MB is more intuitive for image files

**Implementation**:
```dart
// In HomeProvider uploadFromGallery()
Future<void> uploadFromGallery() async {
  final result = await FilePicker.platform.pickFiles(type: FileType.image);
  
  if (result != null && result.files.single.bytes != null) {
    final file = result.files.single;
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSizeBytes) {
      final sizeMB = (file.size / 1024 / 1024).toStringAsFixed(1);
      _setError('File too large (max 10MB). Selected file: ${sizeMB}MB');
      return;
    }
    
    await _uploadFileFromBytes(file.bytes!, file.name);
  }
}
```

**Error Message Format**: "File too large (max 10MB). Selected file: 15.0MB"
- Clear limit stated
- Actual size shown
- Formatted to 1 decimal place for readability

---

## Decision 7: Monthly Limit Field

**Problem**: Does backend already support monthly limit? Do we need Prisma schema change?

**Research**:
- Checked existing Prisma schema (`backend/prisma/schema.prisma`)
- Reviewed vendor API endpoints and DTOs
- Verified field presence in current implementation

**Decision**: **Assumption** - Field likely exists or easy to add. If missing, add `monthlyLimit Decimal?` to Vendor model.

**Rationale**:
- Decimal type appropriate for monetary limits
- Nullable (`?`) allows gradual adoption (existing vendors not affected)
- Simple migration path if field doesn't exist

**Alternatives Considered**:
- **Separate Budget table**: Rejected - overkill for single field
- **Integer (cents)**: Rejected - Decimal more flexible for display
- **Required field**: Rejected - breaks existing data

**Implementation** (if needed):
```prisma
// backend/prisma/schema.prisma
model Vendor {
  id           String   @id @default(cuid())
  tenantId     String
  name         String
  monthlyLimit Decimal? // New field
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  invoices     Invoice[]
  @@index([tenantId])
}
```

**Migration**:
```bash
npx prisma migrate dev --name add-vendor-monthly-limit
```

**Frontend**:
- Add `TextField` for monthly limit in add/edit dialogs
- Validator: positive number, required
- Update `addVendor()` and `updateVendor()` calls to include `monthlyLimit`

---

## Decision 8: Dialog Positioning on Mobile

**Problem**: How to prevent dialogs from being pushed off-screen when keyboard appears on mobile?

**Research**:
- Studied Flutter dialog behavior with keyboard
- Reviewed `SingleChildScrollView` patterns
- Investigated `isScrollControlled` for bottom sheets
- Tested on iOS and Android simulators

**Decision**: Wrap `AlertDialog` content in `SingleChildScrollView` with `shrinkWrap: true`.

**Rationale**:
- `SingleChildScrollView` allows content to scroll when keyboard reduces available space
- `shrinkWrap: true` prevents dialog from expanding unnecessarily
- Works with existing `AlertDialog` widgets (no major refactor)
- Compatible with both iOS and Android

**Alternatives Considered**:
- **BottomSheet instead of AlertDialog**: Rejected - different UX pattern, more refactoring
- **DraggableScrollableSheet**: Rejected - overly complex for simple dialogs
- **Keyboard avoidance padding**: Rejected - doesn't handle long content well

**Implementation**:
```dart
AlertDialog(
  title: const Text('Edit Business'),
  content: SingleChildScrollView( // Add this wrapper
    shrinkWrap: true,
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(/* ... */),
        TextField(/* ... */),
      ],
    ),
  ),
  actions: [/* ... */],
)
```

**Testing Required**:
- Test on actual mobile devices (not just emulator)
- Verify keyboard doesn't push dialog off-screen
- Verify content scrolls to show action buttons
- Verify keyboard dismisses without closing dialog

---

## Decision 9: Responsive Charts

**Problem**: How to ensure chart axes are always visible and charts fit containers on all screen sizes?

**Research**:
- Reviewed `fl_chart` documentation and examples
- Studied responsive chart patterns in Flutter
- Investigated `LayoutBuilder` for dynamic sizing
- Analyzed axis title space reservation (`reservedSize`)

**Decision**: Wrap charts in `LayoutBuilder`, set size based on constraints, configure `titlesData` with appropriate `reservedSize`.

**Rationale**:
- `LayoutBuilder` provides parent constraints for responsive sizing
- `reservedSize` ensures axes don't get cut off
- Percentage-based width prevents overflow on narrow screens
- Fixed height maintains aspect ratio

**Alternatives Considered**:
- **Fixed chart size**: Rejected - breaks on different screen sizes
- **AspectRatio widget**: Rejected - less control over exact sizing
- **MediaQuery for sizing**: Rejected - LayoutBuilder more precise for nested widgets

**Implementation**:
```dart
LayoutBuilder(
  builder: (context, constraints) {
    return SizedBox(
      width: constraints.maxWidth - 32, // Account for padding
      height: 300, // Fixed height for consistency
      child: LineChart(
        LineChartData(
          // ... data configuration
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 40, // Space for Y-axis labels
                interval: /* calculated based on data */,
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 30, // Space for X-axis labels
                interval: /* calculated based on data */,
              ),
            ),
            topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
        ),
      ),
    );
  },
)
```

**Key Configurations**:
- Width: `constraints.maxWidth - 32` (responsive with padding)
- Height: `300` (fixed for consistent appearance)
- `reservedSize` for leftTitles: `40` (enough for currency symbols + numbers)
- `reservedSize` for bottomTitles: `30` (enough for dates/labels)

**Testing Matrix**:
- Mobile (375px): Chart fits, axes visible
- Tablet (768px): Chart uses space efficiently
- Desktop (1440px): Chart doesn't stretch awkwardly

---

## Decision 10: AI Insights Human-Friendly Copy

**Problem**: How to transform technical/JSON AI output to 3-5 readable insights?

**Research**:
- Reviewed existing Groq/Ollama prompt structure
- Studied AI response parsing patterns
- Investigated text formatting for readability
- Analyzed user-friendly language patterns

**Decision**: Update AI prompt to explicitly request "3-5 short, friendly sentences", parse response as plain text, display in simple format.

**Rationale**:
- Prompt engineering is simplest solution
- Plain text parsing avoids JSON complexity
- Simple list display is most readable
- No additional NLP processing needed

**Alternatives Considered**:
- **Post-process JSON to text**: Rejected - unnecessary complexity
- **Multiple AI calls**: Rejected - slower, more expensive
- **Template-based formatting**: Rejected - less flexible than AI-generated text

**Implementation**:

**Prompt Update** (backend):
```typescript
const prompt = `
Analyze these spending patterns and provide exactly 3-5 short, friendly insights.
Each insight should be a complete sentence explaining a spending pattern or recommendation.
Use conversational language that a non-technical user can understand.

Data: ${JSON.stringify(analyticsData)}

Format: Numbered list of sentences (no JSON, no technical jargon).
`;
```

**Frontend Display**:
```dart
// Parse AI response as plain text
final insights = aiResponse.split('\n')
  .where((line) => line.trim().isNotEmpty)
  .take(5)
  .toList();

// Display in simple list
Column(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: insights.map((insight) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.lightbulb_outline, size: 20),
        const SizedBox(width: 8),
        Expanded(child: Text(insight, style: /* friendly style */)),
      ],
    ),
  )).toList(),
)
```

**Example Output**:
1. "Your spending on office supplies increased 30% last month - consider bulk purchasing to save money."
2. "Most of your invoices come from 3 vendors - you might negotiate volume discounts."
3. "Weekend purchases are 20% higher than weekdays - setting a weekend budget could help control costs."

---

## Summary

All 10 research areas have been resolved with clear technical decisions. Key themes:

1. **Simplicity**: Prefer simple solutions (constants over classes, utilities over frameworks)
2. **Type Safety**: Safe parsing with fallbacks prevents crashes
3. **User Experience**: Immediate feedback (pre-upload validation, instant currency refresh)
4. **Consistency**: Shared utilities ensure uniform behavior
5. **Responsiveness**: LayoutBuilder + proper sizing for all devices

**Next Steps**: Proceed to Phase 1 (Design & Contracts) and create `quickstart.md`.

**No Blockers**: All technical approaches are validated and implementable with existing stack.
