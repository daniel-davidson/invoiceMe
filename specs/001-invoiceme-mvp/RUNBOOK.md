# InvoiceMe - Local Setup Runbook

Complete step-by-step guide to run InvoiceMe locally.

---

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| Node.js | 18+ | https://nodejs.org/ or `nvm install 18` |
| Flutter | 3.19+ | https://flutter.dev/docs/get-started/install |
| PostgreSQL | 14+ | https://www.postgresql.org/download/ or Homebrew |
| Tesseract OCR | 5+ | `brew install tesseract` (macOS) |
| Ollama | Latest | https://ollama.ai/download |

### Verify Installation

```bash
# Check versions
node --version      # Should be 18+
npm --version       # Should be 9+
flutter --version   # Should be 3.19+
psql --version      # Should be 14+
tesseract --version # Should be 5+
ollama --version    # Should show version
```

---

## Step 1: Clone Repository

```bash
git clone <repository-url>
cd invoiceMe
```

---

## Step 2: Database Setup

### Option A: Local PostgreSQL

```bash
# Create database
createdb invoiceme

# Or using psql
psql -U postgres
CREATE DATABASE invoiceme;
\q
```

### Option B: Supabase (Cloud)

1. Go to https://app.supabase.com
2. Create new project
3. Copy connection string from Settings > Database

---

## Step 3: Supabase Auth Setup

1. Go to https://app.supabase.com/project/[project-id]/settings/api
2. Copy these values:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`
   - **JWT Secret** (under JWT Settings) → `JWT_SECRET`

3. Enable Email Auth:
   - Go to Authentication > Providers
   - Enable "Email" provider
   - (Optional) Disable "Confirm email" for faster testing

---

## Step 4: Ollama Setup

```bash
# Start Ollama service
ollama serve

# Pull required model (in another terminal)
ollama pull llama3.2:3b

# Verify model is available
ollama list
```

Keep Ollama running in background.

---

## Step 5: Tesseract Setup

### macOS (Homebrew)

```bash
brew install tesseract
brew install tesseract-lang  # For Hebrew support
```

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install tesseract-ocr tesseract-ocr-heb tesseract-ocr-eng
```

### Verify

```bash
tesseract --list-langs
# Should include: eng, heb
```

---

## Step 6: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your values (see below)
nano .env  # or use any editor
```

### Required .env Values

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/invoiceme"
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
JWT_SECRET="your-jwt-secret"
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2:3b"
FX_API_KEY="your-exchangeratesapi-key"
```

### Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed demo data
npx prisma db seed
```

### Start Backend

```bash
npm run start:dev

# Verify: http://localhost:3000/api should return { status: 'ok' }
```

---

## Step 7: Frontend Setup

```bash
cd frontend

# Get dependencies
flutter pub get

# Copy API constants
cp lib/core/constants/api_constants.dart.example lib/core/constants/api_constants.dart

# Edit constants with your values
nano lib/core/constants/api_constants.dart
```

### Required Constants

```dart
static const String baseUrl = 'http://localhost:3000';
static const String supabaseUrl = 'https://xxx.supabase.co';
static const String supabaseAnonKey = 'eyJ...';
```

### Run Frontend

```bash
# Web
flutter run -d chrome

# iOS Simulator
flutter run -d ios

# Android Emulator
flutter run -d android
```

---

## Step 8: Verify Setup

### Smoke Test Checklist

1. ✅ Open app → See Welcome screen
2. ✅ Tap "Sign Up" → Create account
3. ✅ Log in with new account
4. ✅ See Home screen (empty state)
5. ✅ Tap "Upload Invoice" → Select a PDF/image
6. ✅ Wait for processing → See success message
7. ✅ New vendor appears on Home screen
8. ✅ Tap vendor → See analytics screen
9. ✅ Go to Settings → Change currency
10. ✅ Log out → Return to Welcome screen

---

## Troubleshooting

### Backend Issues

#### "Cannot connect to database"
```bash
# Check PostgreSQL is running
pg_isready

# If not running:
brew services start postgresql  # macOS
sudo systemctl start postgresql # Linux
```

#### "ECONNREFUSED on port 3000"
```bash
# Check if port is in use
lsof -i :3000

# Kill existing process
kill -9 <PID>
```

#### "Tesseract not found"
```bash
# Find Tesseract path
which tesseract

# Add to .env
TESSERACT_PATH="/opt/homebrew/bin/tesseract"
```

#### "Ollama connection refused"
```bash
# Ensure Ollama is running
ollama serve

# Check Ollama status
curl http://localhost:11434/api/tags
```

### Frontend Issues

#### "Connection refused to localhost:3000"
- Ensure backend is running
- If using Android emulator, use `10.0.2.2` instead of `localhost`
- If using iOS simulator, `localhost` should work

#### "CORS error"
Add your Flutter origin to backend CORS:
```env
CORS_ORIGINS="http://localhost:3000,http://localhost:8080,http://localhost:*"
```

#### "Certificate error on Android"
For development, the app uses HTTP. If you switch to HTTPS:
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application android:usesCleartextTraffic="true">
```

### Currency API Issues

#### "FX API rate limit exceeded"
- Free tier: 250 requests/month, EUR base only
- Consider upgrading or using mock data for development

#### "Currency conversion failed"
- Check `FX_API_KEY` is valid
- Ensure `FX_API_URL` is correct
- Check API status: https://exchangeratesapi.io/

---

## Running Tests

### Backend Tests

```bash
cd backend

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Frontend Tests

```bash
cd frontend

# Widget tests
flutter test

# Integration tests
flutter test integration_test/
```

---

## Quick Reference

### Start Everything

```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: Backend
cd backend && npm run start:dev

# Terminal 3: Frontend
cd frontend && flutter run -d chrome
```

### Reset Database

```bash
cd backend
npx prisma migrate reset
npx prisma db seed
```

### Update Dependencies

```bash
# Backend
cd backend && npm update

# Frontend
cd frontend && flutter pub upgrade
```

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| DATABASE_URL | ✅ | PostgreSQL connection | `postgresql://...` |
| SUPABASE_URL | ✅ | Supabase project URL | `https://xxx.supabase.co` |
| SUPABASE_ANON_KEY | ✅ | Supabase public key | `eyJ...` |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | Supabase secret key | `eyJ...` |
| JWT_SECRET | ✅ | Supabase JWT secret | `your-secret` |
| OLLAMA_URL | ✅ | Ollama API URL | `http://localhost:11434` |
| OLLAMA_MODEL | ✅ | LLM model name | `llama3.2:3b` |
| FX_API_KEY | ✅ | Exchange rates API key | `abc123...` |
| STORAGE_DIR | ❌ | File upload directory | `./uploads` |
| PORT | ❌ | Backend port | `3000` |

---

## Support

- Check specs: `/specs/001-invoiceme-mvp/`
- API contracts: `/specs/001-invoiceme-mvp/contracts/`
- Data model: `/specs/001-invoiceme-mvp/data-model.md`
