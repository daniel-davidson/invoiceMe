import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';
import 'package:frontend/features/invoices/presentation/providers/invoices_provider.dart';

final invoiceDetailProvider = StateNotifierProvider.family<
    InvoiceDetailNotifier, AsyncValue<Invoice?>, String>((ref, id) {
  final apiClient = ref.watch(apiClientProvider);
  return InvoiceDetailNotifier(apiClient, id);
});

class InvoiceDetailNotifier extends StateNotifier<AsyncValue<Invoice?>> {
  final ApiClient _apiClient;
  final String _invoiceId;

  InvoiceDetailNotifier(this._apiClient, this._invoiceId)
      : super(const AsyncValue.loading()) {
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    try {
      final response = await _apiClient.get('/invoices/$_invoiceId');
      final invoice = Invoice.fromJson(response.data as Map<String, dynamic>);
      state = AsyncValue.data(invoice);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> update({
    String? name,
    double? originalAmount,
    String? originalCurrency,
    DateTime? invoiceDate,
    String? vendorId,
  }) async {
    try {
      await _apiClient.patch('/invoices/$_invoiceId', data: {
        if (name != null) 'name': name,
        if (originalAmount != null) 'originalAmount': originalAmount,
        if (originalCurrency != null) 'originalCurrency': originalCurrency,
        if (invoiceDate != null) 'invoiceDate': invoiceDate.toIso8601String(),
        if (vendorId != null) 'vendorId': vendorId,
      });
      await load();
    } catch (e) {
      // Handle error
    }
  }

  Future<void> delete() async {
    try {
      await _apiClient.delete('/invoices/$_invoiceId');
    } catch (e) {
      // Handle error
    }
  }
}
