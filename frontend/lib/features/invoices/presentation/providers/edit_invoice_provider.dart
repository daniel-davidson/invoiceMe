import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/features/invoices/presentation/providers/invoices_provider.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';

/// State for the Edit Invoice Screen
class EditInvoiceState {
  final Invoice? invoice; // Original invoice from API
  final bool isLoading;
  final bool isSaving;
  final String? error;
  final bool hasUnsavedChanges;

  // Local edited fields (null = not edited, use original)
  final String? editedName;
  final String? editedInvoiceNumber;
  final DateTime? editedInvoiceDate;
  final double? editedOriginalAmount;
  final String? editedVendorId;
  final bool? editedUseItemsTotal;
  final List<LineItem>? editedItems;

  const EditInvoiceState({
    this.invoice,
    this.isLoading = false,
    this.isSaving = false,
    this.error,
    this.hasUnsavedChanges = false,
    this.editedName,
    this.editedInvoiceNumber,
    this.editedInvoiceDate,
    this.editedOriginalAmount,
    this.editedVendorId,
    this.editedUseItemsTotal,
    this.editedItems,
  });

  EditInvoiceState copyWith({
    Invoice? invoice,
    bool? isLoading,
    bool? isSaving,
    String? error,
    bool? hasUnsavedChanges,
    String? editedName,
    String? editedInvoiceNumber,
    DateTime? editedInvoiceDate,
    double? editedOriginalAmount,
    String? editedVendorId,
    bool? editedUseItemsTotal,
    List<LineItem>? editedItems,
  }) {
    return EditInvoiceState(
      invoice: invoice ?? this.invoice,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: error,
      hasUnsavedChanges: hasUnsavedChanges ?? this.hasUnsavedChanges,
      editedName: editedName ?? this.editedName,
      editedInvoiceNumber: editedInvoiceNumber ?? this.editedInvoiceNumber,
      editedInvoiceDate: editedInvoiceDate ?? this.editedInvoiceDate,
      editedOriginalAmount: editedOriginalAmount ?? this.editedOriginalAmount,
      editedVendorId: editedVendorId ?? this.editedVendorId,
      editedUseItemsTotal: editedUseItemsTotal ?? this.editedUseItemsTotal,
      editedItems: editedItems ?? this.editedItems,
    );
  }

  // Get current values (edited or original)
  String? get currentName => editedName ?? invoice?.name;
  String? get currentInvoiceNumber => editedInvoiceNumber ?? invoice?.invoiceNumber;
  DateTime? get currentInvoiceDate => editedInvoiceDate ?? invoice?.invoiceDate;
  double? get currentOriginalAmount => editedOriginalAmount ?? invoice?.originalAmount;
  String? get currentVendorId => editedVendorId ?? invoice?.vendorId;
  bool get currentUseItemsTotal => editedUseItemsTotal ?? invoice?.useItemsTotal ?? true;
  List<LineItem> get currentItems => editedItems ?? invoice?.items ?? [];

  double get calculatedItemsTotal {
    if (currentItems.isEmpty) return 0.0;
    return currentItems.fold(0.0, (sum, item) => sum + item.total);
  }
}

final editInvoiceProvider = StateNotifierProvider.family<EditInvoiceNotifier, EditInvoiceState, String>(
  (ref, invoiceId) {
    final apiClient = ref.watch(apiClientProvider);
    return EditInvoiceNotifier(apiClient, invoiceId);
  },
);

class EditInvoiceNotifier extends StateNotifier<EditInvoiceState> {
  final ApiClient _apiClient;
  final String _invoiceId;

