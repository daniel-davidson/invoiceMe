# Technical Decisions: InvoiceMe MVP

**Version**: 1.0
**Date**: 2026-01-18
**Purpose**: Consolidate research.md technical decisions

---

## Decision Log

This document consolidates all major technical decisions made for the InvoiceMe MVP, including rationale, alternatives considered, and implementation notes.

---

## 1. Authentication Strategy

**Decision**: Supabase Auth with email/password, JWT verification in NestJS

**Rationale**:
- Supabase provides battle-tested authentication with minimal setup
- JWT `sub` claim directly maps to `tenantId` (no additional lookup required)
- NestJS `@nestjs/passport` + `passport-jwt` handles verification seamlessly
- Supabase client SDK handles token refresh automatically on frontend
- Reduces security risk compared to custom implementation
- Aligns with database choice (Supabase-hosted PostgreSQL)

**Alternatives Considered**:

| Option | Rejected Because |
|--------|------------------|
| Custom auth with bcrypt | Security risk, more code to maintain, requires session management |
| Firebase Auth | Different ecosystem, Supabase already chosen for DB |
| Auth0 | Additional service dependency, overkill for POC, cost implications |
| Passport Local Strategy | Requires custom user management, more complex than Supabase |

**Implementation**:
- Backend: `@nestjs/passport`, `@nestjs/jwt`, `passport-jwt`
- Frontend: Supabase client SDK for Flutter
- Token storage: Secure storage on client, HTTP-only cookies (future enhancement)

---

## 2. OCR Pipeline Strategy

**Decision**: Tesseract.js with Hebrew + English, PDF-to-image fallback

**Rationale**:
- `tesseract.js` is pure JavaScript, no native dependencies (easier setup)
- Supports Hebrew (`heb`) and English (`eng`) language packs natively
- PDF handling strategy:
  1. Try `pdf-parse` for text extraction (selectable text)
  2. If no text found: Use `pdf-poppler` to convert to images
  3. Run OCR on images (max 2 pages for POC to limit processing time)
- Local processing (no network dependency, privacy-friendly)
- Free and open-source

**Alternatives Considered**:

| Option | Rejected Because |
|--------|------------------|
| Google Vision API | Network dependency, cost per request, requires API key |
| AWS Textract | Network dependency, AWS account required, cost implications |
| Native Tesseract | Requires system install, complicates local setup for users |
| Azure Computer Vision | Network dependency, Microsoft account required, cost |

**Implementation Notes**:

```typescript
// PDF processing decision tree
if (isPDF(file)) {
  const text = await pdfParse(buffer);
  if (text.trim().length > 50) {
    return text; // Has selectable text
  }
  // Convert to images and OCR
  const images = await pdfToImages(buffer, { maxPages: 2 });
  return await ocrImages(images);
}
```

**Performance**:
- Text extraction: < 1 second
- OCR processing: 5-15 seconds per page
- Total target: < 30 seconds for 2-page invoice

---

## 3. LLM Integration (Ollama)

**Decision**: Local Ollama with HTTP API, structured JSON extraction

**Rationale**:
- Ollama runs locally, no API keys or network dependency
- Privacy-friendly (invoice data never leaves local machine)
- Supports various models (llama2, mistral, codellama)
- HTTP API is simple to integrate from NestJS
- Prompt engineering for strict JSON output
- Free and open-source
- Meets "local-runnable" requirement

**Model Selection**:
- **Recommended**: `mistral:7b` (4.1GB) - Best balance of speed/quality
- **Alternative**: `llama2:7b` (3.8GB) - Slightly faster, lower quality
- **Alternative**: `codellama:7b` (3.8GB) - Good for structured output

**Alternatives Considered**:

| Option | Rejected Because |
|--------|------------------|
| OpenAI GPT-4 API | Network dependency, cost per request, API key required |
| Anthropic Claude API | Network dependency, cost, API key required |
| Google PaLM API | Network dependency, cost, API key required |
| Hugging Face Inference API | Network dependency, rate limits on free tier |

