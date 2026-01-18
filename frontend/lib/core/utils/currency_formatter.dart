import 'package:intl/intl.dart';

class CurrencyFormatter {
  /// Format amount with currency symbol
  static String format(double amount, String currencyCode) {
    final formatter = NumberFormat.currency(
      symbol: _getCurrencySymbol(currencyCode),
      decimalDigits: 2,
    );
    return formatter.format(amount);
  }

  /// Format amount with currency code
  static String formatWithCode(double amount, String currencyCode) {
    final formatter = NumberFormat.currency(
      symbol: '',
      decimalDigits: 2,
    );
    return '${formatter.format(amount)} $currencyCode';
  }

  /// Format amount without currency symbol
  static String formatAmount(double amount) {
    final formatter = NumberFormat.currency(
      symbol: '',
      decimalDigits: 2,
    );
    return formatter.format(amount).trim();
  }

  /// Get currency symbol from code
  static String _getCurrencySymbol(String currencyCode) {
    switch (currencyCode.toUpperCase()) {
      case 'USD':
        return '\$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'ILS':
        return '₪';
      case 'JPY':
        return '¥';
      case 'CNY':
        return '¥';
      default:
        return currencyCode;
    }
  }

  /// Parse string to double
  static double? parse(String value) {
    try {
      // Remove currency symbols and whitespace
      final cleaned = value
          .replaceAll(RegExp(r'[^\d.,\-]'), '')
          .replaceAll(',', '');
      return double.tryParse(cleaned);
    } catch (e) {
      return null;
    }
  }
}
