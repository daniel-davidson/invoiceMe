# InvoiceMe 📊

> AI-powered invoice management for small businesses with Hebrew + English OCR support

[![Flutter](https://img.shields.io/badge/Flutter-3.10.7+-02569B?logo=flutter)](https://flutter.dev)
[![NestJS](https://img.shields.io/badge/NestJS-11.0+-E0234E?logo=nestjs)](https://nestjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-UNLICENSED-red)](LICENSE)

## 🎯 Overview

InvoiceMe is a modern invoice management system that automatically extracts data from invoices using OCR + LLM technology, tracks spending across multiple vendors, provides real-time currency conversion, and generates AI-powered spending insights.

**Key Features:**
- 📸 **Smart Upload**: PDF/Image invoice upload with automatic OCR (Tesseract) + LLM extraction
- 🌍 **Multi-Currency**: Real-time currency conversion with support for USD, EUR, ILS, and more
- 📊 **Analytics Dashboard**: Visual spending analytics with charts and KPIs
- 🤖 **AI Insights**: Natural language spending insights powered by LLM
- 💼 **Vendor Management**: Track spending by business with monthly budgets
- 📱 **Responsive UI**: Works seamlessly on mobile, tablet, and desktop
- 🔒 **Secure**: Multi-tenant architecture with Supabase Auth

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Flutter 3.10.7+ (Web, iOS, Android)
- Riverpod (State Management)
- GoRouter (Navigation)
- Dio (HTTP Client)
- FL Chart (Data Visualization)

**Backend:**
- NestJS 11.0+ (TypeScript)
- Prisma ORM
- PostgreSQL 15+
- Supabase Auth (JWT)
- Tesseract.js (OCR)
- Groq API (LLM)
- Frankfurter API (Currency Exchange)

**External Services:**
- Supabase (Auth + Database)
- Groq (LLM for extraction)
- Frankfurter (FX rates)
- Tesseract (OCR)

### Project Structure

```
invoiceMe/
├── frontend/               # Flutter application
│   ├── lib/
│   │   ├── core/          # Core utilities, config, theme
│   │   ├── features/      # Feature modules (Clean Architecture)
│   │   │   ├── auth/      # Authentication
│   │   │   ├── home/      # Home screen + vendor cards
│   │   │   ├── invoices/  # Invoice CRUD + upload
│   │   │   ├── analytics/ # Analytics dashboards
│   │   │   ├── insights/  # AI insights
│   │   │   ├── settings/  # User settings
│   │   │   └── vendors/   # Vendor management
│   │   └── main.dart
│   └── pubspec.yaml
│
├── backend/               # NestJS API
│   ├── src/
│   │   ├── auth/         # Authentication + JWT strategy
│   │   ├── users/        # User management
│   │   ├── vendors/      # Vendor CRUD
│   │   ├── invoices/     # Invoice CRUD + upload
│   │   ├── extraction/   # OCR + LLM extraction
│   │   ├── analytics/    # Analytics queries
│   │   ├── insights/     # AI insights generation
│   │   ├── currency/     # Currency conversion
│   │   ├── export/       # CSV export
│   │   └── prisma/       # Prisma client
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
└── specs/                # Spec-Kit specifications
    ├── ACTIVE_SPEC.txt   # Points to active spec version
    └── 003-invoiceme-stabilization/
        ├── PRD.md
        ├── spec.md
        ├── quickstart.md
        └── ...
```

---

## 🚀 Quick Start

### Prerequisites

**Required:**
- Node.js 18+
- npm 8+
- Flutter SDK 3.10.7+
- PostgreSQL 15+ (or Supabase account)
- Git

**Optional (for full functionality):**
- Groq API key (for LLM extraction)
- Tesseract OCR (for local OCR)

### Installation

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/invoiceMe.git
cd invoiceMe
```

#### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration (see Environment Variables section)

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database (optional, for demo data)
npx prisma db seed

# Validate schema
npx prisma validate

# Build backend
npm run build
```

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
flutter pub get

# Verify Flutter installation
flutter doctor

# Clean previous builds (if needed)
flutter clean
```

### Running the Application

#### Start Backend (Development Mode)

```bash
cd backend
npm run start:dev
```

Backend will run on: `http://localhost:3000`

#### Start Frontend

**Web (Chrome):**
```bash
cd frontend
flutter run -d chrome
```

**Mobile (iOS Simulator):**
```bash
flutter run -d "iPhone 15 Pro"
```

**Mobile (Android Emulator):**
```bash
flutter run -d emulator-5554
```

**List Available Devices:**
```bash
flutter devices
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/invoiceme?schema=public"

# Supabase Auth
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_JWT_SECRET="your-jwt-secret"

# API Keys
GROQ_API_KEY="your-groq-api-key"

# Server
PORT=3000
NODE_ENV=development

# OCR (Optional)
TESSERACT_LANG="heb+eng"

# Currency API (Optional, defaults to Frankfurter)
FX_API_URL="https://api.frankfurter.app"

# Storage (Optional)
UPLOAD_DIR="./uploads"
```

### Frontend (`frontend/lib/core/config/api_constants.dart`)

```dart
static const String baseUrl = 'http://localhost:3000';
```

**For Mobile Testing:** Use your local IP address instead of `localhost`:
```dart
static const String baseUrl = 'http://192.168.1.100:3000';
```

---

## 📊 Database Schema

### Core Tables

- **User**: User accounts (synced from Supabase Auth)
- **Vendor**: Businesses/vendors where money was spent
- **Invoice**: Invoice records with OCR artifacts
- **InvoiceItem**: Individual line items on invoices
- **Insight**: AI-generated spending insights
- **FxRate**: Cached currency exchange rates

### Key Relationships

```
User 1:N Vendor
User 1:N Invoice
User 1:N Insight
Vendor 1:N Invoice
Invoice 1:N InvoiceItem
```

### Migrations

```bash
# Create new migration
cd backend
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

---

## 🔐 Authentication

InvoiceMe uses **Supabase Auth** with JWT tokens.

### Auth Flow

1. User signs up via frontend (`/auth/signup`)
2. Supabase creates auth user
3. Backend receives JWT token in `Authorization: Bearer <token>` header
4. Backend validates JWT using Supabase JWKS endpoint
5. Backend extracts `sub` claim as `tenantId`
6. All requests are scoped to `tenantId`

### Multi-Tenancy

- **Every** user-owned table includes `tenantId` field
- **Every** query filters by `tenantId`
- **No** cross-tenant reads/writes allowed
- Enforced via shared repository helpers + Prisma middleware

---

## 📸 OCR + Extraction Pipeline

### Upload Flow

1. **Upload**: User uploads PDF/image invoice
2. **Storage**: File saved to disk (or object storage)
3. **PDF Handling**:
   - Try extracting selectable text first
   - If no text, rasterize pages to images (300+ DPI)
4. **Preprocessing** (for images):
   - Auto-rotate using OSD
   - Deskew baseline
   - Crop to document
   - Normalize (grayscale, contrast, denoise)
   - Remove table lines
5. **OCR**: Multi-pass Tesseract with `heb+eng` languages
   - PSM 6, 4, 11, 12
   - Choose best pass based on scoring heuristic
6. **Deterministic Parsing**: Regex extraction for dates, amounts, currencies
7. **LLM Structuring**: Groq (or Ollama) structures OCR text into JSON
8. **Validation**: Check totals, dates, required fields
9. **Currency Conversion**: Convert to user's system currency
10. **Storage**: Save invoice + artifacts to database

### Supported Formats

- **PDF**: Text-based or scanned
- **Images**: JPEG, PNG, HEIC, WebP
- **Languages**: Hebrew + English (primary), extensible to others

---

## 💱 Currency Conversion

### Real-Time Conversion (NEW!)

**As of v003-stabilization**, all analytics amounts are converted **on-the-fly** to the user's current system currency.

#### How It Works:

1. User uploads invoice in ₪150 (ILS)
2. Backend stores: `originalAmount: 150`, `originalCurrency: ILS`
3. User views analytics with system currency = USD
4. Backend fetches user's current system currency
5. Backend converts: ₪150 → $40 (using CurrencyService)
6. Frontend displays: $40
7. User changes system currency to EUR
8. Backend re-converts: ₪150 → €38
9. Frontend displays: €38

#### Caching:

- Exchange rates cached for **12 hours** (via `FxCacheService`)
- Reduces API calls to Frankfurter
- Fallback to original amount if conversion fails

#### Supported Currencies:

- USD, EUR, GBP, ILS, JPY, CNY, and 30+ more
- Powered by [Frankfurter API](https://www.frankfurter.app)

---

## 📈 Analytics

### Features

- **Overall Analytics**: Total spend, limits, balances, top 5 vendors
- **Vendor Analytics**: Per-vendor spending, trends, period comparison
- **Charts**: Line charts (monthly spending), Pie charts (top vendors)
- **KPIs**: Current month spend, monthly average, yearly average, limit utilization
- **CSV Export**: Download analytics data for external analysis

### Performance

- **Optimized Queries**: Batch fetching + conversion
- **Caching**: FX rates cached for 12 hours
- **Timeouts**: 180s connect timeout, 60s receive timeout (configurable)
- **Loading Messages**: "It might take a while... after all, it's made for demo purposes..."

---

## 🤖 AI Insights

### Features

- **Natural Language Insights**: Plain English summaries of spending patterns
- **Powered by LLM**: Uses Groq API (or Ollama locally)
- **Fact-Based**: LLM only summarizes computed SQL facts
- **Conversational**: No JSON, no technical jargon

### Example Insights:

- "You've spent 15% more this month compared to last month."
- "Amazon accounts for 40% of your total spending."
- "You're $200 over your monthly budget for groceries."

---

## 🧪 Testing

### Frontend Tests

```bash
cd frontend

# Run all tests
flutter test

# Run with coverage
flutter test --coverage

# Analyze code
flutter analyze

# Build web (validates compilation)
flutter build web
```

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:cov

# Lint code
npm run lint

# Type check
npx tsc --noEmit

# Build (validates compilation)
npm run build
```

### Manual Testing

Refer to `specs/003-invoiceme-stabilization/quickstart.md` for comprehensive manual testing checklists across:
- Mobile (375px)
- Tablet (768px)
- Desktop (1440px)
- Cross-browser (Chrome, Safari, Firefox)

---

## 📦 Deployment

### Backend Deployment

**Requirements:**
- Node.js 18+ environment
- PostgreSQL 15+ database
- Environment variables configured

**Steps:**

```bash
# Build backend
cd backend
npm run build

# Run production server
npm run start:prod

# Or with PM2
pm2 start dist/src/main.js --name invoiceme-api
```

### Frontend Deployment

**Web (Static Hosting):**

```bash
cd frontend
flutter build web --release

# Deploy to Firebase Hosting, Netlify, Vercel, etc.
# Serve files from build/web/
```

**Mobile (App Stores):**

```bash
# iOS
flutter build ipa --release

# Android
flutter build apk --release
flutter build appbundle --release
```

---

## 🐛 Troubleshooting

### Backend Issues

**Problem:** `Prisma Client Not Generated`
```bash
cd backend
npx prisma generate
```

**Problem:** `Database Connection Failed`
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify credentials

**Problem:** `JWT Verification Failed`
- Check `SUPABASE_JWT_SECRET` matches Supabase project
- Verify token is not expired
- Check JWT format in `Authorization` header

### Frontend Issues

**Problem:** `Flutter Doctor Warnings`
```bash
flutter doctor -v
# Follow suggested fixes
```

**Problem:** `Package Version Conflicts`
```bash
cd frontend
flutter clean
flutter pub get
```

**Problem:** `API Connection Failed`
- Check `baseUrl` in `api_constants.dart`
- Ensure backend is running
- For mobile: Use local IP, not `localhost`

### OCR Issues

**Problem:** `Tesseract Not Initialized`
- Check Tesseract worker initialization logs
- Verify `heb+eng` language files downloaded

**Problem:** `Poor OCR Quality`
- Ensure images are 300+ DPI
- Check preprocessing pipeline logs
- Try different PSM modes

---

## 📚 Documentation

### Specs (Spec-Kit)

- **Active Spec**: `specs/ACTIVE_SPEC.txt` → `specs/003-invoiceme-stabilization/`
- **PRD**: `specs/003-invoiceme-stabilization/PRD.md`
- **Quickstart**: `specs/003-invoiceme-stabilization/quickstart.md`
- **Data Model**: `specs/002-invoiceme-mvp/DATA_MODEL.md`
- **API Contracts**: `specs/002-invoiceme-mvp/API_CONTRACTS.md`
- **Decisions**: `specs/003-invoiceme-stabilization/DECISIONS.md`

### Code Documentation

- **Backend API**: NestJS auto-generated Swagger docs (optional)
- **Frontend**: Inline Dart docs + architecture README (optional)

---

## 🛠️ Development Workflow

### Git Workflow

```bash
# Checkout active branch
git checkout 003-invoiceme-stabilization

# Create feature branch
git checkout -b feature/your-feature-name

# Commit changes
git add .
git commit -m "feat: Add feature description"

# Push to remote
git push origin feature/your-feature-name

# Create pull request
```

### Code Quality

**Frontend:**
- Run `flutter analyze` before committing
- Run `flutter test` before pushing
- Fix all linter warnings

**Backend:**
- Run `npm run lint` before committing
- Run `npm test` before pushing
- Run `npx prisma validate` after schema changes

### Hot Reload

**Backend:** Watch mode automatically recompiles on file changes
```bash
npm run start:dev
```

**Frontend:** Press `r` in terminal for hot reload, `R` for hot restart
```bash
flutter run
# Press 'r' for hot reload
# Press 'R' for hot restart
```

---

## 🤝 Contributing

### Workflow Rules (MANDATORY)

1. **Read Active Spec**: Always check `specs/ACTIVE_SPEC.txt` before starting work
2. **Follow Spec**: Implement ONLY what's defined in the active spec
3. **No Drift**: Don't add features not in the spec
4. **Validate**: Run all validation commands before creating PR
5. **Test**: Complete manual testing checklist
6. **Document**: Update `DECISIONS.md` for any unclear requirements

### Validation Checklist

- [ ] `flutter analyze` passes (0 errors)
- [ ] `flutter build web` succeeds
- [ ] `npm run build` succeeds
- [ ] `npx prisma validate` passes
- [ ] All manual tests pass
- [ ] Cross-browser tested
- [ ] Mobile responsive verified

---

## 📄 License

**UNLICENSED** - Private project, not for public distribution.

---

## 🙏 Acknowledgments

- **Flutter Team** for the amazing framework
- **NestJS Team** for the powerful backend framework
- **Supabase** for auth + database infrastructure
- **Groq** for fast LLM inference
- **Tesseract** for OCR capabilities
- **Frankfurter** for free FX rate API

---

## 📞 Support

For questions or issues:
- Review specs in `specs/` directory
- Check `DECISIONS.md` for project-specific decisions
- Check GitHub Issues (if applicable)
- Contact maintainers (if applicable)

---

## 🗺️ Roadmap

### Completed (v003)
- ✅ Real-time currency conversion
- ✅ Responsive UI (mobile/tablet/desktop)
- ✅ Loading indicators + snackbars
- ✅ Profile settings + CSV export
- ✅ Type error fixes
- ✅ Password validation (8 chars)

### Future (v004+)
- 🔲 Email/FTP integrations
- 🔲 Recurring invoice detection
- 🔲 Multi-user collaboration
- 🔲 Advanced reporting
- 🔲 Custom categories/tags
- 🔲 Receipt scanning optimization
- 🔲 Historical FX rates (vs current rates)

---

**Built with ❤️ for small businesses**
