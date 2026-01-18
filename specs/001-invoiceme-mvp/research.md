# Research: InvoiceMe MVP

**Branch**: `001-invoiceme-mvp` | **Date**: 2026-01-18

---

## Technical Decisions

### 1. Authentication Strategy

**Decision**: Supabase Auth with email/password, JWT verification in NestJS

**Rationale**:
- Supabase provides battle-tested auth with minimal setup
- JWT `sub` claim directly maps to `tenantId` (no additional lookup)
- NestJS `@nestjs/passport` + `passport-jwt` handles verification
- Supabase client SDK handles token refresh on frontend

**Alternatives Considered**:
| Option | Rejected Because |
|--------|------------------|
| Custom auth | Security risk, more code to maintain |
| Firebase Auth | Different ecosystem, Supabase already chosen for DB |
| Auth0 | Additional service, overkill for POC |

---

### 2. OCR Pipeline Strategy

**Decision**: Tesseract.js with Hebrew + English, PDF-to-image fallback

**Rationale**:
- `tesseract.js` is pure JavaScript, no native dependencies
- Supports Hebrew (`heb`) and English (`eng`) language packs
- PDF handling:
  1. Try `pdf-parse` for text extraction (selectable text)
  2. If no text: Use `pdf-poppler` to convert to images
  3. Run OCR on images (max 2 pages for POC)

**Alternatives Considered**:
| Option | Rejected Because |
|--------|------------------|
| Google Vision API | Network dependency, cost |
| AWS Textract | Network dependency, AWS account required |
| Native Tesseract | Requires system install, complicates local setup |

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

---

### 3. LLM Integration (Ollama)

**Decision**: Local Ollama with HTTP API, structured JSON extraction

**Rationale**:
- Ollama runs locally, no API keys or network dependency
- Supports various models (llama2, mistral, etc.)
- HTTP API is simple to integrate from NestJS
- Prompt engineering for strict JSON output

**Model Selection**:
- Recommended: `mistral:7b` (good balance of speed/quality)
- Alternative: `llama2:7b` or `codellama:7b`

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
  "confidence": { "vendorName": 0-1, "invoiceDate": 0-1, "totalAmount": 0-1, "currency": 0-1 },
  "warnings": string[]
}

OCR Text:
---
{ocr_text}
---

Return ONLY the JSON object, no explanation.
```

---

### 4. Currency Conversion

**Decision**: exchangeratesapi.io "latest" endpoint with 12-hour in-memory cache

**Rationale**:
- Free tier sufficient for POC
- "Latest" endpoint provides current rates
- In-memory cache avoids repeated API calls
- TTL of 12 hours balances freshness vs API limits

**Alternatives Considered**:
| Option | Rejected Because |
|--------|------------------|
| Redis cache | Adds operational complexity, Docker may be unavailable |
| Database cache | Overkill for POC, in-memory simpler |
| No cache | Would hit rate limits quickly |

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

---

### 5. File Storage

**Decision**: Local filesystem with configurable path, metadata in DB

**Rationale**:
- Meets "local-runnable without Docker" requirement
- Simple to implement and debug
- Path configurable via environment variable
- DB stores only file path, not binary data

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

---

### 6. Vendor Matching Algorithm

**Decision**: Normalized string matching with fuzzy threshold

**Rationale**:
- Simple approach suitable for POC
- Handles case differences, extra spaces
- Fuzzy matching catches minor OCR errors

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
  
  for (const vendor of vendors) {
    const vendorNorm = normalizeVendorName(vendor.name);
    if (vendorNorm === normalized) return vendor;
    if (levenshteinDistance(vendorNorm, normalized) <= 2) return vendor;
  }
  return null; // No match, create new vendor
}
```

---

### 7. State Management (Flutter)

**Decision**: Riverpod with class-based Notifiers

**Rationale**:
- Type-safe, testable state management
- Class-based notifiers allow complex state logic
- Built-in support for async operations
- Works well with Clean Architecture

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

---

### 8. Charts Library

**Decision**: fl_chart for Flutter

**Rationale**:
- Pure Dart, no platform dependencies
- Supports pie charts and line charts (required)
- Highly customizable
- Active maintenance

**Alternatives Considered**:
| Option | Rejected Because |
|--------|------------------|
| charts_flutter | Less customizable |
| syncfusion_flutter_charts | Requires license |
| graphic | Less mature |

---

### 9. PDF Processing Library

**Decision**: pdf-parse for text, pdf-poppler for image conversion

**Rationale**:
- `pdf-parse` extracts text from PDFs with selectable text
- `pdf-poppler` converts PDF pages to images when OCR needed
- Both are Node.js compatible

**Fallback Strategy**:
1. Check if PDF has selectable text (> 50 chars extracted)
2. If yes: Use extracted text directly
3. If no: Convert first 2 pages to images, run Tesseract OCR

---

### 10. Database Choice

**Decision**: PostgreSQL on Supabase (remote) + local Postgres option

**Rationale**:
- Supabase provides hosted PostgreSQL with connection pooling
- Same database engine for local and remote
- Prisma supports both configurations via connection string
- Enables "shareable demo" requirement

**Configuration**:
```env
# Remote (Supabase)
DATABASE_URL="postgresql://user:pass@db.xxx.supabase.co:5432/postgres"

# Local
DATABASE_URL="postgresql://localhost:5432/invoiceme"
```

---

## Open Questions (None)

All technical decisions have been made. No clarifications needed.

---

## References

- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [Ollama API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [exchangeratesapi.io Documentation](https://exchangeratesapi.io/documentation/)
- [Riverpod Documentation](https://riverpod.dev/)
- [fl_chart Documentation](https://pub.dev/packages/fl_chart)
- [Prisma with NestJS](https://docs.nestjs.com/recipes/prisma)
