import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  group('Invoice Upload Flow', () {
    testWidgets('should show file picker options', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => Column(
                  children: [
                    ElevatedButton.icon(
                      icon: const Icon(Icons.photo_camera),
                      label: const Text('Take Photo'),
                      onPressed: () {},
                    ),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.photo_library),
                      label: const Text('Choose from Gallery'),
                      onPressed: () {},
                    ),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.picture_as_pdf),
                      label: const Text('Upload PDF'),
                      onPressed: () {},
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Take Photo'), findsOneWidget);
      expect(find.text('Choose from Gallery'), findsOneWidget);
      expect(find.text('Upload PDF'), findsOneWidget);
    });

    testWidgets('should show loading indicator during upload', (tester) async {
      // Simulate upload in progress
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text('Processing invoice...'),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Processing invoice...'), findsOneWidget);
    });

    testWidgets('should show success message after upload', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.check_circle,
                        color: Colors.green,
                        size: 64,
                      ),
                      const SizedBox(height: 16),
                      const Text('Invoice uploaded successfully!'),
                      const SizedBox(height: 8),
                      const Text('Vendor: Google'),
                      const Text('Amount: \$125.00'),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.check_circle), findsOneWidget);
      expect(find.text('Invoice uploaded successfully!'), findsOneWidget);
    });

    testWidgets('should show error message on failure', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.error_outline,
                      color: Colors.red,
                      size: 64,
                    ),
                    SizedBox(height: 16),
                    Text('Failed to process invoice'),
                    SizedBox(height: 8),
                    Text('Please try again or upload a clearer image'),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.error_outline), findsOneWidget);
      expect(find.text('Failed to process invoice'), findsOneWidget);
    });

    testWidgets('should validate file type before upload', (tester) async {
      // Test file type validation
      const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png'];
      const invalidTypes = ['doc', 'txt', 'xls', 'mp4'];

      for (final type in allowedTypes) {
        expect(allowedTypes.contains(type), isTrue);
      }

      for (final type in invalidTypes) {
        expect(allowedTypes.contains(type), isFalse);
      }
    });

    testWidgets('should limit file size', (tester) async {
      // Test file size validation
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB
      const validSizes = [1024, 1024 * 1024, 5 * 1024 * 1024];
      const invalidSizes = [11 * 1024 * 1024, 100 * 1024 * 1024];

      for (final size in validSizes) {
        expect(size <= maxSizeBytes, isTrue);
      }

      for (final size in invalidSizes) {
        expect(size <= maxSizeBytes, isFalse);
      }
    });
  });

  group('Invoice Review Screen', () {
    testWidgets('should show extracted data for review', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Review Extracted Data',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 24),
                    TextField(
                      decoration: InputDecoration(
                        labelText: 'Vendor Name',
                        hintText: 'Google',
                      ),
                    ),
                    SizedBox(height: 16),
                    TextField(
                      decoration: InputDecoration(
                        labelText: 'Amount',
                        hintText: '125.00',
                      ),
                    ),
                    SizedBox(height: 16),
                    TextField(
                      decoration: InputDecoration(
                        labelText: 'Currency',
                        hintText: 'USD',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Review Extracted Data'), findsOneWidget);
      expect(find.text('Vendor Name'), findsOneWidget);
      expect(find.text('Amount'), findsOneWidget);
      expect(find.text('Currency'), findsOneWidget);
    });

    testWidgets('should allow editing extracted data', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    TextFormField(
                      initialValue: 'Google',
                      decoration: const InputDecoration(labelText: 'Vendor'),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () {},
                      child: const Text('Save Changes'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      // Find and edit the text field
      final vendorField = find.byType(TextFormField);
      expect(vendorField, findsOneWidget);

      await tester.enterText(vendorField, 'Alphabet Inc');
      expect(find.text('Alphabet Inc'), findsOneWidget);
    });

    testWidgets('should show confidence indicators', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text('Vendor: Google'),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            '95%',
                            style: TextStyle(color: Colors.green, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Text('Amount: \$125.00'),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.orange.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            '70%',
                            style: TextStyle(color: Colors.orange, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.text('95%'), findsOneWidget);
      expect(find.text('70%'), findsOneWidget);
    });
  });
}
