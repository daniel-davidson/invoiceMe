import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:frontend/core/utils/currency_formatter.dart';
import 'package:frontend/core/utils/date_formatter.dart';
import 'package:frontend/features/invoices/presentation/providers/invoices_provider.dart';

class InvoicesListScreen extends ConsumerStatefulWidget {
  const InvoicesListScreen({super.key});

  @override
  ConsumerState<InvoicesListScreen> createState() => _InvoicesListScreenState();
}

class _InvoicesListScreenState extends ConsumerState<InvoicesListScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  DateTime? _lastSearchTime;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    setState(() => _searchQuery = value);
    
    // Debounce search (300ms delay)
    _lastSearchTime = DateTime.now();
    Future.delayed(const Duration(milliseconds: 300), () {
      // Only execute search if this is still the latest search
      if (_lastSearchTime != null &&
          DateTime.now().difference(_lastSearchTime!).inMilliseconds >= 300) {
        ref.read(invoicesProvider.notifier).search(value);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final invoicesState = ref.watch(invoicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('All Invoices'),
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () async {
              try {
                await ref.read(invoicesProvider.notifier).exportCsv();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('CSV exported successfully'),
                      backgroundColor: Colors.green,
                      duration: Duration(seconds: 5),
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Export failed: ${e.toString()}'),
                      backgroundColor: Colors.red,
                      duration: const Duration(seconds: 5),
                    ),
                  );
                }
              }
            },
            tooltip: 'Export CSV',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search input at top
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by business, amount, number...',
                prefixIcon: invoicesState.isLoading && _searchQuery.isNotEmpty
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _onSearchChanged('');
                        },
                      )
                    : null,
                border: const OutlineInputBorder(),
                isDense: true,
              ),
              onChanged: _onSearchChanged,
            ),
          ),
          // Invoices list
          Expanded(
            child: invoicesState.when(
        loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error, size: 48, color: Colors.red),
                    const SizedBox(height: 16),
                    Text('Error: $error'),
                  ],
                ),
              ),
              data: (invoices) {
                if (invoices.isEmpty) {
                  // Show different empty state for search vs no invoices
                  if (_searchQuery.isNotEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.search_off, size: 64, color: Colors.grey.shade400),
                          const SizedBox(height: 16),
                          const Text('No invoices found', style: TextStyle(fontSize: 18)),
                          const SizedBox(height: 8),
                          const Text('Try a different search term or clear the filter'),
                        ],
                      ),
                    );
                  } else {
                    return const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt_long, size: 64, color: Colors.grey),
                          SizedBox(height: 16),
                          Text('No invoices yet', style: TextStyle(fontSize: 18)),
                        ],
                      ),
                    );
                  }
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
                  leading: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit, size: 20),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () => context.push('/invoice/${invoice.id}/edit'),
                      ),
                      const SizedBox(width: 8),
                      CircleAvatar(
                    backgroundColor: invoice.needsReview
                        ? Colors.orange.withValues(alpha: 0.2)
                        : Colors.green.withValues(alpha: 0.2),
                        child: Icon(
                          invoice.needsReview ? Icons.warning : Icons.receipt,
                          color: invoice.needsReview ? Colors.orange : Colors.green,
                        ),
                      ),
                    ],
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
          ),
        ],
      ),
    );
  }
}
