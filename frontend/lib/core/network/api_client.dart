import 'package:dio/dio.dart';
import 'package:frontend/core/constants/api_constants.dart';
import 'package:frontend/core/error/exceptions.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient({Dio? dio}) {
    _dio = dio ?? Dio();
    _configureDio();
  }

  Dio get dio => _dio;

  void _configureDio() {
    _dio.options = BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: Duration(milliseconds: ApiConstants.connectTimeout),
      receiveTimeout: Duration(milliseconds: ApiConstants.receiveTimeout),
      sendTimeout: Duration(milliseconds: ApiConstants.uploadTimeout),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      validateStatus: (status) {
        // Accept all status codes to handle them manually
        return status != null && status < 500;
      },
    );

    // Add interceptors
    _dio.interceptors.add(
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        error: true,
        logPrint: (obj) {
          // Use print for now, can be replaced with proper logging
          print(obj);
        },
      ),
    );
  }

  /// GET request
  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
        options: options,
      );
      return _handleResponse(response);
    } on DioException catch (e) {
      throw _handleDioException(e);
    }
  }

  /// POST request
  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return _handleResponse(response);
    } on DioException catch (e) {
      throw _handleDioException(e);
    }
  }

  /// PUT request
  Future<Response> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.put(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return _handleResponse(response);
    } on DioException catch (e) {
      throw _handleDioException(e);
    }
  }

  /// PATCH request
  Future<Response> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.patch(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return _handleResponse(response);
    } on DioException catch (e) {
      throw _handleDioException(e);
    }
  }

  /// DELETE request
  Future<Response> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.delete(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return _handleResponse(response);
    } on DioException catch (e) {
      throw _handleDioException(e);
    }
  }

  /// Upload file with multipart/form-data
  Future<Response> uploadFile(
    String path,
    String filePath,
    String fileName, {
    String fileKey = 'file',
    Map<String, dynamic>? data,
    ProgressCallback? onSendProgress,
  }) async {
    try {
      final formData = FormData.fromMap({
        fileKey: await MultipartFile.fromFile(filePath, filename: fileName),
        if (data != null) ...data,
      });

      final response = await _dio.post(
        path,
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
        ),
        onSendProgress: onSendProgress,
      );

      return _handleResponse(response);
    } on DioException catch (e) {
      throw _handleDioException(e);
    }
  }

  /// Download file
  Future<void> download(String path) async {
    try {
      final response = await _dio.get(
        path,
        options: Options(
          responseType: ResponseType.bytes,
        ),
      );
      // For now, just return - actual file saving would be platform-specific
      _handleResponse(response);
    } on DioException catch (e) {
      throw _handleDioException(e);
    }
  }

  /// Handle response and check for errors
  Response _handleResponse(Response response) {
    final statusCode = response.statusCode ?? 0;

    if (statusCode >= 200 && statusCode < 300) {
      return response;
    }

    // Extract error message from response
    String errorMessage = 'An error occurred';
    if (response.data is Map<String, dynamic>) {
      errorMessage = response.data['message'] ??
                     response.data['error'] ??
                     errorMessage;
    }

    // Handle specific status codes
    switch (statusCode) {
      case 400:
        throw ValidationException(message: errorMessage);
      case 401:
        throw UnauthorizedException(message: errorMessage);
      case 403:
        throw ForbiddenException(message: errorMessage);
      case 404:
        throw NotFoundException(message: errorMessage);
      case 422:
        throw ValidationException(message: errorMessage);
      default:
        throw ServerException(message: errorMessage);
    }
  }

  /// Handle Dio exceptions
  AppException _handleDioException(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return TimeoutException();

      case DioExceptionType.connectionError:
        return NetworkException();

      case DioExceptionType.badResponse:
        final statusCode = error.response?.statusCode ?? 0;
        final errorMessage = error.response?.data?['message'] ??
                            error.response?.data?['error'] ??
                            'Server error';

        switch (statusCode) {
          case 401:
            return UnauthorizedException(message: errorMessage);
          case 403:
            return ForbiddenException(message: errorMessage);
          case 404:
            return NotFoundException(message: errorMessage);
          case 422:
            return ValidationException(message: errorMessage);
          default:
            return ServerException(message: errorMessage);
        }

      case DioExceptionType.cancel:
        return AppException(message: 'Request cancelled');

      default:
        return AppException(message: error.message ?? 'Unknown error');
    }
  }
}
