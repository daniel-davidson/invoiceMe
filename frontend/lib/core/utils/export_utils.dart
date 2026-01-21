import 'dart:html' as html;
import 'package:csv/csv.dart';
import 'package:frontend/features/invoices/presentation/providers/invoices_provider.dart';
import 'package:intl/intl.dart';

class ExportUtils {
  static String generateInvoicesCsv(List<Invoice> invoices) {
    if (invoices.isEmpty) {
      return '';
    }

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
      // Sanitize business name for filename
      final sanitized = businessName
          .replaceAll(RegExp(r'[^\w\s-]'), '')
          .replaceAll(RegExp(r'\s+'), '_')
          .toLowerCase();
      return '${prefix}_${sanitized}_$date.csv';
    }
    return '${prefix}_$date.csv';
  }
}
