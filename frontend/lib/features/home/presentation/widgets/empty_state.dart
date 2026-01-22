import 'package:flutter/material.dart';
import 'package:frontend/core/theme/app_theme.dart';

class EmptyState extends StatelessWidget {
  final VoidCallback onAddBusiness;
  final VoidCallback onUploadInvoice;

  const EmptyState({
    super.key,
    required this.onAddBusiness,
    required this.onUploadInvoice,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.receipt_long_outlined,
                size: 64,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No invoices yet',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Get started by adding a business or uploading your first invoice',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 32),
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed: onAddBusiness,
                  icon: const Icon(Icons.business),
                  label: const Text('Add Business'),
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: onUploadInvoice,
                  icon: const Icon(Icons.upload),
                  label: const Text('Upload Invoice'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
