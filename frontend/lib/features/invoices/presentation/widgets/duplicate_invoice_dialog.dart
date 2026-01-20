import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:frontend/core/utils/currency_formatter.dart';
import 'package:frontend/core/utils/date_formatter.dart';

/// Dialog shown when a duplicate invoice is detected
/// Per FLOW_CONTRACT §6a: "Duplicate Invoice Detection Dialog"
class DuplicateInvoiceDialog extends StatelessWidget {
  final String existingInvoiceId;
  final String vendorName;
  final double amount;
  final String currency;
  final DateTime invoiceDate;
  final DateTime uploadedAt;
  final String? invoiceNumber;

  const DuplicateInvoiceDialog({
    super.key,
    required this.existingInvoiceId,
    required this.vendorName,
    required this.amount,
    required this.currency,
    required this.invoiceDate,
    required this.uploadedAt,
    this.invoiceNumber,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      icon: const Icon(
        Icons.warning_amber_rounded,
        size: 64,
        color: Colors.orange,
      ),
      title: const Text('Invoice Already Exists'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'This invoice was already uploaded on ${DateFormatter.format(uploadedAt)}',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            _buildDetailRow(context, 'Business:', vendorName),
            const SizedBox(height: 8),
            _buildDetailRow(
              context,
              'Amount:',
              CurrencyFormatter.format(amount, currency),
            ),
            const SizedBox(height: 8),
            _buildDetailRow(
              context,
              'Date:',
              DateFormatter.format(invoiceDate),
            ),
            if (invoiceNumber != null) ...[
              const SizedBox(height: 8),
              _buildDetailRow(context, 'Invoice #:', invoiceNumber!),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            context.push('/invoice/$existingInvoiceId');
          },
          child: const Text('View Existing Invoice'),
        ),
      ],
    );
  }

  Widget _buildDetailRow(BuildContext context, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 90,
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade700,
                ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }
}
