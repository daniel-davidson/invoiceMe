import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:frontend/core/theme/app_theme.dart';
import 'package:frontend/core/utils/date_formatter.dart';
import 'package:frontend/features/home/presentation/providers/home_provider.dart';

class VendorCard extends StatefulWidget {
  final Vendor vendor;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final Function(String vendorId)? onViewAllInvoices;

  const VendorCard({
    super.key,
    required this.vendor,
    required this.onTap,
    required this.onEdit,
    this.onViewAllInvoices,
  });

  @override
  State<VendorCard> createState() => _VendorCardState();
}

class _VendorCardState extends State<VendorCard> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final hasInvoices = widget.vendor.latestInvoices != null && 
                        widget.vendor.latestInvoices!.isNotEmpty;
    final invoiceCount = widget.vendor.invoiceCount ?? 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: [
          InkWell(
            onTap: widget.onTap,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: invoiceCount > 0
                          ? const LinearGradient(
                              colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                            )
                          : LinearGradient(
                              colors: [
                                Colors.grey.shade400,
                                Colors.grey.shade500,
                              ],
                            ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        widget.vendor.name.substring(0, 1).toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.vendor.name,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        if (invoiceCount > 0)
                          Text(
                            '$invoiceCount ${invoiceCount == 1 ? 'invoice' : 'invoices'}',
                            style: Theme.of(context).textTheme.bodyMedium,
                          )
                        else
                          Text(
                            'No invoices yet',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.grey,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.edit_outlined),
                    onPressed: onEdit,
                  ),
                  if (hasInvoices)
                    IconButton(
                      icon: Icon(
                        _isExpanded ? Icons.expand_less : Icons.expand_more,
                      ),
                      onPressed: () {
                        setState(() {
                          _isExpanded = !_isExpanded;
                        });
                      },
                    )
                  else if (invoiceCount > 0)
                    const Icon(Icons.chevron_right)
                  else
                    Icon(
                      Icons.info_outline,
                      color: Colors.grey.shade400,
                    ),
                ],
              ),
            ),
          ),
          if (_isExpanded && hasInvoices) _buildInvoicesList(),
        ],
      ),
    );
  }

  Widget _buildInvoicesList() {
    return Column(
      children: [
        const Divider(height: 1),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          itemCount: widget.vendor.latestInvoices!.length,
          separatorBuilder: (context, index) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final invoice = widget.vendor.latestInvoices![index];
            return ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 4),
              leading: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit, size: 18),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () {
                      context.push('/invoice/${invoice.id}/edit');
                    },
                  ),
                  const SizedBox(width: 8),
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                    color: invoice.needsReview 
                        ? Colors.orange.withValues(alpha: 0.1)
                        : Colors.green.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      invoice.needsReview ? Icons.warning_amber : Icons.receipt_long,
                      color: invoice.needsReview ? Colors.orange : Colors.green,
                      size: 20,
                    ),
                  ),
                ],
              ),
              title: Text(
                invoice.name ?? 'Invoice',
                style: const TextStyle(fontSize: 14),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text(
                DateFormatter.format(invoice.invoiceDate),
                style: const TextStyle(fontSize: 12),
              ),
              trailing: Text(
                '${invoice.originalAmount.toStringAsFixed(2)} ${invoice.originalCurrency}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              onTap: () {
                context.push('/invoice/${invoice.id}');
              },
            );
          },
        ),
        if (widget.vendor.invoiceCount! > widget.vendor.latestInvoices!.length)
          Padding(
            padding: const EdgeInsets.all(8),
            child: TextButton.icon(
              onPressed: () {
                if (widget.onViewAllInvoices != null) {
                  widget.onViewAllInvoices!(widget.vendor.id);
                }
              },
              icon: const Icon(Icons.list_alt, size: 18),
              label: Text(
                'View All ${widget.vendor.invoiceCount} Invoices',
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ),
      ],
    );
  }

  VoidCallback get onEdit => widget.onEdit;
}
