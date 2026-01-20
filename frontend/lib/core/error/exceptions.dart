/// Base exception class
class AppException implements Exception {
  final String message;
  final String? code;

  AppException({
    required this.message,
    this.code,
  });

  @override
  String toString() => 'AppException: $message${code != null ? ' (code: $code)' : ''}';
}

/// Server exception (5xx errors)
class ServerException extends AppException {
  ServerException({
    required super.message,
    super.code = 'SERVER_ERROR',
  });
}

/// Network/Connection exception
class NetworkException extends AppException {
  NetworkException({
    super.message = 'Network connection failed',
    super.code = 'NETWORK_ERROR',
  });
}

/// Authentication exception
class AuthException extends AppException {
  AuthException({
    required super.message,
    super.code = 'AUTH_ERROR',
  });
}

/// Validation exception
class ValidationException extends AppException {
  ValidationException({
    required super.message,
    super.code = 'VALIDATION_ERROR',
  });
}

/// Cache exception
class CacheException extends AppException {
  CacheException({
    super.message = 'Cache operation failed',
    super.code = 'CACHE_ERROR',
  });
}

/// Not found exception (404)
class NotFoundException extends AppException {
  NotFoundException({
    super.message = 'Resource not found',
    super.code = 'NOT_FOUND',
  });
}

/// Unauthorized exception (401)
class UnauthorizedException extends AppException {
  UnauthorizedException({
    super.message = 'Unauthorized access',
    super.code = 'UNAUTHORIZED',
  });
}

/// Forbidden exception (403)
class ForbiddenException extends AppException {
  ForbiddenException({
    super.message = 'Access forbidden',
    super.code = 'FORBIDDEN',
  });
}

/// File exception
class FileException extends AppException {
  FileException({
    required super.message,
    super.code = 'FILE_ERROR',
  });
}

/// Timeout exception
class TimeoutException extends AppException {
  TimeoutException({
    super.message = 'Request timeout',
    super.code = 'TIMEOUT',
  });
}
