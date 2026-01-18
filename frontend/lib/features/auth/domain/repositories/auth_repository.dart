import 'package:dartz/dartz.dart';
import 'package:frontend/core/error/failures.dart';
import 'package:frontend/features/auth/domain/entities/user.dart';

abstract class AuthRepository {
  /// Sign up a new user
  Future<Either<Failure, User>> signUp({
    required String email,
    required String password,
    required String fullName,
    String? personalBusinessId,
    required String systemCurrency,
  });

  /// Sign in an existing user
  Future<Either<Failure, User>> signIn({
    required String email,
    required String password,
  });

  /// Sign out the current user
  Future<Either<Failure, void>> signOut();

  /// Get current user from storage
  Future<Either<Failure, User?>> getCurrentUser();

  /// Check if user is authenticated
  Future<bool> isAuthenticated();
}
