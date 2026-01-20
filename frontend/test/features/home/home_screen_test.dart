import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/features/home/presentation/screens/home_screen.dart';
import 'package:frontend/features/home/presentation/widgets/empty_state.dart';
import 'package:frontend/features/home/presentation/widgets/vendor_card.dart';
import 'package:frontend/features/home/presentation/providers/home_provider.dart';

void main() {
  group('HomeScreen', () {
    testWidgets('should display loading indicator initially', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: HomeScreen(),
          ),
        ),
      );

      // Initially shows loading
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('should have upload FAB', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: HomeScreen(),
          ),
        ),
      );

      await tester.pump();

      // Should have floating action button
      expect(find.byType(FloatingActionButton), findsOneWidget);
    });

    testWidgets('should display app bar with title', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: HomeScreen(),
          ),
        ),
      );

      await tester.pump();

      // Should have app bar
      expect(find.byType(AppBar), findsOneWidget);
    });
  });

  group('EmptyState', () {
    testWidgets('should display message and action buttons', (tester) async {
      bool addBusinessPressed = false;
      bool uploadPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EmptyState(
              onAddBusiness: () => addBusinessPressed = true,
              onUploadInvoice: () => uploadPressed = true,
            ),
          ),
        ),
      );

      // Should have instruction text
      expect(find.text('No invoices yet'), findsOneWidget);

      // Should have action buttons
      expect(find.text('Add Business'), findsOneWidget);
      expect(find.text('Upload Invoice'), findsOneWidget);

      // Test button interactions
      await tester.tap(find.text('Add Business'));
      expect(addBusinessPressed, isTrue);

      await tester.tap(find.text('Upload Invoice'));
      expect(uploadPressed, isTrue);
    });
  });

  group('VendorCard', () {
    testWidgets('should display vendor name', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: VendorCard(
              vendor: Vendor(
                id: '1',
                name: 'Google',
                invoiceCount: 5,
              ),
              onTap: () {},
              onEdit: () {},
            ),
          ),
        ),
      );

      // Should display vendor name
      expect(find.text('Google'), findsOneWidget);

      // Should display invoice count
      expect(find.text('5 invoices'), findsOneWidget);
    });

    testWidgets('should be tappable', (tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: VendorCard(
              vendor: Vendor(
                id: '2',
                name: 'Test Vendor',
                invoiceCount: 3,
              ),
              onTap: () => tapped = true,
              onEdit: () {},
            ),
          ),
        ),
      );

      await tester.tap(find.byType(InkWell));
      expect(tapped, isTrue);
    });
  });
}
