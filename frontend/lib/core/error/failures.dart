import 'package:equatable/equatable.dart';

/// Base class for all failures in the application
abstract class Failure extends Equatable {
  final String message;
  final String? code;

  const Failure({
    required this.message,
    this.code,
  });

  @override
  List<Object?> get props => [message, code];
}

/// Server-related failures
class ServerFailure extends Failure {
  const ServerFailure([String message = 'Server error occurred'])
      : super(message: message);
}

/// Network/Connection failures
class NetworkFailure extends Failure {
  const NetworkFailure([String message = 'Network connection failed'])
      : super(message: message);
}

/// Authentication failures
class AuthFailure extends Failure {
  const AuthFailure({
    required super.message,
    super.code = 'AUTH_ERROR',
  });
}

/// Validation failures
class ValidationFailure extends Failure {
  const ValidationFailure({
    required super.message,
    super.code = 'VALIDATION_ERROR',
  });
}

/// Cache-related failures
class CacheFailure extends Failure {
  const CacheFailure([String message = 'Cache error occurred'])
      : super(message: message);
}

/// Not found failures (404)
class NotFoundFailure extends Failure {
  const NotFoundFailure({
    super.message = 'The requested resource was not found.',
    super.code = 'NOT_FOUND',
  });
}

/// Unauthorized failures (401)
class UnauthorizedFailure extends Failure {
  const UnauthorizedFailure({
    super.message = 'You are not authorized to perform this action.',
    super.code = 'UNAUTHORIZED',
  });
}

/// Forbidden failures (403)
class ForbiddenFailure extends Failure {
  const ForbiddenFailure({
    super.message = 'Access to this resource is forbidden.',
    super.code = 'FORBIDDEN',
  });
}

/// File-related failures
class FileFailure extends Failure {
  const FileFailure({
    required super.message,
    super.code = 'FILE_ERROR',
  });
}

/// Unknown/Unexpected failures
class UnknownFailure extends Failure {
  const UnknownFailure([String message = 'An unexpected error occurred'])
      : super(message: message);
}
