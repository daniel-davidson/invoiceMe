# InvoiceMe - Complete Setup Guide

This guide covers all secrets, services, and deployment options for InvoiceMe.

---

## Table of Contents

1. [Supabase Setup](#1-supabase-setup)
2. [Database Setup](#2-database-setup)
3. [Currency API Setup](#3-currency-api-setup)
4. [OCR Service Setup](#4-ocr-service-setup)
5. [LLM Service Setup](#5-llm-service-setup)
6. [Backend Deployment](#6-backend-deployment)
7. [Frontend Deployment](#7-frontend-deployment)
8. [Environment Variables Reference](#8-environment-variables-reference)

---

## 1. Supabase Setup

Supabase provides authentication and optionally database hosting.

### Step 1: Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Enter:
   - **Name**: `invoiceme` (or your preference)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"** (takes ~2 minutes)

### Step 2: Get API Keys

1. Go to **Settings → API** (left sidebar)
2. Copy these values:

| Value | Where to Find | Usage |
|-------|---------------|-------|
| **Project URL** | Under "Project URL" | `SUPABASE_URL` |
| **anon public** | Under "Project API keys" | `SUPABASE_ANON_KEY` |
| **service_role secret** | Under "Project API keys" (click "Reveal") | `SUPABASE_SERVICE_ROLE_KEY` |

### Step 3: Get JWT Secret

1. Go to **Settings → API → JWT Settings**
2. Copy the **JWT Secret** → `JWT_SECRET`

### Step 4: Configure Email Auth

1. Go to **Authentication → Providers**
2. Enable **Email** provider
3. (Optional) Under **Authentication → Settings**:
   - Disable "Confirm email" for faster testing
   - Set **Site URL** to your frontend URL

### Step 5: (Optional) Custom SMTP

For production email delivery:

1. Go to **Settings → Auth → SMTP Settings**
2. Enable "Custom SMTP"
3. Configure with your email provider:

| Provider | SMTP Host | Port |
|----------|-----------|------|
| SendGrid | smtp.sendgrid.net | 587 |
| Mailgun | smtp.mailgun.org | 587 |
| AWS SES | email-smtp.{region}.amazonaws.com | 587 |
| Resend | smtp.resend.com | 587 |

### Documentation

- [Supabase Auth Setup](https://supabase.com/docs/guides/auth)
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

---

## 2. Database Setup

### Option A: Supabase Database (Recommended for Shared Demo)

1. Your Supabase project includes a PostgreSQL database
2. Get connection string:
   - Go to **Settings → Database**
   - Copy **Connection string** (URI format)
   - Replace `[YOUR-PASSWORD]` with your database password

```
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Option B: Local PostgreSQL

1. Install PostgreSQL:
   ```bash
   # macOS
   brew install postgresql@15
   brew services start postgresql@15
   
   # Ubuntu
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. Create database:
   ```bash
   createdb invoiceme
   ```

3. Connection string:
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/invoiceme"
   ```

### Option C: Other Cloud Providers

| Provider | Free Tier | Setup |
|----------|-----------|-------|
| [Neon](https://neon.tech) | 512MB, 3GB storage | Create project → Copy connection string |
| [Railway](https://railway.app) | $5 credit | Deploy PostgreSQL → Get connection URL |
| [PlanetScale](https://planetscale.com) | 1 database | Requires mysql2 adapter |

---

## 3. Currency API Setup

### Recommended: Frankfurter API (FREE, No API Key)

**Why**: Free, no registration, 10,000+ requests/day, all currencies as base.

- **Base URL**: `https://api.frankfurter.app`
- **Docs**: [https://www.frankfurter.app/docs/](https://www.frankfurter.app/docs/)

Update backend to use:
```typescript
// No API key needed!
const FX_API_URL = 'https://api.frankfurter.app/latest';
```

### Alternative: Open Exchange Rates

If you need historical data or more features:

1. Go to [https://openexchangerates.org](https://openexchangerates.org)
2. Sign up for **Free Forever** plan (1,000 requests/month, USD base only)
3. Or **Developer** plan ($12/month, 10,000 requests)
4. Copy **App ID** → `FX_API_KEY`

### Alternative: ExchangeRate-API

1. Go to [https://www.exchangerate-api.com](https://www.exchangerate-api.com)
2. Free tier: 1,500 requests/month
3. Copy API key → `FX_API_KEY`

### NPM Packages

```bash
# For Frankfurter (no key needed)
npm install axios  # Just use axios, no special package

# For Open Exchange Rates
npm install oxr
```

---

## 4. OCR Service Setup

### Option A: Local Tesseract (Development)

```bash
# macOS
brew install tesseract tesseract-lang

# Ubuntu/Debian
sudo apt install tesseract-ocr tesseract-ocr-heb tesseract-ocr-eng

# Verify
tesseract --version
tesseract --list-langs  # Should show: eng, heb
```

### Option B: Cloud OCR Services (Production)

| Service | Free Tier | Best For | Setup |
|---------|-----------|----------|-------|
| **Google Cloud Vision** | 1,000 images/month | High accuracy | [Setup Guide](https://cloud.google.com/vision/docs/setup) |
| **AWS Textract** | 1,000 pages/month (12 months) | Document analysis | [Setup Guide](https://docs.aws.amazon.com/textract/) |
| **Azure Computer Vision** | 5,000 transactions/month | Multi-language | [Setup Guide](https://learn.microsoft.com/en-us/azure/cognitive-services/computer-vision/) |
| **OCR.space** | 25,000 requests/month | Simple API | [Get API Key](https://ocr.space/ocrapi) |

### Google Cloud Vision Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project or select existing
3. Enable **Cloud Vision API**
4. Create **Service Account** with Vision API access
5. Download JSON key file
6. Set environment variable:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
   ```

### OCR.space Setup (Easiest)

1. Go to [https://ocr.space/ocrapi](https://ocr.space/ocrapi)
2. Get free API key
3. Set:
   ```bash
   OCR_PROVIDER="ocrspace"
   OCR_API_KEY="your-api-key"
   ```

---

## 5. LLM Service Setup

### Option A: Local Ollama (Development)

```bash
# Install
curl -fsSL https://ollama.ai/install.sh | sh

# Start
ollama serve

# Pull model
ollama pull llama3.2:3b

# Verify
curl http://localhost:11434/api/tags
```

### Option B: Cloud LLM Services (Production)

| Service | Free Tier | Setup |
|---------|-----------|-------|
| **Groq** | 14,400 requests/day | [Get API Key](https://console.groq.com) |
| **Together AI** | $25 credit | [Get API Key](https://api.together.xyz) |
| **OpenRouter** | Pay-per-use | [Get API Key](https://openrouter.ai) |
| **Replicate** | Some free models | [Get API Key](https://replicate.com) |

### Groq Setup (Recommended - Fast & Free)

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up with Google/GitHub
3. Go to **API Keys** → Create new key
4. Set:
   ```bash
   LLM_PROVIDER="groq"
   LLM_API_KEY="gsk_..."
   LLM_MODEL="llama-3.2-3b-preview"
   ```

### Together AI Setup

1. Go to [https://api.together.xyz](https://api.together.xyz)
2. Sign up and get API key
3. Set:
   ```bash
   LLM_PROVIDER="together"
   LLM_API_KEY="..."
   LLM_MODEL="meta-llama/Llama-3.2-3B-Instruct-Turbo"
   ```

### Option C: Self-Hosted Ollama (Production)

For full control, deploy Ollama on a cloud server:

#### Using Railway (One-Click)

1. Go to [Railway Ollama Template](https://railway.app/template/ollama)
2. Click "Deploy Now"
3. Get public URL after deployment

#### Using DigitalOcean/AWS/GCP

1. Create VM (4GB+ RAM, GPU optional)
2. Install Ollama:
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ```
3. Configure for remote access:
   ```bash
   # Edit systemd service
   sudo systemctl edit ollama.service
   
   # Add:
   [Service]
   Environment="OLLAMA_HOST=0.0.0.0"
   ```
4. Set up reverse proxy with Nginx + SSL
5. Optionally add basic auth

---

## 6. Backend Deployment

### Option A: Railway (Recommended)

1. Go to [https://railway.app](https://railway.app)
2. Connect GitHub repo
3. Add environment variables
4. Deploy automatically on push

```bash
# railway.json (optional)
{
  "build": { "builder": "NIXPACKS" },
  "deploy": { "startCommand": "npm run start:prod" }
}
```

### Option B: Render

1. Go to [https://render.com](https://render.com)
2. Create "Web Service"
3. Connect repo, set build command: `npm run build`
4. Set start command: `npm run start:prod`
5. Add environment variables

### Option C: Fly.io

```bash
# Install flyctl
brew install flyctl

# Login and deploy
fly auth login
fly launch
fly secrets set DATABASE_URL="..." SUPABASE_URL="..."
fly deploy
```

### Option D: Docker + VPS

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-eng tesseract-ocr-data-heb
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

---

## 7. Frontend Deployment

### Architecture: No Secrets in Frontend

The frontend should **NOT** contain any secrets. Instead:

1. **Backend provides config endpoint**: `/api/config`
2. **Frontend fetches config at runtime**
3. **Only the backend URL is needed** (can be from environment or build-time)

### Deployment Options

| Platform | Best For | Docs |
|----------|----------|------|
| **Vercel** | Flutter Web | Deploy `build/web` folder |
| **Netlify** | Flutter Web | Deploy `build/web` folder |
| **Firebase Hosting** | Flutter Web + Mobile | [Docs](https://firebase.google.com/docs/hosting) |
| **App Store** | iOS | Standard Flutter iOS build |
| **Play Store** | Android | Standard Flutter Android build |

### Build Commands

```bash
# Web
flutter build web --release
# Deploy build/web folder

# Android
flutter build apk --release
# Or: flutter build appbundle --release

# iOS
flutter build ios --release
```

---

## 8. Environment Variables Reference

### Backend (.env)

```bash
# ===== DATABASE =====
DATABASE_URL="postgresql://..."

# ===== SUPABASE AUTH =====
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
JWT_SECRET="your-jwt-secret"

# ===== LLM SERVICE =====
# Option 1: Local Ollama
LLM_PROVIDER="ollama"
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2:3b"

# Option 2: Groq (Cloud)
LLM_PROVIDER="groq"
LLM_API_KEY="gsk_..."
LLM_MODEL="llama-3.2-3b-preview"

# Option 3: Together AI
LLM_PROVIDER="together"
LLM_API_KEY="..."
LLM_MODEL="meta-llama/Llama-3.2-3B-Instruct-Turbo"

# ===== OCR SERVICE =====
# Option 1: Local Tesseract
OCR_PROVIDER="tesseract"
TESSERACT_LANGS="eng+heb"

# Option 2: Google Cloud Vision
OCR_PROVIDER="google"
GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"

# Option 3: OCR.space
OCR_PROVIDER="ocrspace"
OCR_API_KEY="..."

# ===== CURRENCY API =====
# Option 1: Frankfurter (FREE, no key)
FX_PROVIDER="frankfurter"
FX_API_URL="https://api.frankfurter.app"

# Option 2: Open Exchange Rates
FX_PROVIDER="openexchangerates"
FX_API_KEY="..."

# ===== APPLICATION =====
PORT=3000
NODE_ENV=production
STORAGE_DIR="./uploads"
CORS_ORIGINS="https://your-frontend.com"
```

### Frontend (runtime config from backend)

The frontend fetches configuration from `GET /api/config`:

```json
{
  "apiUrl": "https://api.invoiceme.app",
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseAnonKey": "eyJ..."
}
```

This way:
- No secrets in frontend code
- Config changes without rebuilding
- Same build works for all environments

---

## Quick Start Checklist

### Development

- [ ] Create Supabase project
- [ ] Copy API keys to `.env`
- [ ] Install Tesseract locally
- [ ] Install and run Ollama locally
- [ ] Run `npm run start:dev`
- [ ] Run `flutter run`

### Production

- [ ] Set up cloud database (Supabase/Neon)
- [ ] Choose LLM provider (Groq recommended)
- [ ] Choose OCR provider (Google Vision or OCR.space)
- [ ] Deploy backend (Railway/Render)
- [ ] Deploy frontend (Vercel/Firebase)
- [ ] Configure CORS and SSL
- [ ] Test full flow

---

## Support Resources

- [Supabase Docs](https://supabase.com/docs)
- [NestJS Docs](https://docs.nestjs.com)
- [Flutter Docs](https://docs.flutter.dev)
- [Prisma Docs](https://www.prisma.io/docs)
- [Ollama Docs](https://ollama.ai/docs)
