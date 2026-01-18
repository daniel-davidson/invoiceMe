import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';

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
  });

  factory Invoice.fromJson(Map<String, dynamic> json) {
    return Invoice(
      id: json['id'] as String,
      vendorId: json['vendorId'] as String,
      vendorName: json['vendor']?['name'] as String? ?? 'Unknown',
      name: json['name'] as String?,
      originalAmount: (json['originalAmount'] as num).toDouble(),
      originalCurrency: json['originalCurrency'] as String,
      normalizedAmount: json['normalizedAmount'] != null
          ? (json['normalizedAmount'] as num).toDouble()
          : null,
      invoiceDate: DateTime.parse(json['invoiceDate'] as String),
      invoiceNumber: json['invoiceNumber'] as String?,
      fxRate:
          json['fxRate'] != null ? (json['fxRate'] as num).toDouble() : null,
      needsReview: json['needsReview'] as bool? ?? false,
    );
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
