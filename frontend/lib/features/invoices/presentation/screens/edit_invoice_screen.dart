import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:frontend/core/utils/currency_formatter.dart';
import 'package:frontend/core/utils/date_formatter.dart';
import 'package:frontend/features/invoices/presentation/providers/edit_invoice_provider.dart';
import 'package:frontend/features/invoices/presentation/providers/invoices_provider.dart';
import 'package:frontend/features/home/presentation/providers/home_provider.dart';

class EditInvoiceScreen extends ConsumerStatefulWidget {
  final String invoiceId;

  const EditInvoiceScreen({super.key, required this.invoiceId});

  @override
  ConsumerState<EditInvoiceScreen> createState() => _EditInvoiceScreenState();
}

class _EditInvoiceScreenState extends ConsumerState<EditInvoiceScreen> {
  // Form controllers for inline editing
  final _nameController = TextEditingController();
  final _numberController = TextEditingController();
  final _amountController = TextEditingController();

  // Item form controllers
  final _itemDescriptionController = TextEditingController();
  final _itemTotalController = TextEditingController();

  // UI state
  bool _showNameEdit = false;
  bool _showNumberEdit = false;
  bool _showAmountEdit = false;
  bool _showBusinessDropdown = false;
  int? _editingItemIndex; // null = not editing, -1 = adding new
  int? _deletingItemIndex;

