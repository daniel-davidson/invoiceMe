import 'package:frontend/features/auth/domain/entities/user.dart';

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.email,
    required super.fullName,
    super.personalBusinessId,
    required super.systemCurrency,
    required super.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      fullName: json['fullName'] as String,
      personalBusinessId: json['personalBusinessId'] as String?,
      systemCurrency: json['systemCurrency'] as String? ?? 'USD',
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'personalBusinessId': personalBusinessId,
      'systemCurrency': systemCurrency,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  User toEntity() => this;
}
