import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';

class LineItem {
  final String description;
  final double? quantity;
  final double? unitPrice;
  final double? amount;

  LineItem({
    required this.description,
    this.quantity,
    this.unitPrice,
    this.amount,
  });

  factory LineItem.fromJson(Map<String, dynamic> json) {
    return LineItem(
      description: json['description'] as String? ?? '',
      quantity: json['quantity'] != null ? _parseDouble(json['quantity']) : null,
      unitPrice: json['unitPrice'] != null ? _parseDouble(json['unitPrice']) : null,
      amount: json['amount'] != null ? _parseDouble(json['amount']) : null,
    );
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }
}

class Invoice {
  final String id;
  final String vendorId;
  final String vendorName;
  final String? name;
  final double originalAmount;
  final String originalCurrency;
  final double? normalizedAmount;
  final DateTime invoiceDate;
  final String? invoiceNumber;
  final double? fxRate;
  final bool needsReview;
  final double? vatAmount;
  final double? subtotalAmount;
  final List<LineItem>? lineItems;

  Invoice({
    required this.id,
    required this.vendorId,
    required this.vendorName,
    this.name,
    required this.originalAmount,
    required this.originalCurrency,
    this.normalizedAmount,
    required this.invoiceDate,
    this.invoiceNumber,
    this.fxRate,
    required this.needsReview,
    this.vatAmount,
    this.subtotalAmount,
    this.lineItems,
  });

  factory Invoice.fromJson(Map<String, dynamic> json) {
    // Extract line items from extraction run if available
    List<LineItem>? lineItems;
    double? vatAmount;
    double? subtotalAmount;

    if (json['extractionRuns'] != null && (json['extractionRuns'] as List).isNotEmpty) {
      final extractionRun = (json['extractionRuns'] as List).first;
      if (extractionRun['llmResponse'] != null) {
        final llmResponse = extractionRun['llmResponse'] as Map<String, dynamic>;
        
        // Extract line items
        if (llmResponse['lineItems'] != null && llmResponse['lineItems'] is List) {
          lineItems = (llmResponse['lineItems'] as List)
              .map((item) => LineItem.fromJson(item as Map<String, dynamic>))
              .toList();
        }

        // Extract VAT and subtotal
        if (llmResponse['vatAmount'] != null) {
          vatAmount = _parseDoubleStatic(llmResponse['vatAmount']);
        }
        if (llmResponse['subtotalAmount'] != null) {
          subtotalAmount = _parseDoubleStatic(llmResponse['subtotalAmount']);
        }
      }
    }

    return Invoice(
      id: json['id'] as String,
      vendorId: json['vendorId'] as String,
      vendorName: json['vendor']?['name'] as String? ?? 'Unknown',
      name: json['name'] as String?,
      originalAmount: _parseDoubleStatic(json['originalAmount']),
      originalCurrency: json['originalCurrency'] as String,
      normalizedAmount: json['normalizedAmount'] != null
          ? _parseDoubleStatic(json['normalizedAmount'])
          : null,
      invoiceDate: DateTime.parse(json['invoiceDate'] as String),
      invoiceNumber: json['invoiceNumber'] as String?,
      fxRate:
          json['fxRate'] != null ? _parseDoubleStatic(json['fxRate']) : null,
      needsReview: json['needsReview'] as bool? ?? false,
      vatAmount: vatAmount,
      subtotalAmount: subtotalAmount,
      lineItems: lineItems,
    );
  }

  static double _parseDoubleStatic(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }
}

final invoicesProvider =
    StateNotifierProvider<InvoicesNotifier, AsyncValue<List<Invoice>>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return InvoicesNotifier(apiClient);
});

class InvoicesNotifier extends StateNotifier<AsyncValue<List<Invoice>>> {
  final ApiClient _apiClient;

  InvoicesNotifier(this._apiClient) : super(const AsyncValue.loading()) {
    loadInvoices();
  }

  Future<void> loadInvoices() async {
    state = const AsyncValue.loading();
    try {
      final response = await _apiClient.get('/invoices');
      final data = response.data['data'] as List<dynamic>;
      final invoices = data
          .map((json) => Invoice.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(invoices);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> exportCsv() async {
    try {
      // Download CSV
      await _apiClient.download('/export/invoices');
    } catch (e) {
      // Handle error
    }
  }
}
