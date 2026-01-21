import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:frontend/core/theme/app_theme.dart';
import 'package:frontend/features/home/presentation/widgets/vendor_card.dart';
import 'package:frontend/features/home/presentation/widgets/empty_state.dart';
import 'package:frontend/features/home/presentation/providers/home_provider.dart';
import 'package:frontend/features/invoices/presentation/widgets/assign_business_modal.dart';
import 'package:frontend/features/invoices/presentation/widgets/duplicate_invoice_dialog.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  /// Map upload stage to user-friendly text
  String _getUploadStageText(UploadStage stage) {
    switch (stage) {
      case UploadStage.idle:
        return 'Ready';
      case UploadStage.uploading:
        return 'Uploading file...';
      case UploadStage.ocr:
        return 'Processing OCR...';
      case UploadStage.extracting:
        return 'Extracting data...';
      case UploadStage.saving:
        return 'Saving invoice...';
      case UploadStage.complete:
        return 'Complete!';
      case UploadStage.error:
        return 'Error';
    }
  }

  @override
  Widget build(BuildContext context) {
    final vendorsState = ref.watch(vendorsProvider);
    final uploadState = ref.watch(uploadStateProvider);

    // Listen for upload errors and completion (triggers post-upload assignment modal)
    ref.listen(uploadStateProvider, (previous, next) {
      // Handle duplicate invoice detection (per FLOW_CONTRACT §6a)
      if (next.error == 'DUPLICATE_INVOICE' && next.uploadResult != null) {
        final existing = next.uploadResult!;
        showDialog(
          context: context,
          builder: (context) => DuplicateInvoiceDialog(
            existingInvoiceId: existing.invoiceId,
            vendorName: existing.extractedVendorName,
            amount: existing.amount ?? 0.0,
            currency: existing.currency ?? 'ILS',
            invoiceDate: existing.invoiceDate ?? DateTime.now(),
            uploadedAt: existing.uploadedAt ?? DateTime.now(),
            invoiceNumber: existing.invoiceNumber,
          ),
        ).then((_) {
          // Reset upload state after dialog closes
          ref.read(uploadStateProvider.notifier).state = const UploadState();
        });
        return;
      }

      // Show error snackbar for other errors
      if (next.error != null) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }

      // CRITICAL: Show post-upload assignment modal when upload completes (ALWAYS per FLOW_CONTRACT §4a)
      if (next.uploadStage == UploadStage.complete &&
          next.uploadResult != null) {
        final result = next.uploadResult!;

        // Show assignment modal (MANDATORY UX - always shown)
        showDialog(
          context: context,
          barrierDismissible: false, // User must make a choice
          builder: (context) => AssignBusinessModal(
            invoiceId: result.invoiceId,
            extractedVendorId: result.extractedVendorId,
            extractedVendorName: result.extractedVendorName,
            confidence: result.confidence,
          ),
        ).then((assigned) {
          // After modal closes, show success snackbar
          if (context.mounted) {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  result.needsReview
                      ? 'Invoice uploaded for ${result.extractedVendorName}. Please review the extracted data.'
                      : 'Invoice uploaded successfully for ${result.extractedVendorName}!',
                ),
                backgroundColor: Colors.green,
                duration: const Duration(seconds: 4),
                action: SnackBarAction(
                  label: 'VIEW',
                  textColor: Colors.white,
                  onPressed: () => context.push('/invoice/${result.invoiceId}'),
                ),
              ),
            );
          }

          // Reset upload state
          ref.read(uploadStateProvider.notifier).state = const UploadState();
        });
      }
    });

    return Stack(
      children: [
        Scaffold(
          appBar: AppBar(
            title: const Text('InvoiceMe'),
            actions: [
              IconButton(
                icon: const Icon(Icons.insights),
                onPressed: () => context.push('/insights'),
                tooltip: 'AI Insights',
              ),
              // I08: Remove analytics icon (already exists near search)
              // Add business icon when vendors exist
              vendorsState.maybeWhen(
                data: (vendors) => vendors.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.business),
                        onPressed: () => _showAddVendorDialog(context, ref),
                        tooltip: 'Add Business',
                      )
                    : const SizedBox.shrink(),
                orElse: () => const SizedBox.shrink(),
              ),
              IconButton(
                icon: const Icon(Icons.settings_outlined),
                onPressed: () => context.push('/settings'),
                tooltip: 'Settings',
              ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: () async => ref.invalidate(vendorsProvider),
            child: vendorsState.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 48,
                      color: Colors.red,
                    ),
                    const SizedBox(height: 16),
                    Text('Error: $error'),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => ref.refresh(vendorsProvider),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
              data: (vendors) {
                if (vendors.isEmpty) {
                  return EmptyState(
                    onAddBusiness: () => _showAddVendorDialog(context, ref),
                    onUploadInvoice: () => _showUploadDialog(context, ref),
                  );
                }

                // Filter vendors by search query (client-side)
                final filteredVendors = _searchQuery.isEmpty
                    ? vendors
                    : vendors
                          .where(
                            (v) => v.name.toLowerCase().contains(
                              _searchQuery.toLowerCase(),
                            ),
                          )
                          .toList();

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount:
                      filteredVendors.length +
                      2, // +1 for header, +1 for search
                  itemBuilder: (context, index) {
                    // Search bar
                    if (index == 0) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _searchController,
                                decoration: InputDecoration(
                                  hintText: 'Search businesses...',
                                  prefixIcon: const Icon(Icons.search),
                                  suffixIcon: _searchQuery.isNotEmpty
                                      ? IconButton(
                                          icon: const Icon(Icons.clear),
                                          onPressed: () {
                                            setState(() {
                                              _searchController.clear();
                                              _searchQuery = '';
                                            });
                                          },
                                        )
                                      : null,
                                  border: const OutlineInputBorder(),
                                  isDense: true,
                                ),
                                onChanged: (value) {
                                  setState(() => _searchQuery = value);
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton.filledTonal(
                              onPressed: () =>
                                  _showAddVendorDialog(context, ref),
                              icon: const Icon(Icons.add),
                              tooltip: 'Add Business',
                            ),
                            IconButton.filledTonal(
                              onPressed: () => context.push('/analytics'),
                              icon: const Icon(Icons.analytics_outlined),
                              tooltip: 'Analytics',
                            ),
                          ],
                        ),
                      );
                    }

                    // Header
                    if (index == 1) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              filteredVendors.isEmpty
                                  ? 'No businesses found'
                                  : 'Your Businesses',
                              style: Theme.of(context).textTheme.headlineMedium,
                            ),
                            TextButton.icon(
                              onPressed: () => context.push('/invoices'),
                              icon: const Icon(Icons.list),
                              label: const Text('All Invoices'),
                            ),
                          ],
                        ),
                      );
                    }

                    // Show empty search result
                    if (filteredVendors.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          children: [
                            Icon(
                              Icons.search_off,
                              size: 64,
                              color: Colors.grey.shade400,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No businesses found',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Try a different search term',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      );
                    }

                    final vendor = filteredVendors[index - 2];
                    return VendorCard(
                      vendor: vendor,
                      onTap: () =>
                          context.push('/vendor/${vendor.id}/analytics'),
                      onEdit: () => _showEditVendorDialog(context, ref, vendor),
                      onViewAllInvoices: (vendorId) {
                        // Navigate to invoices list (could add filter in the future)
                        context.push('/vendor/$vendorId/analytics');
                      },
                    );
                  },
                );
              },
            ),
          ),
          // I05: No floating button when empty (EmptyState has its own buttons)
          // I07: Centered upload button when vendors exist
          floatingActionButton: vendorsState.maybeWhen(
            data: (vendors) => vendors.isNotEmpty
                ? FloatingActionButton.extended(
                    heroTag: 'upload',
                    onPressed: uploadState.isUploading
                        ? null
                        : () => _showUploadDialog(context, ref),
                    icon: uploadState.isUploading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.upload),
                    label: Text(
                      uploadState.isUploading ? 'Uploading...' : 'Upload Invoice',
                    ),
                  )
                : null,
            orElse: () => null,
          ),
          floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
        ),
        // Upload overlay with stage-based progress
        if (uploadState.isUploading)
          Container(
            color: Colors.black54,
            child: Center(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(),
                      const SizedBox(height: 16),
                      Text(
                        _getUploadStageText(uploadState.uploadStage),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      if (uploadState.progress != null &&
                          uploadState.uploadStage == UploadStage.uploading) ...[
                        const SizedBox(height: 8),
                        Text(
                          '${(uploadState.progress! * 100).toInt()}%',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ],
                      if (uploadState.uploadStage != UploadStage.uploading) ...[
                        const SizedBox(height: 8),
                        Text(
                          'This may take a moment',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  void _showAddVendorDialog(BuildContext context, WidgetRef ref) {
    final nameController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Business'),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
            labelText: 'Business Name',
            hintText: 'e.g. Google, IKEA, Cellcom',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.isNotEmpty) {
                await ref
                    .read(vendorsProvider.notifier)
                    .addVendor(nameController.text);
                if (context.mounted) Navigator.pop(context);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _showEditVendorDialog(
    BuildContext context,
    WidgetRef ref,
    dynamic vendor,
  ) {
    final nameController = TextEditingController(text: vendor.name);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Business'),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(labelText: 'Business Name'),
        ),
        actionsOverflowButtonSpacing: 8,
        actions: [
          Row(
            children: [
              TextButton(
                onPressed: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (dialogContext) => AlertDialog(
                      title: const Text('Delete Business?'),
                      content: const Text(
                        'This will also delete all related invoices.',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(dialogContext, false),
                          child: const Text('Cancel'),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                          ),
                          onPressed: () => Navigator.pop(dialogContext, true),
                          child: const Text('Delete'),
                        ),
                      ],
                    ),
                  );
                  if (confirmed == true && context.mounted) {
                    // Close the edit dialog first
                    Navigator.pop(context);
                    // Then delete the vendor
                    await ref
                        .read(vendorsProvider.notifier)
                        .deleteVendor(vendor.id);
                  }
                },
                child: const Text(
                  'Delete',
                  style: TextStyle(color: Colors.red),
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () async {
                  if (nameController.text.isNotEmpty) {
                    await ref
                        .read(vendorsProvider.notifier)
                        .updateVendor(vendor.id, nameController.text);
                    if (context.mounted) Navigator.pop(context);
                  }
                },
                child: const Text('Save'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showUploadDialog(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Upload Invoice',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _UploadOption(
                    icon: Icons.photo_library,
                    label: 'Gallery',
                    onTap: () async {
                      Navigator.pop(context);
                      await ref
                          .read(vendorsProvider.notifier)
                          .uploadFromGallery();
                    },
                  ),
                  _UploadOption(
                    icon: Icons.picture_as_pdf,
                    label: 'PDF',
                    onTap: () async {
                      Navigator.pop(context);
                      await ref.read(vendorsProvider.notifier).uploadPdf();
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _UploadOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _UploadOption({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(
                  context,
                ).colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                icon,
                size: 32,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            const SizedBox(height: 8),
            Text(label),
          ],
        ),
      ),
    );
  }
}
