import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:frontend/core/utils/currency_formatter.dart';
import 'package:frontend/core/utils/date_formatter.dart';
import 'package:frontend/features/invoices/presentation/providers/invoices_provider.dart';

class InvoicesListScreen extends ConsumerWidget {
  const InvoicesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoicesState = ref.watch(invoicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('All Invoices'),
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () => ref.read(invoicesProvider.notifier).exportCsv(),
            tooltip: 'Export CSV',
          ),
        ],
      ),
      body: invoicesState.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Error: $error')),
        data: (invoices) {
          if (invoices.isEmpty) {
            return const Center(
              child: Text('No invoices yet'),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: invoices.length,
            itemBuilder: (context, index) {
              final invoice = invoices[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  onTap: () => context.push('/invoice/${invoice.id}'),
                  leading: CircleAvatar(
                    backgroundColor: invoice.needsReview
                        ? Colors.orange.withValues(alpha: 0.2)
                        : Colors.green.withValues(alpha: 0.2),
                    child: Icon(
                      invoice.needsReview ? Icons.warning : Icons.receipt,
                      color: invoice.needsReview ? Colors.orange : Colors.green,
                    ),
                  ),
                  title: Text(invoice.vendorName),
                  subtitle: Text(DateFormatter.format(invoice.invoiceDate)),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        CurrencyFormatter.format(
                          invoice.originalAmount,
                          invoice.originalCurrency,
                        ),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      if (invoice.normalizedAmount != null &&
                          invoice.originalCurrency != 'USD')
                        Text(
                          CurrencyFormatter.format(
                            invoice.normalizedAmount!,
                            'USD',
                          ),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