**Prompt Template**:

```text
You are an invoice data extractor. Extract the following fields from the OCR text below and return ONLY valid JSON matching this schema:

{
  "vendorName": string,
  "invoiceDate": "YYYY-MM-DD",
  "totalAmount": number,
  "currency": "XXX",
  "invoiceNumber": string | null,
  "vatAmount": number | null,
  "subtotalAmount": number | null,
  "confidence": {
    "vendorName": 0-1,
    "invoiceDate": 0-1,
    "totalAmount": 0-1,
    "currency": 0-1
  },
  "warnings": string[]
}

OCR Text:
---
{ocr_text}
---

Return ONLY the JSON object, no explanation.
```

**Configuration**:
- Temperature: 0.3 (low for consistent, factual output)
- Max tokens: 500 (sufficient for extraction response)
- Timeout: 15 seconds
- Retries: 2 attempts with exponential backoff

---

## 4. Currency Conversion

**Decision**: exchangeratesapi.io "latest" endpoint with 12-hour in-memory cache

**Rationale**:
- Free tier sufficient for POC (1000 requests/month)
- "Latest" endpoint provides current exchange rates
- In-memory cache avoids repeated API calls
- TTL of 12 hours balances freshness vs API limits
- Simple implementation (no additional infrastructure)
- Graceful fallback when API unavailable

**Alternatives Considered**:

| Option | Rejected Because |
|--------|------------------|
| Redis cache | Adds operational complexity, Docker may be unavailable |
| Database cache | Overkill for POC, in-memory simpler and faster |
| No cache | Would hit rate limits quickly with multiple users |
| Historical rates | Out of scope for POC, "latest" sufficient |

**Implementation**:

```typescript
// FxCacheService
private cache: Map<string, { rates: Record<string, number>; timestamp: number }>;
private TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

async getRate(from: string, to: string): Promise<number> {
  const cached = this.cache.get(from);
  if (cached && Date.now() - cached.timestamp < this.TTL_MS) {
    return cached.rates[to];
  }
  const response = await this.fetchRates(from);
  this.cache.set(from, { rates: response.rates, timestamp: Date.now() });
  return response.rates[to];
}
```

**Fallback Strategy**:
- If API unavailable: Store original currency, set `normalizedAmount = null`
- Flag invoice for later conversion when API available
- User can still view and manage invoice with original amount

---

## 5. File Storage

**Decision**: Local filesystem with configurable path, metadata in DB

**Rationale**:
- Meets "local-runnable without Docker" requirement
- Simple to implement and debug
- Path configurable via environment variable
- DB stores only file path, not binary data (keeps DB lightweight)
- Organized by tenantId for additional isolation
- No external service dependency

**Alternatives Considered**:

| Option | Rejected Because |
|--------|------------------|
| AWS S3 | Network dependency, AWS account required, cost |
| Supabase Storage | Network dependency, requires internet for local dev |
| Database BLOB storage | Poor performance, bloats database |
| MinIO | Requires Docker, adds complexity |

**Directory Structure**:

```
uploads/
├── {tenantId}/
│   ├── {invoiceId}_original.pdf
│   └── {invoiceId}_original.jpg
```

**Security**:
- Files organized by tenantId (additional isolation layer)
- File access controlled through API (no direct URL access)
- API verifies tenantId before serving file
- Prevents cross-tenant file access

**Configuration**:
```env
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB=10
```

---

## 6. Vendor Matching Algorithm

**Decision**: Normalized string matching with fuzzy threshold (Levenshtein distance ≤ 2)

**Rationale**:
- Simple approach suitable for POC
- Handles case differences, extra spaces, punctuation
- Fuzzy matching catches minor OCR errors (e.g., "Acme Corp" vs "Acme Crop")
- Levenshtein distance of 2 allows 2 character differences
- Fast execution (no ML model required)

