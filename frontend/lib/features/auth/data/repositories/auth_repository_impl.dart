import 'package:dartz/dartz.dart';
import 'package:frontend/core/error/exceptions.dart';
import 'package:frontend/core/error/failures.dart';
import 'package:frontend/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:frontend/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:frontend/features/auth/domain/entities/user.dart';
import 'package:frontend/features/auth/domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final AuthLocalDataSource _localDataSource;

  AuthRepositoryImpl(this._remoteDataSource, this._localDataSource);

  @override
  Future<Either<Failure, User>> signUp({
    required String email,
    required String password,
    required String fullName,
    String? personalBusinessId,
    required String systemCurrency,
  }) async {
    try {
      final response = await _remoteDataSource.signUp(
        email: email,
        password: password,
        fullName: fullName,
        personalBusinessId: personalBusinessId,
        systemCurrency: systemCurrency,
      );
      await _localDataSource.cacheToken(response.accessToken);
      await _localDataSource.cacheUser(response.user);
      return Right(response.user.toEntity());
    } on UnauthorizedException catch (e) {
      return Left(AuthFailure(message: e.message));
    } on ValidationException catch (e) {
      return Left(ValidationFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on TimeoutException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on AppException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(UnknownFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, User>> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _remoteDataSource.signIn(
        email: email,
        password: password,
      );
      await _localDataSource.cacheToken(response.accessToken);
      await _localDataSource.cacheUser(response.user);
      return Right(response.user.toEntity());
    } on UnauthorizedException catch (e) {
      return Left(AuthFailure(message: e.message));
    } on ValidationException catch (e) {
      return Left(ValidationFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on TimeoutException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on AppException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(UnknownFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> signOut() async {
    try {
      await _remoteDataSource.signOut();
      await _localDataSource.clearCache();
      return const Right(null);
    } catch (e) {
      // Still clear local cache even if remote fails
      await _localDataSource.clearCache();
      return const Right(null);
    }
  }

  @override
  Future<Either<Failure, User?>> getCurrentUser() async {
    try {
      final cachedUser = await _localDataSource.getCachedUser();
      if (cachedUser != null) {
        return Right(cachedUser.toEntity());
      }
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure(message: e.toString()));
    }
  }

  @override
  Future<bool> isAuthenticated() async {
    final token = await _localDataSource.getToken();
    return token != null;
  }
}
