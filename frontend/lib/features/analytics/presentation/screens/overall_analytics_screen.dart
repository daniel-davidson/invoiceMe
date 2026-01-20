import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:frontend/core/theme/app_theme.dart';
import 'package:frontend/core/utils/currency_formatter.dart';
import 'package:frontend/features/analytics/presentation/providers/overall_analytics_provider.dart';

class OverallAnalyticsScreen extends ConsumerWidget {
  const OverallAnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsState = ref.watch(overallAnalyticsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Analytics Overview'),
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () async {
              final message = await ref.read(overallAnalyticsProvider.notifier).exportCsv();
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

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Balance Card
                Card(
                  color: analytics.kpis.remainingBalance >= 0
                      ? Colors.green.withValues(alpha: 0.1)
                      : Colors.red.withValues(alpha: 0.1),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Text(
                          'Remaining Balance',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          CurrencyFormatter.format(
                            analytics.kpis.remainingBalance,
                            'USD',
                          ),
                          style: Theme.of(context)
                              .textTheme
                              .displayLarge
                              ?.copyWith(
                                color: analytics.kpis.remainingBalance >= 0
                                    ? Colors.green
                                    : Colors.red,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${CurrencyFormatter.format(analytics.kpis.totalSpend, 'USD')} of ${CurrencyFormatter.format(analytics.kpis.totalLimits, 'USD')}',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        title: 'Vendors',
                        value: analytics.kpis.vendorCount.toString(),
                        icon: Icons.business,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _StatCard(
                        title: 'Invoices',
                        value: analytics.kpis.invoiceCount.toString(),
                        icon: Icons.receipt_long,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Text(
                  'Top 5 Vendors',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 200,
                  child: PieChart(
                    PieChartData(
                      sections: analytics.pieChart.segments
                          .map(
                            (s) => PieChartSectionData(
                              value: s.value,
                              title: '${s.percentage.toStringAsFixed(0)}%',
                              color: _parseColor(s.color),
                              radius: 80,
                              titleStyle: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          )
                          .toList(),
                      centerSpaceRadius: 40,
                      sectionsSpace: 2,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                ...analytics.pieChart.segments.map(
                  (s) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Container(
                          width: 16,
                          height: 16,
                          decoration: BoxDecoration(
                            color: _parseColor(s.color),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(child: Text(s.label)),
                        Text(CurrencyFormatter.format(s.value, 'USD')),
                      ],
                    ),
                  ),
                ),
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
                              .map((e) => FlSpot(
                                    e.key.toDouble(),
                                    e.value,
                                  ))
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
        },
      ),
    );
  }

  Color _parseColor(String hexColor) {
    final hex = hexColor.replaceAll('#', '');
    return Color(int.parse('FF$hex', radix: 16));
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: AppTheme.primaryColor),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.bodyMedium),
                Text(
                  value,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
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
