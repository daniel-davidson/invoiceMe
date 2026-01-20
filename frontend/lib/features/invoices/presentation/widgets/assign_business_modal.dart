import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/features/home/presentation/providers/home_provider.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';

class AssignBusinessModal extends ConsumerStatefulWidget {
  final String invoiceId;
  final String? extractedVendorId;
  final String extractedVendorName;
  final double confidence;

  const AssignBusinessModal({
    Key? key,
    required this.invoiceId,
    this.extractedVendorId,
    required this.extractedVendorName,
    required this.confidence,
  }) : super(key: key);

  @override
  ConsumerState<AssignBusinessModal> createState() =>
      _AssignBusinessModalState();
}

class _AssignBusinessModalState extends ConsumerState<AssignBusinessModal> {
  String? _selectedVendorId;
  bool _showCreateForm = false;
  final _newBusinessController = TextEditingController();
  final _monthlyLimitController = TextEditingController();
  bool _isLoading = false;
  String? _businessNameError;
  String? _monthlyLimitError;

  @override
  void initState() {
    super.initState();
    // Pre-select extracted vendor if confidence > 0.7 and vendorId exists
    if (widget.confidence > 0.7 && widget.extractedVendorId != null) {
      _selectedVendorId = widget.extractedVendorId;
    }
    
    // Pre-fill the extracted vendor name in the create form
    _newBusinessController.text = widget.extractedVendorName;
  }

  @override
  void dispose() {
    _newBusinessController.dispose();
    _monthlyLimitController.dispose();
    super.dispose();
  }

  bool _validateCreateForm() {
    setState(() {
      _businessNameError = null;
      _monthlyLimitError = null;
    });

    final name = _newBusinessController.text.trim();
    final limitText = _monthlyLimitController.text.trim();

    bool isValid = true;

    if (name.isEmpty) {
      setState(() => _businessNameError = 'Business name is required');
      isValid = false;
    }

    if (limitText.isEmpty) {
      setState(() => _monthlyLimitError = 'Monthly limit is required');
      isValid = false;
    } else {
      final limit = double.tryParse(limitText);
      if (limit == null) {
        setState(() => _monthlyLimitError = 'Must be a valid number');
        isValid = false;
      } else if (limit <= 0) {
        setState(() => _monthlyLimitError = 'Must be greater than 0');
        isValid = false;
      }
    }

    return isValid;
  }

  Future<void> _confirm() async {
    if (_selectedVendorId == null) return;

    setState(() => _isLoading = true);
    try {
      // Update invoice with selected vendor via API
      final apiClient = ref.read(apiClientProvider);
      await apiClient.patch(
        '/invoices/${widget.invoiceId}',
        data: {'vendorId': _selectedVendorId!},
      );

      // Reload vendors to refresh counts
      await ref.read(vendorsProvider.notifier).loadVendors();

      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to assign business: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _createAndSelect() async {
    if (!_validateCreateForm()) return;

    final name = _newBusinessController.text.trim();
    final monthlyLimit = double.parse(_monthlyLimitController.text.trim());

    setState(() => _isLoading = true);
    try {
      // Create new vendor with monthly limit
      await ref.read(vendorsProvider.notifier).addVendor(
        name,
        monthlyLimit: monthlyLimit,
      );

      // Reload vendors to get the new one
      await ref.read(vendorsProvider.notifier).loadVendors();

      // Find the newly created vendor by name
      final vendors = ref.read(vendorsProvider).value;
      final newVendor = vendors?.firstWhere(
        (v) => v.name == name,
        orElse: () => vendors.last, // Fallback to last vendor if not found
      );

      if (newVendor != null) {
        // Automatically assign the invoice to the newly created business
        final apiClient = ref.read(apiClientProvider);
        await apiClient.patch(
          '/invoices/${widget.invoiceId}',
          data: {'vendorId': newVendor.id},
        );

        // Reload vendors to refresh counts
        await ref.read(vendorsProvider.notifier).loadVendors();

        // Close the dialog with success
        if (mounted) Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create business: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final vendorsAsync = ref.watch(vendorsProvider);

    return Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Assign Invoice to Business',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.blue.shade700, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Extracted: ${widget.extractedVendorName}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.blue.shade900,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              vendorsAsync.when(
                data: (vendors) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (!_showCreateForm) ...[
                      DropdownButtonFormField<String>(
                        value: _selectedVendorId,
                        decoration: const InputDecoration(
                          labelText: 'Select Business',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.business),
                        ),
                        items: vendors.map((v) {
                          return DropdownMenuItem(
                            value: v.id,
                            child: Text(v.name),
                          );
                        }).toList(),
                        onChanged: _isLoading
                            ? null
                            : (value) {
                                setState(() => _selectedVendorId = value);
                              },
                      ),
                      const SizedBox(height: 16),
                      OutlinedButton.icon(
                        onPressed: _isLoading
                            ? null
                            : () => setState(() => _showCreateForm = true),
                        icon: const Icon(Icons.add),
                        label: const Text('Create New Business'),
                      ),
                    ],
                    if (_showCreateForm) ...[
                      TextField(
                        controller: _newBusinessController,
                        decoration: InputDecoration(
                          labelText: 'Business Name',
                          border: const OutlineInputBorder(),
                          prefixIcon: const Icon(Icons.business),
                          errorText: _businessNameError,
                        ),
                        enabled: !_isLoading,
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _monthlyLimitController,
                        decoration: InputDecoration(
                          labelText: 'Monthly Limit',
                          border: const OutlineInputBorder(),
                          prefixIcon: const Icon(Icons.attach_money),
                          errorText: _monthlyLimitError,
                          helperText: 'Required - must be greater than 0',
                        ),
                        enabled: !_isLoading,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _createAndSelect,
                              child: _isLoading
                                  ? const SizedBox(
                                      height: 16,
                                      width: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Text('Create'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton(
                            onPressed: _isLoading
                                ? null
                                : () {
                                    setState(() {
                                      _showCreateForm = false;
                                      _businessNameError = null;
                                      _monthlyLimitError = null;
                                    });
                                  },
                            child: const Text('Cancel'),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Text('Error: $err'),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _isLoading
                        ? null
                        : () => Navigator.pop(context, false),
                    child: const Text('Skip for Now'),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _selectedVendorId == null || _isLoading
                        ? null
                        : _confirm,
                    child: _isLoading
                        ? const SizedBox(
                            height: 16,
                            width: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Confirm'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
