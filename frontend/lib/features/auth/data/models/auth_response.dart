import 'package:frontend/features/auth/data/models/user_model.dart';

class AuthResponse {
  final String accessToken;
  final String? refreshToken;
  final UserModel user;

  const AuthResponse({
    required this.accessToken,
    this.refreshToken,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    // Handle case where accessToken might be null (email confirmation required)
    final accessToken = json['accessToken'] as String?;
    if (accessToken == null || accessToken.isEmpty) {
      throw Exception('Email confirmation may be required. Please check your email.');
    }

    return AuthResponse(
      accessToken: accessToken,
      refreshToken: json['refreshToken'] as String?,
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}
