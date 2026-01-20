import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:frontend/core/theme/app_theme.dart';
import 'package:frontend/core/utils/responsive.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppTheme.primaryColor.withValues(alpha: 0.1),
              AppTheme.secondaryColor.withValues(alpha: 0.05),
            ],
          ),
        ),
        child: SafeArea(
          child: ResponsivePageContainer(
            child: Column(
              children: [
                const Spacer(flex: 2),
                // Logo and Title
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                    ),
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primaryColor.withValues(alpha: 0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.receipt_long_rounded,
                    size: 60,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 32),
                Text(
                  'InvoiceMe',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        letterSpacing: -1,
                      ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Smart invoice management\nwith AI-powered insights',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        height: 1.5,
                      ),
                ),
                const Spacer(flex: 3),
                // Buttons - responsive width
                ResponsiveButton(
                  button: ElevatedButton(
                    onPressed: () => context.push('/login'),
                    child: const Text('Login'),
                  ),
                ),
                const SizedBox(height: 16),
                ResponsiveButton(
                  button: OutlinedButton(
                    onPressed: () => context.push('/signup'),
                    child: const Text('Create Account'),
                  ),
                ),
                const SizedBox(height: 48),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
