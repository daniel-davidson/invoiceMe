import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/features/auth/data/models/user_model.dart';

void main() {
  group('UserModel', () {
    test('fromJson should parse user correctly', () {
      final json = {
        'id': 'user-123',
        'email': 'test@example.com',
        'fullName': 'Test User',
        'systemCurrency': 'USD',
        'createdAt': '2024-01-01T00:00:00.000Z',
      };

      final user = UserModel.fromJson(json);

      expect(user.id, 'user-123');
      expect(user.email, 'test@example.com');
      expect(user.fullName, 'Test User');
      expect(user.systemCurrency, 'USD');
    });

    test('toJson should serialize user correctly', () {
      final user = UserModel(
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        systemCurrency: 'USD',
        createdAt: DateTime(2024, 1, 1),
      );

      final json = user.toJson();

      expect(json['id'], 'user-123');
      expect(json['email'], 'test@example.com');
      expect(json['fullName'], 'Test User');
      expect(json['systemCurrency'], 'USD');
    });

    test('should validate email format', () {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];

      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        '',
      ];

      final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

      for (final email in validEmails) {
        expect(emailRegex.hasMatch(email), isTrue, reason: 'Should accept $email');
      }

      for (final email in invalidEmails) {
        expect(emailRegex.hasMatch(email), isFalse, reason: 'Should reject $email');
      }
    });

    test('should validate currency is ISO 4217', () {
      const validCurrencies = ['USD', 'EUR', 'ILS', 'GBP', 'JPY'];
      const invalidCurrencies = ['US', 'DOLLAR', '123', ''];

      final currencyRegex = RegExp(r'^[A-Z]{3}$');

      for (final currency in validCurrencies) {
        expect(currencyRegex.hasMatch(currency), isTrue, reason: 'Should accept $currency');
      }

      for (final currency in invalidCurrencies) {
        expect(currencyRegex.hasMatch(currency), isFalse, reason: 'Should reject $currency');
      }
    });
  });
}