  EditInvoiceNotifier(this._apiClient, this._invoiceId) : super(const EditInvoiceState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _apiClient.get('/invoices/$_invoiceId');
      final invoice = Invoice.fromJson(response.data as Map<String, dynamic>);
      state = state.copyWith(
        invoice: invoice,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load invoice: $e',
      );
    }
  }

  /// Update invoice name (local state only, not saved until saveAll())
  void updateName(String name) {
    state = state.copyWith(
      editedName: name,
      hasUnsavedChanges: true,
    );
  }

  /// Update invoice number (local state only)
  void updateInvoiceNumber(String number) {
    state = state.copyWith(
      editedInvoiceNumber: number,
      hasUnsavedChanges: true,
    );
  }

  /// Update invoice date (local state only)
  void updateInvoiceDate(DateTime date) {
    state = state.copyWith(
      editedInvoiceDate: date,
      hasUnsavedChanges: true,
    );
  }

  /// Update original amount (local state only, only if useItemsTotal is OFF)
  void updateOriginalAmount(double amount) {
    if (!state.currentUseItemsTotal) {
      state = state.copyWith(
        editedOriginalAmount: amount,
        hasUnsavedChanges: true,
      );
    }
  }

  /// Update vendor/business assignment (local state only)
  void updateVendorId(String vendorId) {
    state = state.copyWith(
      editedVendorId: vendorId,
      hasUnsavedChanges: true,
    );
  }

  /// Toggle useItemsTotal (auto-calculate total from items)
  void toggleUseItemsTotal(bool useItemsTotal) {
    state = state.copyWith(
      editedUseItemsTotal: useItemsTotal,
      hasUnsavedChanges: true,
    );
  }

  /// Add a new item to the items list (local state only)
  void addItem(LineItem newItem) {
    final currentItems = List<LineItem>.from(state.currentItems);
    currentItems.add(newItem);
    state = state.copyWith(
      editedItems: currentItems,
      hasUnsavedChanges: true,
    );
  }

  /// Update an existing item by index (local state only)
  void updateItem(int index, LineItem updatedItem) {
    if (index < 0 || index >= state.currentItems.length) return;
    
    final currentItems = List<LineItem>.from(state.currentItems);
    currentItems[index] = updatedItem;
    state = state.copyWith(
      editedItems: currentItems,
      hasUnsavedChanges: true,
    );
  }

  /// Delete an item by index (local state only)
  void deleteItem(int index) {
    if (index < 0 || index >= state.currentItems.length) return;
    
    final currentItems = List<LineItem>.from(state.currentItems);
    currentItems.removeAt(index);
    state = state.copyWith(
      editedItems: currentItems,
      hasUnsavedChanges: true,
    );
  }

  /// Save all changes atomically (invoice header + items)
  Future<bool> saveAll() async {
    if (!state.hasUnsavedChanges) return true;

    state = state.copyWith(isSaving: true, error: null);

    try {
      // Build request payload with only edited fields
      final Map<String, dynamic> payload = {};

      if (state.editedName != null) {
        payload['name'] = state.editedName;
      }

      if (state.editedInvoiceNumber != null) {
        payload['invoiceNumber'] = state.editedInvoiceNumber;
      }

      if (state.editedInvoiceDate != null) {
        payload['invoiceDate'] = state.editedInvoiceDate!.toIso8601String();
      }

      if (state.editedVendorId != null) {
        payload['vendorId'] = state.editedVendorId;
      }

      if (state.editedUseItemsTotal != null) {
        payload['useItemsTotal'] = state.editedUseItemsTotal;
      }

      // Handle amount: if useItemsTotal is ON, send calculated total; if OFF, send edited amount
      if (state.currentUseItemsTotal) {
        payload['originalAmount'] = state.calculatedItemsTotal;
      } else if (state.editedOriginalAmount != null) {
        payload['originalAmount'] = state.editedOriginalAmount;
      }

      // Always send items if edited (full replace)
      if (state.editedItems != null) {
        payload['items'] = state.editedItems!.map((item) => item.toJson()).toList();
      }

      // Send PATCH request
      await _apiClient.patch('/invoices/$_invoiceId', data: payload);

      // Reload invoice to get updated data from server
      await load();

      state = state.copyWith(
        isSaving: false,
        hasUnsavedChanges: false,
      );

      return true;
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: 'Failed to save invoice: $e',
      );
      return false;
    }
  }

  /// Delete the invoice
  Future<bool> delete() async {
    try {
      await _apiClient.delete('/invoices/$_invoiceId');
      return true;
    } catch (e) {
      state = state.copyWith(error: 'Failed to delete invoice: $e');
      return false;
    }
  }

  /// Discard unsaved changes and reload original data
  void discardChanges() {
    state = state.copyWith(
      hasUnsavedChanges: false,
      editedName: null,
      editedInvoiceNumber: null,
      editedInvoiceDate: null,
      editedOriginalAmount: null,
      editedVendorId: null,
      editedUseItemsTotal: null,
      editedItems: null,
    );
  }
}
