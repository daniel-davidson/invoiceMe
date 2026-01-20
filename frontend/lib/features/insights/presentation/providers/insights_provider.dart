import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/features/auth/presentation/providers/auth_provider.dart';

class Insight {
  final String id;
  final String insightType;
  final String title;
  final String content;
  final DateTime generatedAt;

  Insight({
    required this.id,
    required this.insightType,
    required this.title,
    required this.content,
    required this.generatedAt,
  });

  factory Insight.fromJson(Map<String, dynamic> json) {
    return Insight(
      id: json['id'] as String,
      insightType: json['insightType'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      generatedAt: DateTime.parse(json['generatedAt'] as String),
    );
  }
}

final insightsProvider =
    StateNotifierProvider<InsightsNotifier, AsyncValue<List<Insight>>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return InsightsNotifier(apiClient);
});

class InsightsNotifier extends StateNotifier<AsyncValue<List<Insight>>> {
  final ApiClient _apiClient;

  InsightsNotifier(this._apiClient) : super(const AsyncValue.loading()) {
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    try {
      final response = await _apiClient.get('/insights');
      final List<dynamic> data = response.data as List<dynamic>;
      final insights = data
          .map((json) => Insight.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(insights);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> generate() async {
    state = const AsyncValue.loading();
    try {
      await _apiClient.post('/insights/generate', data: {});
      await load();
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}