**Alternatives Considered**:

| Option | Rejected Because |
|--------|------------------|
| Exact match only | Too strict, OCR errors would create duplicate vendors |
| ML-based matching | Overkill for POC, requires training data |
| Soundex/Metaphone | Designed for phonetic matching, not OCR errors |
| Elasticsearch fuzzy | Requires Elasticsearch, adds complexity |

**Algorithm**:

```typescript
function normalizeVendorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize spaces
    .trim();
}

async function matchVendor(extracted: string, tenantId: string): Promise<Vendor | null> {
  const normalized = normalizeVendorName(extracted);
  const vendors = await prisma.vendor.findMany({ where: { tenantId } });

  // Step 1: Exact match
  for (const vendor of vendors) {
    if (normalizeVendorName(vendor.name) === normalized) {
      return vendor;
    }
  }

  // Step 2: Fuzzy match (Levenshtein distance <= 2)
  for (const vendor of vendors) {
    const vendorNorm = normalizeVendorName(vendor.name);
    if (levenshteinDistance(vendorNorm, normalized) <= 2) {
      return vendor;
    }
  }

  return null; // No match, create new vendor
}
```

**Edge Cases**:
- Empty vendor name: Use "Unknown Vendor"
- Very long vendor name: Truncate to 200 characters
- Special characters: Removed during normalization

---

## 7. State Management (Flutter)

**Decision**: Riverpod with class-based Notifiers

**Rationale**:
- Type-safe, compile-time checked state management
- Class-based notifiers allow complex state logic
- Built-in support for async operations
- Works well with Clean Architecture
- Better testability than Provider
- Active maintenance and community support
- Code generation for boilerplate reduction

**Alternatives Considered**:

| Option | Rejected Because |
|--------|------------------|
| Provider | Less type-safe, more boilerplate |
| BLoC | More complex, steeper learning curve |
| GetX | Less type-safe, service locator pattern |
| Redux | Too much boilerplate for POC |

**Pattern**:

```dart
@riverpod
class VendorsNotifier extends _$VendorsNotifier {
  @override
  Future<List<Vendor>> build() async {
    return ref.read(vendorRepositoryProvider).getVendors();
  }

  Future<void> addVendor(String name) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await ref.read(vendorRepositoryProvider).createVendor(name);
      return ref.read(vendorRepositoryProvider).getVendors();
    });
  }
}
```

**Benefits**:
- Automatic loading/error states
- Easy testing with mocks
- Dependency injection built-in
- Hot reload friendly

---

## 8. Charts Library

**Decision**: fl_chart for Flutter

**Rationale**:
- Pure Dart, no platform dependencies (works on web)
- Supports pie charts and line charts (both required)
- Highly customizable (colors, labels, animations)
- Active maintenance and regular updates
- Good documentation and examples
- MIT license (permissive)

**Alternatives Considered**:

| Option | Rejected Because |
|--------|------------------|
| charts_flutter | Less customizable, Google deprecated |
| syncfusion_flutter_charts | Requires commercial license |
| graphic | Less mature, fewer features |
| plotly | Web-only, not native Flutter |

**Usage**:
- Pie chart: Top 5 vendors by spend
- Line chart: Monthly spend trend (last 12 months)
- Customization: Brand colors, tooltips, legends

---

## 9. PDF Processing Library

**Decision**: pdf-parse for text, pdf-poppler for image conversion

**Rationale**:
- `pdf-parse` extracts text from PDFs with selectable text (fast, < 1s)
- `pdf-poppler` converts PDF pages to images when OCR needed
- Both are Node.js compatible
- Widely used and maintained
- No external service dependency

**Alternatives Considered**:

| Option | Rejected Because |
|--------|------------------|
| pdfjs-dist | Browser-only, not suitable for backend |
| pdf2pic | Similar to pdf-poppler, less maintained |
| Apache PDFBox | Java-based, requires JVM |
| PyPDF2 | Python-based, requires Python runtime |

