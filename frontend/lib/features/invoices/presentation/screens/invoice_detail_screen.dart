import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:frontend/core/utils/currency_formatter.dart';
import 'package:frontend/core/utils/date_formatter.dart';
import 'package:frontend/features/invoices/presentation/providers/invoice_detail_provider.dart';

class InvoiceDetailScreen extends ConsumerWidget {
  final String invoiceId;

  const InvoiceDetailScreen({super.key, required this.invoiceId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoiceState = ref.watch(invoiceDetailProvider(invoiceId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoice Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => _showEditDialog(context, ref),
          ),
          IconButton(
            icon: const Icon(Icons.delete),
            onPressed: () => _confirmDelete(context, ref),
          ),
        ],
      ),
      body: invoiceState.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Error: $error')),
        data: (invoice) {
          if (invoice == null) {
            return const Center(child: Text('Invoice not found'));
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (invoice.needsReview)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.orange),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning, color: Colors.orange),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'This invoice needs review. Some data may be inaccurate.',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ),
                      ],
                    ),
                  ),
                _DetailCard(
                  title: 'Vendor',
                  value: invoice.vendorName,
                  icon: Icons.business,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _DetailCard(
                        title: 'Amount',
                        value: CurrencyFormatter.format(
                          invoice.originalAmount,
                          invoice.originalCurrency,
                        ),
                        icon: Icons.attach_money,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _DetailCard(
                        title: 'Date',
                        value: DateFormatter.format(invoice.invoiceDate),
                        icon: Icons.calendar_today,
                      ),
                    ),
                  ],
                ),
                if (invoice.normalizedAmount != null) ...[
                  const SizedBox(height: 16),
                  _DetailCard(
                    title: 'Normalized Amount',
                    value: CurrencyFormatter.format(
                      invoice.normalizedAmount!,
                      'USD',
                    ),
                    icon: Icons.currency_exchange,
                    subtitle:
                        'FX Rate: ${invoice.fxRate?.toStringAsFixed(4) ?? 'N/A'}',
                  ),
                ],
                if (invoice.invoiceNumber != null) ...[
                  const SizedBox(height: 16),
                  _DetailCard(
                    title: 'Invoice Number',
                    value: invoice.invoiceNumber!,
                    icon: Icons.tag,
                  ),
                ],
                // Line Items Section
                if (invoice.items.isNotEmpty) ...[
                  const SizedBox(height: 32),
                  Text(
                    'Items Purchased',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    child: Column(
                      children: [
                        // Header
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: Theme.of(context)
                                .colorScheme
                                .primary
                                .withValues(alpha: 0.1),
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(12),
                              topRight: Radius.circular(12),
                            ),
                          ),
                          child: Row(
                            children: [
                              const Expanded(
                                flex: 3,
                                child: Text(
                                  'Description',
                                  style: TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ),
                              const Expanded(
                                flex: 1,
                                child: Text(
                                  'Qty',
                                  style: TextStyle(fontWeight: FontWeight.bold),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text(
                                  'Amount',
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                  textAlign: TextAlign.right,
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Items
                        ...invoice.items.asMap().entries.map<Widget>((entry) {
                          final index = entry.key;
                          final item = entry.value;
                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              border: Border(
                                bottom: index < invoice.items.length - 1
                                    ? BorderSide(
                                        color: Theme.of(context).dividerColor,
                                      )
                                    : BorderSide.none,
                              ),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  flex: 3,
                                  child: Text(
                                    item.description,
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                ),
                                Expanded(
                                  flex: 1,
                                  child: Text(
                                    item.quantity != null
                                        ? item.quantity!.toStringAsFixed(
                                            item.quantity! % 1 == 0 ? 0 : 2,
                                          )
                                        : '-',
                                    textAlign: TextAlign.center,
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                ),
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    CurrencyFormatter.format(
                                      item.total,
                                      invoice.originalCurrency,
                                    ),
                                    textAlign: TextAlign.right,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(
                                          fontWeight: FontWeight.w500,
                                        ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                        // Totals section
                        if (invoice.subtotalAmount != null ||
                            invoice.vatAmount != null) ...[
                          const Divider(height: 1, thickness: 2),
                          if (invoice.subtotalAmount != null)
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Subtotal',
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                  Text(
                                    CurrencyFormatter.format(
                                      invoice.subtotalAmount!,
                                      invoice.originalCurrency,
                                    ),
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                ],
                              ),
                            ),
                          if (invoice.vatAmount != null)
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'VAT/Tax',
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                  Text(
                                    CurrencyFormatter.format(
                                      invoice.vatAmount!,
                                      invoice.originalCurrency,
                                    ),
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                ],
                              ),
                            ),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Theme.of(context)
                                  .colorScheme
                                  .primary
                                  .withValues(alpha: 0.05),
                              borderRadius: const BorderRadius.only(
                                bottomLeft: Radius.circular(12),
                                bottomRight: Radius.circular(12),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Total',
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                                Text(
                                  CurrencyFormatter.format(
                                    invoice.originalAmount,
                                    invoice.originalCurrency,
                                  ),
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(
                                        fontWeight: FontWeight.bold,
                                        color: Theme.of(context).colorScheme.primary,
                                      ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      // Open file
                    },
                    icon: const Icon(Icons.file_open),
                    label: const Text('View Original File'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showEditDialog(BuildContext context, WidgetRef ref) {
    // TODO: Implement edit dialog
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Invoice?'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      await ref.read(invoiceDetailProvider(invoiceId).notifier).delete();
      if (context.mounted) context.pop();
    }
  }
}

class _DetailCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final String? subtitle;

  const _DetailCard({
    required this.title,
    required this.value,
    required this.icon,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: Theme.of(context).colorScheme.primary),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  Text(
                    value,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle!,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
