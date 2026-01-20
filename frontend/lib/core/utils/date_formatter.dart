import 'package:intl/intl.dart';

class DateFormatter {
  /// Default format - same as formatMedium
  static String format(DateTime date) {
    return DateFormat('MMM dd, yyyy').format(date);
  }

  /// Format date as 'MMM dd, yyyy' (e.g., 'Jan 15, 2024')
  static String formatMedium(DateTime date) {
    return DateFormat('MMM dd, yyyy').format(date);
  }

  /// Format date as 'MMMM dd, yyyy' (e.g., 'January 15, 2024')
  static String formatLong(DateTime date) {
    return DateFormat('MMMM dd, yyyy').format(date);
  }

  /// Format date as 'MM/dd/yyyy' (e.g., '01/15/2024')
  static String formatShort(DateTime date) {
    return DateFormat('MM/dd/yyyy').format(date);
  }

  /// Format date as 'yyyy-MM-dd' (ISO format)
  static String formatIso(DateTime date) {
    return DateFormat('yyyy-MM-dd').format(date);
  }

  /// Format date for month grouping (e.g., 'January 2024')
  static String formatMonthYear(DateTime date) {
    return DateFormat('MMMM yyyy').format(date);
  }

  /// Format date for chart labels (e.g., 'Jan 24')
  static String formatChartLabel(DateTime date) {
    return DateFormat('MMM yy').format(date);
  }

  /// Format relative time (e.g., 'Today', 'Yesterday', '2 days ago')
  static String formatRelative(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final dateOnly = DateTime(date.year, date.month, date.day);
    final difference = today.difference(dateOnly).inDays;

    if (difference == 0) {
      return 'Today';
    } else if (difference == 1) {
      return 'Yesterday';
    } else if (difference < 7) {
      return '$difference days ago';
    } else if (difference < 30) {
      final weeks = (difference / 7).floor();
      return weeks == 1 ? '1 week ago' : '$weeks weeks ago';
    } else if (difference < 365) {
      final months = (difference / 30).floor();
      return months == 1 ? '1 month ago' : '$months months ago';
    } else {
      final years = (difference / 365).floor();
      return years == 1 ? '1 year ago' : '$years years ago';
    }
  }

  /// Parse ISO date string to DateTime
  static DateTime? parseIso(String? dateString) {
    if (dateString == null || dateString.isEmpty) {
      return null;
    }
    try {
      return DateTime.parse(dateString);
    } catch (e) {
      return null;
    }
  }

  /// Check if date is today
  static bool isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year &&
           date.month == now.month &&
           date.day == now.day;
  }

  /// Check if date is in current month
  static bool isCurrentMonth(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month;
  }

  /// Get month name from month number (1-12)
  static String getMonthName(int month) {
    final date = DateTime(2024, month, 1);
    return DateFormat('MMMM').format(date);
  }

  /// Get short month name from month number (1-12)
  static String getShortMonthName(int month) {
    final date = DateTime(2024, month, 1);
    return DateFormat('MMM').format(date);
  }
}