**Fallback Strategy**:
1. Check if PDF has selectable text (> 50 chars extracted)
2. If yes: Use extracted text directly
3. If no: Convert first 2 pages to images, run Tesseract OCR

**Configuration**:
```typescript
{
  maxPages: 2,        // Limit to first 2 pages
  density: 300,       // DPI for image conversion
  format: 'png',      // Output format
  quality: 100        // Image quality
}
```

---

## 10. Database Choice

**Decision**: PostgreSQL on Supabase (remote) + local Postgres option

**Rationale**:
- Supabase provides hosted PostgreSQL with connection pooling
- Same database engine for local and remote (consistency)
- Prisma supports both configurations via connection string
- Enables "shareable demo" requirement (Supabase)
- Supports local development without internet (local Postgres)
- PostgreSQL features: JSONB, full-text search, robust indexing
- Free tier sufficient for POC

**Alternatives Considered**:

| Option | Rejected Because |
|--------|------------------|
| MySQL | Less feature-rich than PostgreSQL |
| MongoDB | NoSQL not ideal for relational data (invoices, vendors) |
| SQLite | Not suitable for multi-tenant, no remote option |
| Firebase Firestore | Different ecosystem, less SQL-like |

**Configuration**:

```env
# Remote (Supabase)
DATABASE_URL="postgresql://user:pass@db.xxx.supabase.co:5432/postgres"

# Local
DATABASE_URL="postgresql://localhost:5432/invoiceme"
```

**Prisma Benefits**:
- Type-safe database client
- Automatic migrations
- Schema-first development
- Excellent TypeScript support

---

## 11. Frontend Architecture

**Decision**: Clean Architecture with feature-based organization

**Rationale**:
- Clear separation of concerns (presentation, domain, data)
- Testable business logic (domain layer)
- Easy to swap implementations (e.g., API → local storage)
- Scalable for future features
- Industry best practice for Flutter apps

**Structure**:

```
features/
├── auth/
│   ├── data/           # API, models, repositories
│   ├── domain/         # Entities, use cases, repository interfaces
│   └── presentation/   # Screens, widgets, notifiers
```

**Alternatives Considered**:

| Option | Rejected Because |
|--------|------------------|
| Flat structure | Doesn't scale, hard to navigate |
| MVC | Less testable, tight coupling |
| MVVM | Similar to Clean Architecture, less explicit layers |

---

## 12. API Design

**Decision**: RESTful API with resource-based endpoints

**Rationale**:
- Standard, well-understood pattern
- Easy to document (OpenAPI/Swagger)
- Works well with HTTP methods (GET, POST, PATCH, DELETE)
- Simple to consume from Flutter
- No need for GraphQL complexity in POC

**Endpoint Pattern**:
- `GET /vendors` - List vendors
- `POST /vendors` - Create vendor
- `PATCH /vendors/:id` - Update vendor
- `DELETE /vendors/:id` - Delete vendor

**Alternatives Considered**:

| Option | Rejected Because |
|--------|------------------|
| GraphQL | Overkill for POC, adds complexity |
| gRPC | Not web-friendly, requires protobuf |
| SOAP | Legacy, verbose |

---

## Summary

All technical decisions prioritize:
1. **Local-runnable**: No Docker, minimal external dependencies
2. **Privacy**: OCR and LLM processing happens locally
3. **Simplicity**: POC-appropriate solutions, avoid over-engineering
4. **Type-safety**: TypeScript (backend) and Dart (frontend)
5. **Testability**: Clean Architecture, dependency injection
6. **Multi-tenancy**: Enforced at every layer

**Total External Dependencies**:
- Supabase (auth + optional DB hosting)
- exchangeratesapi.io (currency conversion)

**Local Dependencies**:
- PostgreSQL
- Tesseract OCR
- Ollama LLM

All decisions documented in this file are final for MVP scope.
