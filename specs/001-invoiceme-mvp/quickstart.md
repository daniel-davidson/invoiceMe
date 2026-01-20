# Quickstart: InvoiceMe MVP

**Branch**: `001-invoiceme-mvp` | **Date**: 2026-01-18

This guide provides step-by-step instructions for setting up and running InvoiceMe locally.

---

## Prerequisites

### Required Software

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| Node.js | 18+ | Backend runtime | [nodejs.org](https://nodejs.org/) |
| pnpm | 8+ | Package manager | `npm install -g pnpm` |
| Flutter | 3.x | Frontend framework | [flutter.dev](https://flutter.dev/docs/get-started/install) |
| PostgreSQL | 14+ | Database | [postgresql.org](https://www.postgresql.org/download/) or use Supabase |
| Tesseract | 4+ | OCR engine | See below |
| Ollama | latest | Local LLM | [ollama.ai](https://ollama.ai/) |

### Tesseract Installation

**macOS:**
```bash
brew install tesseract tesseract-lang
```

**Ubuntu/Debian:**
```bash
sudo apt-get install tesseract-ocr tesseract-ocr-heb tesseract-ocr-eng
```

**Windows:**
Download from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki)

**Verify installation:**
```bash
tesseract --version
tesseract --list-langs  # Should include 'heb' and 'eng'
```

### Ollama Setup

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model (recommended: mistral for extraction)
ollama pull mistral:7b

# Verify Ollama is running
curl http://localhost:11434/api/tags
```

---

## Project Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd invoiceMe

# Install backend dependencies
cd backend
pnpm install

# Install frontend dependencies
cd ../frontend
flutter pub get
```

### 2. Environment Configuration

**Backend (.env file):**

```bash
# backend/.env

# Database (choose one)
# Option A: Local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/invoiceme"

# Option B: Supabase (for shareable demo)
# DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# Supabase Auth
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_JWT_SECRET="your-jwt-secret"

# Ollama (local LLM)
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="mistral:7b"

# Exchange Rates API
EXCHANGE_RATES_API_KEY="your-api-key"  # Get free key at exchangeratesapi.io
EXCHANGE_RATES_CACHE_TTL_HOURS=12

# File Storage
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB=10

# Server
PORT=3000
NODE_ENV=development
```

**Frontend (lib/core/constants/api_constants.dart):**

```dart
class ApiConstants {
  static const String baseUrl = 'http://localhost:3000';
  static const String supabaseUrl = 'https://xxx.supabase.co';
  static const String supabaseAnonKey = 'your-anon-key';
}
```

### 3. Database Setup

**Option A: Local PostgreSQL**

```bash
# Create database
createdb invoiceme

# Run migrations
cd backend
npx prisma migrate dev

# Seed demo data (optional)
npx prisma db seed
```

**Option B: Supabase**

1. Create project at [supabase.com](https://supabase.com)
2. Copy connection string to `.env`
3. Run migrations:
```bash
cd backend
npx prisma migrate deploy
```

### 4. Start Services

**Terminal 1 - Ollama (if not running as service):**
```bash
ollama serve
```

**Terminal 2 - Backend:**
```bash
cd backend
pnpm run start:dev
# Server runs at http://localhost:3000
```

**Terminal 3 - Frontend:**
```bash
cd frontend
flutter run -d chrome
# App runs at http://localhost:xxxxx
```

---

## Verification Checklist

Run these checks to verify setup:

### Backend Health

```bash
# Check API is running
curl http://localhost:3000/health
# Expected: {"status":"ok"}

# Check database connection
curl http://localhost:3000/health/db
# Expected: {"status":"connected"}
```

### Ollama Connection

```bash
# Test Ollama endpoint
curl http://localhost:11434/api/tags
# Expected: {"models":[...]}

# Test extraction (backend internal)
curl http://localhost:3000/health/ollama
# Expected: {"status":"connected","model":"mistral:7b"}
```

### Tesseract

```bash
# Test OCR
echo "Hello World" | tesseract stdin stdout
# Expected: "Hello World"
```

---

## Test Scenarios

### Scenario 1: User Registration and Login

**Steps:**
1. Open app in browser
2. Click "Sign Up"
3. Fill form:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Password: "TestPass123!"
   - System Currency: "USD"
4. Submit

**Expected:**
- Account created
- Redirected to Home screen
- Empty state shown with CTAs

**Verification:**
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","fullName":"Test User","systemCurrency":"USD"}'
```

---

### Scenario 2: Invoice Upload (Happy Path)

**Prerequisites:**
- User logged in
- Sample invoice file ready (PDF or image)

**Steps:**
1. Click upload button (FAB)
2. Select invoice file
3. Wait for processing

**Expected:**
- Loading indicator during processing
- Success snackbar
- New vendor created (if not existing)
- Invoice appears under vendor

**Test Files:**
- `test/fixtures/invoice_english.pdf` - English invoice
- `test/fixtures/invoice_hebrew.pdf` - Hebrew invoice
- `test/fixtures/invoice_image.jpg` - Image invoice

---

### Scenario 3: Vendor Management

**Steps:**
1. Click "Add Business"
2. Enter vendor name: "Acme Corp"
3. Save
4. Edit vendor (change name to "Acme Corporation")
5. Drag vendor to reorder
6. Delete vendor

**Expected:**
- Vendor created and visible
- Name update persists
- Order change persists after refresh
- Delete confirmation shows invoice count
- Vendor and invoices deleted

---

### Scenario 4: Analytics Dashboard

**Prerequisites:**
- At least 5 invoices across 2+ vendors
- Some invoices from previous month

**Steps:**
1. Navigate to vendor analytics
2. View KPI cards
3. Set monthly limit
4. View charts
5. Export CSV

**Expected:**
- KPIs show correct values
- Limit updates and utilization shows
- Pie chart shows top vendors
- Line chart shows monthly trend
- CSV downloads with correct data

---

### Scenario 5: AI Insights Generation

**Prerequisites:**
- At least 10 invoices
- Some recurring charges (same vendor/amount)

**Steps:**
1. Navigate to insights
2. Click "Generate Insights"
3. View generated insights

**Expected:**
- Monthly narrative generated
- Recurring charges detected
- Any anomalies flagged
- All totals match SQL-computed values

---

## Sample Data Seed

The seed script creates:

| Entity | Count | Description |
|--------|-------|-------------|
| Users | 1 | Demo user (demo@example.com / Demo123!) |
| Vendors | 5 | AWS, Google Cloud, Spotify, Office Supplies, Utilities |
| Invoices | 20 | Distributed across vendors and months |

**Run seed:**
```bash
cd backend
npx prisma db seed
```

**Reset database:**
```bash
cd backend
npx prisma migrate reset
```

---

## Common Issues

### Issue: Tesseract not found

**Error:** `Error: spawn tesseract ENOENT`

**Solution:**
- Ensure Tesseract is installed and in PATH
- On Windows, add Tesseract to system PATH

### Issue: Ollama connection refused

**Error:** `ECONNREFUSED 127.0.0.1:11434`

**Solution:**
```bash
# Start Ollama service
ollama serve

# Or check if already running
curl http://localhost:11434/api/tags
```

### Issue: Database connection failed

**Error:** `P1001: Can't reach database server`

**Solution:**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- For Supabase: check connection pooler settings

### Issue: Hebrew OCR poor quality

**Solution:**
- Ensure `tesseract-ocr-heb` language pack installed
- Check image quality (min 300 DPI recommended)
- Try preprocessing image (contrast, deskew)

---

## Development Commands

```bash
# Backend
pnpm run start:dev      # Development with hot reload
pnpm run test           # Run tests
pnpm run lint           # Lint code
pnpm run build          # Production build

# Frontend
flutter run -d chrome   # Run in Chrome
flutter test            # Run tests
flutter analyze         # Analyze code
flutter build web       # Production build

# Database
npx prisma studio       # Open Prisma Studio (DB GUI)
npx prisma generate     # Regenerate Prisma Client
npx prisma migrate dev  # Create and apply migration
```

---

## API Testing with cURL

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Demo123!"}' | jq -r '.accessToken')

# List vendors
curl http://localhost:3000/vendors \
  -H "Authorization: Bearer $TOKEN"

# Upload invoice
curl -X POST http://localhost:3000/invoices/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test/fixtures/invoice_english.pdf"

# Get analytics
curl http://localhost:3000/analytics/overall \
  -H "Authorization: Bearer $TOKEN"
```
