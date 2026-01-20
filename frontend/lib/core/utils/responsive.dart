import 'package:flutter/material.dart';

/// Responsive breakpoints for InvoiceMe
/// Used to adapt layout based on screen width without changing functionality
class Responsive {
  // Breakpoint constants
  static const double mobileMaxWidth = 600;
  static const double tabletMaxWidth = 1024;

  // Content max-width constraints for different screen sizes
  static const double mobileContentPadding = 16;
  static const double tabletContentMaxWidth = 720;
  static const double desktopContentMaxWidth = 900;

  // Button max-widths to prevent stretching
  static const double mobileButtonMaxWidth = double.infinity;
  static const double tabletButtonMaxWidth = 480;
  static const double desktopButtonMaxWidth = 520;

  // Dialog/modal widths
  static const double mobileDialogMaxWidth = double.infinity;
  static const double tabletDialogMaxWidth = 520;
  static const double desktopDialogMaxWidth = 600;

  /// Check if current screen is mobile
  static bool isMobile(BuildContext context) {
    return MediaQuery.of(context).size.width < mobileMaxWidth;
  }

  /// Check if current screen is tablet
  static bool isTablet(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    return width >= mobileMaxWidth && width < tabletMaxWidth;
  }

  /// Check if current screen is desktop
  static bool isDesktop(BuildContext context) {
    return MediaQuery.of(context).size.width >= tabletMaxWidth;
  }

  /// Get appropriate content max-width for current screen
  static double getContentMaxWidth(BuildContext context) {
    if (isMobile(context)) {
      return double.infinity; // Full width on mobile
    } else if (isTablet(context)) {
      return tabletContentMaxWidth;
    } else {
      return desktopContentMaxWidth;
    }
  }

  /// Get appropriate button max-width for current screen
  static double getButtonMaxWidth(BuildContext context) {
    if (isMobile(context)) {
      return mobileButtonMaxWidth;
    } else if (isTablet(context)) {
      return tabletButtonMaxWidth;
    } else {
      return desktopButtonMaxWidth;
    }
  }

  /// Get appropriate dialog max-width for current screen
  static double getDialogMaxWidth(BuildContext context) {
    if (isMobile(context)) {
      return mobileDialogMaxWidth;
    } else if (isTablet(context)) {
      return tabletDialogMaxWidth;
    } else {
      return desktopDialogMaxWidth;
    }
  }

  /// Get horizontal padding based on screen size
  static double getHorizontalPadding(BuildContext context) {
    if (isMobile(context)) {
      return mobileContentPadding;
    } else if (isTablet(context)) {
      return 24;
    } else {
      return 32;
    }
  }
}

/// Responsive page container that constrains content width on larger screens
/// while maintaining full-width on mobile. Does NOT change any functionality.
class ResponsivePageContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final bool centerContent;

  const ResponsivePageContainer({
    super.key,
    required this.child,
    this.padding,
    this.centerContent = true,
  });

  @override
  Widget build(BuildContext context) {
    final maxWidth = Responsive.getContentMaxWidth(context);
    final horizontalPadding = padding ?? EdgeInsets.all(Responsive.getHorizontalPadding(context));

    if (Responsive.isMobile(context)) {
      // Mobile: full-width with padding
      return Padding(
        padding: horizontalPadding,
        child: child,
      );
    }

    // Tablet/Desktop: constrained width, centered
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Padding(
          padding: horizontalPadding,
          child: child,
        ),
      ),
    );
  }
}

/// Responsive button wrapper that prevents buttons from stretching infinitely
/// on larger screens while maintaining full-width on mobile
class ResponsiveButton extends StatelessWidget {
  final Widget button;
  final bool fullWidthOnMobile;

  const ResponsiveButton({
    super.key,
    required this.button,
    this.fullWidthOnMobile = true,
  });

  @override
  Widget build(BuildContext context) {
    if (Responsive.isMobile(context) && fullWidthOnMobile) {
      return SizedBox(
        width: double.infinity,
        child: button,
      );
    }

    final maxWidth = Responsive.getButtonMaxWidth(context);
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: SizedBox(
          width: double.infinity,
          child: button,
        ),
      ),
    );
  }
}

/// Responsive dialog wrapper for consistent sizing across screen sizes
class ResponsiveDialog extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;

  const ResponsiveDialog({
    super.key,
    required this.child,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final maxWidth = Responsive.getDialogMaxWidth(context);

    return Dialog(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Padding(
          padding: padding ?? const EdgeInsets.all(24),
          child: child,
        ),
      ),
    );
  }
}
