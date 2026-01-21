import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';
import 'package:frontend/core/utils/export_utils.dart';

class LineItem {
  final String? id; // UUID for existing items, null for new items
  final String description;
  final double? quantity;
  final double? unitPrice;
  final double total; // Always required
  final String? currency; // Optional, defaults to invoice currency

  LineItem({
    this.id,
    required this.description,
    this.quantity,
    this.unitPrice,
    required this.total,
    this.currency,
  });

  factory LineItem.fromJson(Map<String, dynamic> json) {
    return LineItem(
      id: json['id'] as String?,
      description: json['description'] as String? ?? '',
      quantity: json['quantity'] != null ? _parseDouble(json['quantity']) : null,
      unitPrice: json['unitPrice'] != null ? _parseDouble(json['unitPrice']) : null,
      total: _parseDouble(json['total'] ?? json['amount'] ?? 0.0), // Support both 'total' and legacy 'amount'
      currency: json['currency'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'description': description,
      if (quantity != null) 'quantity': quantity,
      if (unitPrice != null) 'unitPrice': unitPrice,
      'total': total,
      if (currency != null) 'currency': currency,
    };
  }

  LineItem copyWith({
    String? id,
    String? description,
    double? quantity,
    double? unitPrice,
    double? total,
    String? currency,
  }) {
    return LineItem(
      id: id ?? this.id,
      description: description ?? this.description,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
      total: total ?? this.total,
      currency: currency ?? this.currency,
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
  final bool useItemsTotal; // NEW: Auto-calculate total from items
  final double? vatAmount;
  final double? subtotalAmount;
  final List<LineItem> items; // NEW: Normalized items array (always present, may be empty)

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
    this.useItemsTotal = true,
    this.vatAmount,
    this.subtotalAmount,
    this.items = const [],
  });

  factory Invoice.fromJson(Map<String, dynamic> json) {
    // Parse normalized items array from backend (invoice_items table)
    List<LineItem> items = [];
    if (json['items'] != null && json['items'] is List) {
      items = (json['items'] as List)
          .map((item) => LineItem.fromJson(item as Map<String, dynamic>))
          .toList();
    }

    // Fallback: Extract legacy line items from extraction run if items array is empty
    double? vatAmount;
    double? subtotalAmount;
    if (items.isEmpty && json['extractionRuns'] != null && (json['extractionRuns'] as List).isNotEmpty) {
      final extractionRun = (json['extractionRuns'] as List).first;
      if (extractionRun['llmResponse'] != null) {
        final llmResponse = extractionRun['llmResponse'] as Map<String, dynamic>;
        
        // Extract legacy line items (no IDs)
        if (llmResponse['lineItems'] != null && llmResponse['lineItems'] is List) {
          items = (llmResponse['lineItems'] as List)
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
      id: _parseString(json['id'], 'unknown-id'),
      vendorId: _parseString(json['vendorId'], 'unknown-vendor-id'),
      vendorName: _parseString(json['vendor']?['name'], 'Unknown'),
      name: json['name'] != null ? _parseString(json['name'], null) : null,
      originalAmount: _parseDoubleStatic(json['originalAmount']),
      originalCurrency: _parseString(json['originalCurrency'], 'USD'),
      normalizedAmount: json['normalizedAmount'] != null
          ? _parseDoubleStatic(json['normalizedAmount'])
          : null,
      invoiceDate: DateTime.parse(_parseString(json['invoiceDate'], DateTime.now().toIso8601String())),
      invoiceNumber: json['invoiceNumber'] != null ? _parseString(json['invoiceNumber'], null) : null,
      fxRate:
          json['fxRate'] != null ? _parseDoubleStatic(json['fxRate']) : null,
      needsReview: json['needsReview'] as bool? ?? false,
      useItemsTotal: json['useItemsTotal'] as bool? ?? true,
      vatAmount: vatAmount,
      subtotalAmount: subtotalAmount,
      items: items,
    );
  }

  Invoice copyWith({
    String? id,
    String? vendorId,
    String? vendorName,
    String? name,
    double? originalAmount,
    String? originalCurrency,
    double? normalizedAmount,
    DateTime? invoiceDate,
    String? invoiceNumber,
    double? fxRate,
    bool? needsReview,
    bool? useItemsTotal,
    double? vatAmount,
    double? subtotalAmount,
    List<LineItem>? items,
  }) {
    return Invoice(
      id: id ?? this.id,
      vendorId: vendorId ?? this.vendorId,
      vendorName: vendorName ?? this.vendorName,
      name: name ?? this.name,
      originalAmount: originalAmount ?? this.originalAmount,
      originalCurrency: originalCurrency ?? this.originalCurrency,
      normalizedAmount: normalizedAmount ?? this.normalizedAmount,
      invoiceDate: invoiceDate ?? this.invoiceDate,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      fxRate: fxRate ?? this.fxRate,
      needsReview: needsReview ?? this.needsReview,
      useItemsTotal: useItemsTotal ?? this.useItemsTotal,
      vatAmount: vatAmount ?? this.vatAmount,
      subtotalAmount: subtotalAmount ?? this.subtotalAmount,
      items: items ?? this.items,
    );
  }

  double get calculatedItemsTotal {
    if (items.isEmpty) return 0.0;
    return items.fold(0.0, (sum, item) => sum + item.total);
  }

  static double _parseDoubleStatic(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  static String _parseString(dynamic value, String? defaultValue) {
    if (value == null) return defaultValue ?? '';
    if (value is String) return value;
    // Handle cases where value might be a number or other type
    return value.toString();
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

  Future<void> loadInvoices({String? search}) async {
    state = const AsyncValue.loading();
    try {
      // Build query string with search parameter
      final queryParams = search != null && search.isNotEmpty ? '?search=$search' : '';
      final response = await _apiClient.get('/invoices$queryParams');
      final data = response.data['data'] as List<dynamic>;
      final invoices = data
          .map((json) => Invoice.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(invoices);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> search(String query) async {
    await loadInvoices(search: query);
  }

  Future<void> exportCsv() async {
    try {
      // Get current invoices from state
      final invoices = state.asData?.value ?? [];
      if (invoices.isEmpty) {
        throw Exception('No invoices to export');
      }
      
      // Generate CSV
      final csvContent = ExportUtils.generateInvoicesCsv(invoices);
      final filename = ExportUtils.generateFilename('invoices');
      
      // Download CSV
      ExportUtils.downloadCsv(csvContent, filename);
    } catch (e) {
      // Re-throw to allow UI to handle
      rethrow;
    }
  }
}
