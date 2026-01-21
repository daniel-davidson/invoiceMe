import 'dart:html' as html;
import 'package:csv/csv.dart';
import 'package:intl/intl.dart';

/// Utility class for CSV export functionality
class ExportUtils {
  /// Generates a CSV string from a list of invoice data
  /// 
  /// Headers: Date, Business, Amount, Currency, Invoice #, Status
  static String generateInvoicesCsv(List<Map<String, dynamic>> invoices) {
    final rows = <List<dynamic>>[
      ['Date', 'Business', 'Amount', 'Currency', 'Invoice #', 'Status']
    ];

    for (final invoice in invoices) {
      rows.add([
        invoice['date'] != null
            ? DateFormat('yyyy-MM-dd').format(DateTime.parse(invoice['date']))
            : 'N/A',
        invoice['vendorName'] ?? 'Unknown',
        invoice['amount']?.toString() ?? '0.00',
        invoice['currency'] ?? 'USD',
        invoice['invoiceNumber'] ?? 'N/A',
        invoice['needsReview'] == true ? 'Needs Review' : 'Complete',
      ]);
    }

    return const ListToCsvConverter().convert(rows);
  }

  /// Downloads a CSV file to the user's device (web only)
  static void downloadCsv(String csvContent, String filename) {
    final bytes = csvContent.codeUnits;
    final blob = html.Blob([bytes], 'text/csv;charset=utf-8');
    final url = html.Url.createObjectUrlFromBlob(blob);
    html.AnchorElement(href: url)
      ..setAttribute('download', filename)
      ..click();
    html.Url.revokeObjectUrl(url);
  }

  /// Generates a filename with date
  /// 
  /// Format: prefix_businessName_yyyy-MM-dd.csv or prefix_yyyy-MM-dd.csv
  static String generateFilename(String prefix, {String? businessName}) {
    final date = DateFormat('yyyy-MM-dd').format(DateTime.now());
    if (businessName != null && businessName.isNotEmpty) {
      final sanitized = businessName
          .replaceAll(RegExp(r'[^\w\s-]'), '')
          .replaceAll(RegExp(r'\s+'), '_');
      return '${prefix}_${sanitized}_$date.csv';
    }
    return '${prefix}_$date.csv';
  }
}
