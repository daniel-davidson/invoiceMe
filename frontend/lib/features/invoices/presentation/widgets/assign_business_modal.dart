import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../vendors/domain/models/vendor.dart';
import '../../../vendors/presentation/providers/vendors_provider.dart';

class AssignBusinessModal extends ConsumerStatefulWidget {
  final String invoiceId;
  final String extractedVendorId;
  final String extractedVendorName;
  final double confidence;

  const AssignBusinessModal({
    Key? key,
    required this.invoiceId,
    required this.extractedVendorId,
    required this.extractedVendorName,
    required this.confidence,
  }) : super(key: key);

  @override
  ConsumerState<AssignBusinessModal> createState() => _AssignBusinessModalState();
}

class _AssignBusinessModalState extends ConsumerState<AssignBusinessModal> {
  String? _selectedVendorId;
  bool _showCreateForm = false;
  final _newBusinessController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Pre-select extracted vendor if confidence > 0.7
    if (widget.confidence > 0.7) {
      _selectedVendorId = widget.extractedVendorId;
    }
  }

  @override
  void dispose() {
    _newBusinessController.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    if (_selectedVendorId == null) return;

    setState(() => _isLoading = true);
    try {
      // Update invoice with selected vendor
      await ref.read(vendorsProvider.notifier).updateInvoiceVendor(
            widget.invoiceId,
            _selectedVendorId!,
          );
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
    final name = _newBusinessController.text.trim();
    if (name.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      final vendor = await ref.read(vendorsProvider.notifier).createVendor(name);
      setState(() {
        _selectedVendorId = vendor.id;
        _showCreateForm = false;
      });
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
            Text(
              'Extracted: ${widget.extractedVendorName}',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
            const SizedBox(height: 24),
            vendorsAsync.when(
              data: (vendors) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<String>(
                    value: _selectedVendorId,
                    decoration: const InputDecoration(
                      labelText: 'Select Business',
                      border: OutlineInputBorder(),
                    ),
                    items: vendors.map((v) {
                      return DropdownMenuItem(
                        value: v.id,
                        child: Text(v.name),
                      );
                    }).toList(),
                    onChanged: _isLoading ? null : (value) {
                      setState(() => _selectedVendorId = value);
                    },
                  ),
                  const SizedBox(height: 16),
                  if (!_showCreateForm)
                    OutlinedButton.icon(
                      onPressed: _isLoading
                          ? null
                          : () => setState(() => _showCreateForm = true),
                      icon: const Icon(Icons.add),
                      label: const Text('Create New Business'),
                    ),
                  if (_showCreateForm) ...[
                    TextField(
                      controller: _newBusinessController,
                      decoration: const InputDecoration(
                        labelText: 'Business Name',
                        border: OutlineInputBorder(),
                      ),
                      enabled: !_isLoading,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _createAndSelect,
                            child: _isLoading
                                ? const SizedBox(
                                    height: 16,
                                    width: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Text('Create'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: _isLoading
                              ? null
                              : () => setState(() => _showCreateForm = false),
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
                  onPressed: _isLoading ? null : () => Navigator.pop(context, false),
                  child: const Text('Skip for Now'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _selectedVendorId == null || _isLoading ? null : _confirm,
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
    );
  }
}
