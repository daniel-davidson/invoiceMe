import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String email;
  final String fullName;
  final String? personalBusinessId;
  final String systemCurrency;
  final DateTime createdAt;

  const User({
    required this.id,
    required this.email,
    required this.fullName,
    this.personalBusinessId,
    required this.systemCurrency,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [
        id,
        email,
        fullName,
        personalBusinessId,
        systemCurrency,
        createdAt,
      ];

  User copyWith({
    String? id,
    String? email,
    String? fullName,
    String? personalBusinessId,
    String? systemCurrency,
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      personalBusinessId: personalBusinessId ?? this.personalBusinessId,
      systemCurrency: systemCurrency ?? this.systemCurrency,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