  @override
  void dispose() {
    _nameController.dispose();
    _numberController.dispose();
    _amountController.dispose();
    _itemDescriptionController.dispose();
    _itemTotalController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final editState = ref.watch(editInvoiceProvider(widget.invoiceId));

    // Show loading indicator
    if (editState.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    // Show error if load failed
    if (editState.error != null && editState.invoice == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Edit Invoice')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text(editState.error!),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref
                    .read(editInvoiceProvider(widget.invoiceId).notifier)
                    .load(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final invoice = editState.invoice!;

    return PopScope(
      canPop: !editState.hasUnsavedChanges,
      onPopInvoked: (didPop) async {
        if (didPop) return;
        final shouldDiscard = await _showDiscardDialog(context);
        if (shouldDiscard == true && context.mounted) {
          context.pop();
        }
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Edit Invoice')),
        body: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Invoice Name Card
                    _buildEditableCard(
                      context,
                      title: 'Invoice Name',
                      value: editState.currentName ?? 'Unnamed Invoice',
                      icon: Icons.receipt,
                      onEdit: () {
                        _nameController.text = editState.currentName ?? '';
                        setState(() => _showNameEdit = true);
                      },
                      isEditing: _showNameEdit,
                      editWidget: _buildInlineEditField(
                        controller: _nameController,
                        onSave: () {
                          ref
                              .read(
                                editInvoiceProvider(widget.invoiceId).notifier,
                              )
                              .updateName(_nameController.text);
                          setState(() => _showNameEdit = false);
                        },
                        onCancel: () => setState(() => _showNameEdit = false),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Invoice Number Card
                    _buildEditableCard(
                      context,
                      title: 'Invoice Number',
                      value: editState.currentInvoiceNumber ?? 'Not set',
                      icon: Icons.tag,
                      onEdit: () {
                        _numberController.text =
                            editState.currentInvoiceNumber ?? '';
                        setState(() => _showNumberEdit = true);
                      },
                      isEditing: _showNumberEdit,
                      editWidget: _buildInlineEditField(
                        controller: _numberController,
                        onSave: () {
                          ref
                              .read(
                                editInvoiceProvider(widget.invoiceId).notifier,
                              )
                              .updateInvoiceNumber(_numberController.text);
                          setState(() => _showNumberEdit = false);
                        },
                        onCancel: () => setState(() => _showNumberEdit = false),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Invoice Date Card
                    _buildEditableCard(
                      context,
                      title: 'Invoice Date',
                      value: DateFormatter.format(
                        editState.currentInvoiceDate!,
                      ),
                      icon: Icons.calendar_today,
                      onEdit: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: editState.currentInvoiceDate!,
                          firstDate: DateTime(2000),
                          lastDate: DateTime(2100),
                        );
                        if (date != null) {
                          ref
                              .read(
                                editInvoiceProvider(widget.invoiceId).notifier,
                              )
                              .updateInvoiceDate(date);
                        }
                      },
                    ),
                    const SizedBox(height: 16),

                    // Amount Card with useItemsTotal toggle
                    _buildAmountCard(context, editState),
                    const SizedBox(height: 16),

                    // Currency Card (read-only)
                    _buildReadOnlyCard(
                      context,
                      title: 'Currency',
                      value: invoice.originalCurrency,
                      icon: Icons.attach_money,
                      subtitle:
                          'Currency from original invoice, cannot be changed',
                    ),
                    const SizedBox(height: 16),

                    // Business Assignment Card
                    _buildBusinessCard(context, editState),
                    const SizedBox(height: 32),

                    // Invoice Items Section
                    _buildItemsSection(context, editState),
                  ],
                ),
              ),
            ),

            // Bottom Actions
            _buildBottomActions(context, editState),
          ],
        ),
      ),
    );
  }

  Widget _buildEditableCard(
    BuildContext context, {
    required String title,
    required String value,
    required IconData icon,
    required VoidCallback onEdit,
    bool isEditing = false,
    Widget? editWidget,
  }) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ListTile(
            leading: Icon(icon),
            title: Text(title, style: Theme.of(context).textTheme.bodyMedium),
            subtitle: Text(
              value,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            trailing: IconButton(
              icon: const Icon(Icons.edit),
              onPressed: onEdit,
            ),
          ),
          if (isEditing && editWidget != null) ...[
            const Divider(height: 1),
            Padding(padding: const EdgeInsets.all(16), child: editWidget),
          ],
        ],
      ),
    );
  }

  Widget _buildReadOnlyCard(
    BuildContext context, {
    required String title,
    required String value,
    required IconData icon,
    String? subtitle,
  }) {
    return Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(title, style: Theme.of(context).textTheme.bodyMedium),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: Theme.of(context).textTheme.titleMedium),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
            ],
          ],
        ),
        trailing: const Icon(Icons.info_outline),
      ),
    );
  }

  Widget _buildInlineEditField({
    required TextEditingController controller,
    required VoidCallback onSave,
    required VoidCallback onCancel,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: controller,
            keyboardType: keyboardType,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              isDense: true,
            ),
          ),
        ),
        const SizedBox(width: 8),
        ElevatedButton(onPressed: onSave, child: const Text('Save')),
        const SizedBox(width: 8),
        OutlinedButton(onPressed: onCancel, child: const Text('Cancel')),
      ],
    );
  }

  Widget _buildAmountCard(BuildContext context, EditInvoiceState editState) {
    final useItemsTotal = editState.currentUseItemsTotal;
    final amount = useItemsTotal
        ? editState.calculatedItemsTotal
        : (editState.currentOriginalAmount ?? 0.0);

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ListTile(
            leading: const Icon(Icons.attach_money),
            title: Text(
              'Amount',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            subtitle: Text(
              CurrencyFormatter.format(
                amount,
                editState.invoice!.originalCurrency,
              ),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            trailing: useItemsTotal
                ? null
                : IconButton(
                    icon: const Icon(Icons.edit),
                    onPressed: () {
                      _amountController.text = amount.toStringAsFixed(2);
                      setState(() => _showAmountEdit = true);
                    },
                  ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Switch(
                  value: useItemsTotal,
                  onChanged: (value) {
                    ref
                        .read(editInvoiceProvider(widget.invoiceId).notifier)
                        .toggleUseItemsTotal(value);
                  },
                ),
                const SizedBox(width: 8),
                const Text('Use Items Total'),
              ],
            ),
          ),
          if (useItemsTotal)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(
                'Amount is calculated from line items',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          if (_showAmountEdit && !useItemsTotal) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: _buildInlineEditField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                onSave: () {
                  final amount = double.tryParse(_amountController.text);
                  if (amount != null) {
                    ref
                        .read(editInvoiceProvider(widget.invoiceId).notifier)
                        .updateOriginalAmount(amount);
                  }
                  setState(() => _showAmountEdit = false);
                },
                onCancel: () => setState(() => _showAmountEdit = false),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBusinessCard(BuildContext context, EditInvoiceState editState) {
    final vendorsAsync = ref.watch(vendorsProvider);

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ListTile(
            leading: const Icon(Icons.business),
            title: Text(
              'Business',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            subtitle: Text(
              editState.invoice!.vendorName,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            trailing: IconButton(
              icon: Icon(
                _showBusinessDropdown ? Icons.expand_less : Icons.expand_more,
              ),
              onPressed: () => setState(
                () => _showBusinessDropdown = !_showBusinessDropdown,
              ),
            ),
          ),
          if (_showBusinessDropdown) ...[
            const Divider(height: 1),
            vendorsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Failed to load businesses: $error'),
              ),
              data: (vendors) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    height: 200,
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: vendors.length,
                      itemBuilder: (context, index) {
                        final vendor = vendors[index];
                        final isSelected =
                            vendor.id == editState.currentVendorId;
                        return ListTile(
                          title: Text(vendor.name),
                          selected: isSelected,
                          trailing: isSelected ? const Icon(Icons.check) : null,
                          onTap: () {
                            ref
                                .read(
                                  editInvoiceProvider(
                                    widget.invoiceId,
                                  ).notifier,
                                )
                                .updateVendorId(vendor.id);
                            setState(() => _showBusinessDropdown = false);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildItemsSection(BuildContext context, EditInvoiceState editState) {
    final items = editState.currentItems;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Text(
              'Line Items',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${items.length}',
                style: Theme.of(context).textTheme.labelLarge,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        if (items.isEmpty && _editingItemIndex != -1) ...[
          // Empty state
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                Icon(Icons.list_alt, size: 48, color: Colors.grey.shade400),
                const SizedBox(height: 16),
                Text(
                  'No line items extracted',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'Add items to itemize this invoice',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () => _startAddingItem(editState),
                  icon: const Icon(Icons.add),
                  label: const Text('Add Item'),
                ),
              ],
            ),
          ),
        ] else ...[
          // Items list
          ...items.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            return _buildItemCard(context, editState, item, index);
          }),

          const SizedBox(height: 16),

          // Add new item card (inline, similar to editing)
          if (_editingItemIndex == -1) ...[
            Card(
              color: Theme.of(
                context,
              ).colorScheme.primaryContainer.withValues(alpha: 0.3),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.add_circle_outline),
                        const SizedBox(width: 8),
                        Text(
                          'Add New Item',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _itemDescriptionController,
                      decoration: const InputDecoration(
                        labelText: 'Description *',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _itemTotalController,
                      decoration: const InputDecoration(
                        labelText: 'Total *',
                        hintText: 'e.g., 100.00',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton(
                          onPressed: () => _cancelItemEdit(),
                          child: const Text('Cancel'),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () => _saveItem(editState),
                          child: const Text('Add'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Calculated total
          if (editState.currentUseItemsTotal)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(
                  context,
                ).colorScheme.primaryContainer.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Calculated total from items:',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    CurrencyFormatter.format(
                      editState.calculatedItemsTotal,
                      editState.invoice!.originalCurrency,
                    ),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 8),

          // Add Item button (only show when not adding)
          if (_editingItemIndex != -1)
            OutlinedButton.icon(
              onPressed: () => _startAddingItem(editState),
              icon: const Icon(Icons.add),
              label: const Text('Add Item'),
            ),

          if (!editState.currentUseItemsTotal && _editingItemIndex != -1)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Tip: Turn on "Use Items Total" above to auto-calculate the total',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
        ],
      ],
    );
  }

  Widget _buildItemCard(
    BuildContext context,
    EditInvoiceState editState,
    LineItem item,
    int index,
  ) {
    final isDeleting = _deletingItemIndex == index;
    final isEditing = _editingItemIndex == index;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ListTile(
            title: Text(
              item.description,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text(
              CurrencyFormatter.format(
                item.total,
                editState.invoice!.originalCurrency,
              ),
            ),
            leading: IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () => _startEditingItem(index, item),
            ),
            trailing: IconButton(
              icon: const Icon(Icons.delete, color: Colors.red),
              onPressed: () => setState(() => _deletingItemIndex = index),
            ),
          ),
          if (isEditing) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _itemDescriptionController,
                    decoration: const InputDecoration(
                      labelText: 'Description *',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _itemTotalController,
                    decoration: const InputDecoration(
                      labelText: 'Total *',
                      hintText: 'e.g., 100.00',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      OutlinedButton(
                        onPressed: () => _cancelItemEdit(),
                        child: const Text('Cancel'),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: () => _saveItem(editState),
                        child: const Text('Save'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
          if (isDeleting) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Expanded(child: Text('Delete this item?')),
                  OutlinedButton(
                    onPressed: () => setState(() => _deletingItemIndex = null),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () {
                      ref
                          .read(editInvoiceProvider(widget.invoiceId).notifier)
                          .deleteItem(index);
                      setState(() => _deletingItemIndex = null);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                    ),
                    child: const Text('Delete'),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBottomActions(BuildContext context, EditInvoiceState editState) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ElevatedButton(
            onPressed: editState.isSaving
                ? null
                : () => _saveAllChanges(context),
            child: editState.isSaving
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save All Changes'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: editState.isSaving
                ? null
                : () => _confirmDelete(context),
            style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete Invoice'),
          ),
        ],
      ),
    );
  }

  void _startAddingItem(EditInvoiceState editState) {
    _itemDescriptionController.clear();
    _itemTotalController.clear();
    setState(() => _editingItemIndex = -1);
  }

  void _startEditingItem(int index, LineItem item) {
    _itemDescriptionController.text = item.description;
    _itemTotalController.text = item.total.toString();
    setState(() => _editingItemIndex = index);
  }

  void _cancelItemEdit() {
    setState(() => _editingItemIndex = null);
  }

  void _saveItem(EditInvoiceState editState) {
    final description = _itemDescriptionController.text.trim();
    final total = double.tryParse(_itemTotalController.text);

    if (description.isEmpty || total == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Description and total are required')),
      );
      return;
    }

    final newItem = LineItem(
      id: _editingItemIndex == -1
          ? null
          : editState.currentItems[_editingItemIndex!].id,
      description: description,
      quantity: null,
      unitPrice: null,
      total: total,
      currency: editState.invoice!.originalCurrency,
    );

    if (_editingItemIndex == -1) {
      ref.read(editInvoiceProvider(widget.invoiceId).notifier).addItem(newItem);
    } else {
      ref
          .read(editInvoiceProvider(widget.invoiceId).notifier)
          .updateItem(_editingItemIndex!, newItem);
    }

    _cancelItemEdit();
  }

  Future<void> _saveAllChanges(BuildContext context) async {
    final success = await ref
        .read(editInvoiceProvider(widget.invoiceId).notifier)
        .saveAll();

    if (success && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invoice updated successfully'),
          backgroundColor: Colors.green,
        ),
      );
      context.pop();
    } else if (context.mounted) {
      final error = ref.read(editInvoiceProvider(widget.invoiceId)).error;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error ?? 'Failed to save invoice'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _confirmDelete(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Invoice?'),
        content: const Text(
          'Are you sure you want to delete this invoice? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      final success = await ref
          .read(editInvoiceProvider(widget.invoiceId).notifier)
          .delete();
      if (success && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Invoice deleted successfully'),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    }
  }

  Future<bool?> _showDiscardDialog(BuildContext context) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Discard unsaved changes?'),
        content: const Text(
          'You have unsaved changes to this invoice. Discard changes and go back?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            child: const Text('Discard'),
          ),
        ],
      ),
    );
  }
}
