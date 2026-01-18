import 'package:frontend/core/network/api_client.dart';
import 'package:frontend/features/auth/data/models/auth_response.dart';
import 'package:frontend/features/auth/data/models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
    String? personalBusinessId,
    required String systemCurrency,
  });

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  });

  Future<void> signOut();

  Future<UserModel> getCurrentUser();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient _apiClient;

  AuthRemoteDataSourceImpl(this._apiClient);

  @override
  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
    String? personalBusinessId,
    required String systemCurrency,
  }) async {
    final response = await _apiClient.post('/auth/signup', data: {
      'email': email,
      'password': password,
      'fullName': fullName,
      if (personalBusinessId != null) 'personalBusinessId': personalBusinessId,
      'systemCurrency': systemCurrency,
    });
    return AuthResponse.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return AuthResponse.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> signOut() async {
    await _apiClient.post('/auth/logout');
  }

  @override
  Future<UserModel> getCurrentUser() async {
    final response = await _apiClient.get('/users/me');
    return UserModel.fromJson(response.data as Map<String, dynamic>);
  }
}
