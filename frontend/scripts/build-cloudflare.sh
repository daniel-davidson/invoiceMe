#!/bin/bash
# ==========================================
# Cloudflare Pages Build Script
# ==========================================
# This script installs Flutter and builds the web app
# for deployment on Cloudflare Pages

set -e # Exit on error

echo "=========================================="
echo "InvoiceMe Flutter Web Build for Cloudflare"
echo "=========================================="

# Flutter version to install
FLUTTER_VERSION="3.24.5"
FLUTTER_CHANNEL="stable"

# Check if Flutter is already installed
if command -v flutter &> /dev/null; then
    echo "✅ Flutter already installed: $(flutter --version | head -n 1)"
else
    echo "📦 Installing Flutter ${FLUTTER_VERSION}..."
    
    # Download Flutter
    wget -q -O flutter.tar.xz \
        "https://storage.googleapis.com/flutter_infra_release/releases/${FLUTTER_CHANNEL}/linux/flutter_linux_${FLUTTER_VERSION}-${FLUTTER_CHANNEL}.tar.xz"
    
    # Extract
    tar xf flutter.tar.xz
    
    # Add to PATH
    export PATH="$PATH:$PWD/flutter/bin"
    
    # Verify installation
    flutter --version
    
    echo "✅ Flutter installed successfully"
fi

# Ensure we're in the frontend directory
cd "$(dirname "$0")/.."
echo "📂 Working directory: $(pwd)"

# Get API URL from environment (required)
if [ -z "$API_URL" ]; then
    echo "❌ ERROR: API_URL environment variable is required"
    echo "   Set it in Cloudflare Pages dashboard: Settings → Environment variables"
    exit 1
fi

echo "🔧 Backend API URL: $API_URL"

# Configure Flutter for web
echo "🔧 Configuring Flutter..."
flutter config --enable-web --no-analytics

# Get dependencies
echo "📦 Installing dependencies..."
flutter pub get

# Build web app
echo "🏗️  Building Flutter web app..."
flutter build web \
    --release \
    --dart-define=API_URL="$API_URL" \
    --base-href="/" \
    --web-renderer canvaskit

echo "✅ Build complete!"
echo "📦 Output directory: build/web"
echo ""
echo "Files generated:"
ls -lh build/web | head -n 10

echo ""
echo "=========================================="
echo "✅ Build successful!"
echo "=========================================="
