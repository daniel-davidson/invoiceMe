import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:frontend/core/theme/app_theme.dart';
import 'package:frontend/core/utils/currency_formatter.dart';
import 'package:frontend/features/vendors/presentation/providers/vendor_analytics_provider.dart';

class VendorAnalyticsScreen extends ConsumerWidget {
  final String vendorId;

  const VendorAnalyticsScreen({super.key, required this.vendorId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsState = ref.watch(vendorAnalyticsProvider(vendorId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Business Analytics'),
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () async {
              final message = await ref
                  .read(vendorAnalyticsProvider(vendorId).notifier)
                  .exportCsv();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(message),
                    duration: const Duration(seconds: 2),
                  ),
                );
              }
            },
          ),
        ],
      ),
      body: analyticsState.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Error: $error')),
        data: (analytics) {
          if (analytics == null) {
            return const Center(child: Text('No data available'));
          }

          return _buildAnalyticsContent(context, analytics, ref);
        },
      ),
    );
  }

  Widget _buildAnalyticsContent(
    BuildContext context,
    VendorAnalytics analytics,
    WidgetRef ref,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            analytics.vendorName,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 24),
          // KPI Cards
          Row(
            children: [
              Expanded(
                child: _KpiCard(
                  title: 'This Month',
                  value: CurrencyFormatter.format(
                    analytics.kpis.currentMonthSpend,
                    'USD',
                  ),
                  color: AppTheme.primaryColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _KpiCard(
                  title: 'Monthly Limit',
                  value: analytics.kpis.monthlyLimit != null
                      ? CurrencyFormatter.format(
                          analytics.kpis.monthlyLimit!,
                          'USD',
                        )
                      : 'Not set',
                  color: AppTheme.secondaryColor,
                  onEdit: () {
                    _showLimitDialog(context, analytics, ref);
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _KpiCard(
                  title: 'Monthly Avg',
                  value: CurrencyFormatter.format(
                    analytics.kpis.monthlyAverage,
                    'USD',
                  ),
                  color: AppTheme.accentColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _KpiCard(
                  title: 'Yearly Total',
                  value: CurrencyFormatter.format(
                    analytics.kpis.yearlyAverage,
                    'USD',
                  ),
                  color: Colors.purple,
                ),
              ),
            ],
          ),
          if (analytics.kpis.limitUtilization != null) ...[
            const SizedBox(height: 24),
            _LimitProgressCard(utilization: analytics.kpis.limitUtilization!),
          ],
          const SizedBox(height: 24),
          Text(
            'Monthly Spending',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: LineChart(
              LineChartData(
                gridData: const FlGridData(show: false),
                titlesData: const FlTitlesData(show: false),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: analytics.lineChart.datasets.first.data
                        .asMap()
                        .entries
                        .map(
                          (e) => FlSpot(
                            e.key.toDouble(),
                            (e.value as num).toDouble(),
                          ),
                        )
                        .toList(),
                    isCurved: true,
                    color: AppTheme.primaryColor,
                    barWidth: 3,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(
                      show: true,
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showLimitDialog(
    BuildContext context,
    VendorAnalytics analytics,
    WidgetRef ref,
  ) {
    final controller = TextEditingController(
      text: analytics.kpis.monthlyLimit?.toString() ?? '',
    );

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Set Monthly Limit'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Monthly Limit',
            prefixText: '\$ ',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final limit = double.tryParse(controller.text);
              ref
                  .read(vendorAnalyticsProvider(vendorId).notifier)
                  .updateLimit(limit);
              Navigator.pop(dialogContext);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String title;
  final String value;
  final Color color;
  final VoidCallback? onEdit;

  const _KpiCard({
    required this.title,
    required this.value,
    required this.color,
    this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: Theme.of(context).textTheme.bodyMedium),
                if (onEdit != null)
                  IconButton(
                    icon: const Icon(Icons.edit, size: 16),
                    onPressed: onEdit,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: color,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LimitProgressCard extends StatelessWidget {
  final double utilization;

  const _LimitProgressCard({required this.utilization});

  @override
  Widget build(BuildContext context) {
    final color = utilization > 100
        ? Colors.red
        : utilization > 80
        ? Colors.orange
        : Colors.green;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Limit Usage', style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: (utilization / 100).clamp(0, 1),
                      backgroundColor: color.withValues(alpha: 0.2),
                      color: color,
                      minHeight: 8,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Text(
                  '${utilization.toStringAsFixed(1)}%',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: color,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
