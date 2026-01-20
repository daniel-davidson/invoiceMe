# Test Plan: InvoiceMe MVP

**Version**: 1.0
**Date**: 2026-01-18
**Purpose**: Define unit, integration, and smoke test scenarios

---

## Testing Strategy

### Test Pyramid

```
        ┌─────────────┐
        │   E2E (5%)  │  Smoke tests, critical user journeys
        ├─────────────┤
        │ Integration │  API endpoints, database, external services
        │    (25%)    │
        ├─────────────┤
        │    Unit     │  Business logic, utilities, validation
        │    (70%)    │
        └─────────────┘
```

### Testing Principles

1. **Tenant Isolation**: Every test verifies multi-tenancy enforcement
2. **Data Independence**: Tests create and clean up their own data
3. **Fast Feedback**: Unit tests run in < 5s, integration in < 30s
4. **Realistic Data**: Use sample invoices in Hebrew and English

---

## Unit Tests

### Backend Unit Tests

#### Auth Service (`backend/test/auth/auth.service.spec.ts`)

```typescript
describe('AuthService', () => {
  describe('signup', () => {
    it('should create user with hashed password', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        fullName: 'Test User',
        systemCurrency: 'USD'
      };
      const result = await authService.signup(dto);
      expect(result.user.email).toBe(dto.email);
      expect(result.accessToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await authService.signup({ email: 'dup@example.com', ... });
      await expect(
        authService.signup({ email: 'dup@example.com', ... })
      ).rejects.toThrow('Email already exists');
    });

    it('should validate password strength', async () => {
      await expect(
        authService.signup({ password: '123', ... })
      ).rejects.toThrow('Password too weak');
    });
  });

  describe('login', () => {
    it('should return JWT on valid credentials', async () => {
      await authService.signup({ email: 'user@example.com', password: 'Pass123!', ... });
      const result = await authService.login({
        email: 'user@example.com',
        password: 'Pass123!'
      });
      expect(result.accessToken).toBeDefined();
    });

    it('should reject invalid credentials without revealing which field', async () => {
      await expect(
        authService.login({ email: 'wrong@example.com', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

#### Vendors Service (`backend/test/vendors/vendors.service.spec.ts`)

```typescript
describe('VendorsService', () => {
  let tenantId1: string;
  let tenantId2: string;

  beforeEach(async () => {
    tenantId1 = await createTestUser();
    tenantId2 = await createTestUser();
  });

  describe('create', () => {
    it('should create vendor for tenant', async () => {
      const vendor = await vendorsService.create(tenantId1, { name: 'Acme Corp' });
      expect(vendor.name).toBe('Acme Corp');
      expect(vendor.tenantId).toBe(tenantId1);
    });

    it('should enforce unique vendor name per tenant', async () => {
      await vendorsService.create(tenantId1, { name: 'Acme' });
      await expect(
        vendorsService.create(tenantId1, { name: 'Acme' })
      ).rejects.toThrow('Vendor already exists');
    });

    it('should allow same vendor name for different tenants', async () => {
      await vendorsService.create(tenantId1, { name: 'Acme' });
      const vendor2 = await vendorsService.create(tenantId2, { name: 'Acme' });
      expect(vendor2.name).toBe('Acme');
    });
  });

  describe('list', () => {
    it('should return only tenant\'s vendors', async () => {
      await vendorsService.create(tenantId1, { name: 'Vendor1' });
      await vendorsService.create(tenantId2, { name: 'Vendor2' });

      const vendors = await vendorsService.list(tenantId1);
      expect(vendors).toHaveLength(1);
      expect(vendors[0].name).toBe('Vendor1');
    });

    it('should return vendors in displayOrder', async () => {
      await vendorsService.create(tenantId1, { name: 'B' });
      await vendorsService.create(tenantId1, { name: 'A' });
      await vendorsService.reorder(tenantId1, ['A_id', 'B_id']);

      const vendors = await vendorsService.list(tenantId1);
      expect(vendors[0].name).toBe('A');
    });
  });

  describe('delete', () => {
    it('should cascade delete invoices', async () => {
      const vendor = await vendorsService.create(tenantId1, { name: 'Test' });
      await invoicesService.create(tenantId1, { vendorId: vendor.id, ... });

      const result = await vendorsService.delete(tenantId1, vendor.id);
      expect(result.deletedInvoicesCount).toBe(1);
    });

    it('should not delete vendor from different tenant', async () => {
      const vendor = await vendorsService.create(tenantId1, { name: 'Test' });
      await expect(
        vendorsService.delete(tenantId2, vendor.id)
      ).rejects.toThrow('Not found');
    });
  });
});
```

#### Extraction Service (`backend/test/extraction/extraction.service.spec.ts`)

```typescript
describe('ExtractionService', () => {
  describe('processInvoice', () => {
    it('should extract data from PDF with text', async () => {
      const filePath = 'test/fixtures/invoice_with_text.pdf';
      const result = await extractionService.processInvoice(filePath, tenantId);

      expect(result.status).toBe('SUCCESS');
      expect(result.extractedData.vendorName).toBeDefined();
      expect(result.extractedData.totalAmount).toBeGreaterThan(0);
    });

    it('should OCR PDF without text', async () => {
      const filePath = 'test/fixtures/invoice_scanned.pdf';
      const result = await extractionService.processInvoice(filePath, tenantId);

      expect(result.ocrText).toBeDefined();
      expect(result.ocrText.length).toBeGreaterThan(50);
    });

    it('should set needsReview on low confidence', async () => {
      jest.spyOn(ollamaService, 'extract').mockResolvedValue({
        vendorName: 'Test',
        totalAmount: 100,
        currency: 'USD',
        confidence: { vendorName: 0.5, totalAmount: 0.6, currency: 0.9 }
      });

      const result = await extractionService.processInvoice(filePath, tenantId);
      expect(result.needsReview).toBe(true);
    });

    it('should handle OCR failure gracefully', async () => {
      jest.spyOn(ocrService, 'extractText').mockRejectedValue(new Error('OCR failed'));

      const result = await extractionService.processInvoice(filePath, tenantId);
      expect(result.status).toBe('ERROR');
      expect(result.errorMessage).toContain('OCR failed');
    });
  });

  describe('vendor matching', () => {
    it('should match exact vendor name', async () => {
      await vendorsService.create(tenantId, { name: 'Acme Corp' });
      const matched = await vendorMatcher.match('Acme Corp', tenantId);
      expect(matched.isNew).toBe(false);
    });

    it('should match fuzzy vendor name', async () => {
      await vendorsService.create(tenantId, { name: 'Acme Corp' });
      const matched = await vendorMatcher.match('Acme Crop', tenantId);  // Typo
      expect(matched.isNew).toBe(false);
      expect(matched.name).toBe('Acme Corp');
    });

    it('should create new vendor if no match', async () => {
      const matched = await vendorMatcher.match('New Vendor', tenantId);
      expect(matched.isNew).toBe(true);
      expect(matched.name).toBe('New Vendor');
    });
  });
});
```

#### Analytics Service (`backend/test/analytics/analytics.service.spec.ts`)

```typescript
describe('AnalyticsService', () => {
  beforeEach(async () => {
    // Seed test data
    await seedInvoices(tenantId, [
      { vendorId: vendor1, amount: 1000, date: '2026-01-15' },
      { vendorId: vendor1, amount: 1200, date: '2025-12-15' },
      { vendorId: vendor2, amount: 500, date: '2026-01-10' }
    ]);
  });

  describe('getVendorKPIs', () => {
    it('should compute current month spend', async () => {
      const kpis = await analyticsService.getVendorKPIs(tenantId, vendor1);
      expect(kpis.currentMonthSpend).toBe(1000);
    });

    it('should compute monthly average', async () => {
      const kpis = await analyticsService.getVendorKPIs(tenantId, vendor1);
      expect(kpis.monthlyAverage).toBe(1100);  // (1000 + 1200) / 2
    });

    it('should compute limit utilization', async () => {
      await vendorsService.update(tenantId, vendor1, { monthlyLimit: 5000 });
      const kpis = await analyticsService.getVendorKPIs(tenantId, vendor1);
      expect(kpis.limitUtilization).toBe(20);  // 1000 / 5000 * 100
    });
  });

  describe('getOverallKPIs', () => {
    it('should compute total spend', async () => {
      const kpis = await analyticsService.getOverallKPIs(tenantId);
      expect(kpis.totalSpend).toBe(1500);  // 1000 + 500
    });

    it('should compute remaining balance', async () => {
      await vendorsService.update(tenantId, vendor1, { monthlyLimit: 5000 });
      await vendorsService.update(tenantId, vendor2, { monthlyLimit: 2000 });

      const kpis = await analyticsService.getOverallKPIs(tenantId);
      expect(kpis.remainingBalance).toBe(5500);  // 7000 - 1500
    });
  });
});
```

#### Insights Service (`backend/test/insights/insights.service.spec.ts`)

```typescript
describe('InsightsService', () => {
  describe('generateMonthlyNarrative', () => {
    it('should compute correct metrics', async () => {
      const metrics = await insightsService.computeMonthlyNarrativeMetrics(tenantId);
      expect(metrics.currentMonthSpend).toBe(1500);
      expect(metrics.previousMonthSpend).toBe(1200);
      expect(metrics.changePercent).toBeCloseTo(25.0, 1);
    });

    it('should generate narrative from metrics', async () => {
      const insight = await insightsService.generateMonthlyNarrative(tenantId);
      expect(insight.content).toContain('25');  // Change percentage
      expect(insight.relatedMetrics.currentMonthSpend).toBe(1500);
    });

    it('should not hallucinate numbers', async () => {
      const insight = await insightsService.generateMonthlyNarrative(tenantId);
      const narrative = insight.content;
      const metrics = insight.relatedMetrics;

      // Verify LLM didn't invent numbers
      const numbersInNarrative = narrative.match(/\d+(\.\d+)?/g);
      numbersInNarrative.forEach(num => {
        const numValue = parseFloat(num);
        const isInMetrics = Object.values(metrics).some(v =>
          typeof v === 'number' && Math.abs(v - numValue) < 0.1
        );
        expect(isInMetrics).toBe(true);
      });
    });
  });

  describe('generateRecurringCharges', () => {
    it('should detect monthly recurring patterns', async () => {
      // Seed 6 months of same vendor + amount
      for (let i = 0; i < 6; i++) {
        await invoicesService.create(tenantId, {
          vendorId: vendor1,
          amount: 9.99,
          date: new Date(2026, 0 - i, 15)
        });
      }

      const metrics = await insightsService.computeRecurringChargesMetrics(tenantId);
      expect(metrics.detected).toHaveLength(1);
      expect(metrics.detected[0].vendor).toBe('Spotify');
      expect(metrics.detected[0].frequency).toBe('monthly');
      expect(metrics.detected[0].confidence).toBeGreaterThan(0.9);
    });
  });

  describe('generateAnomalies', () => {
    it('should detect duplicate invoices', async () => {
      await invoicesService.create(tenantId, { vendorId: vendor1, amount: 150, date: '2026-01-15' });
      await invoicesService.create(tenantId, { vendorId: vendor1, amount: 150, date: '2026-01-15' });

      const metrics = await insightsService.computeAnomaliesMetrics(tenantId);
      const duplicates = metrics.items.filter(i => i.category === 'duplicate');
      expect(duplicates).toHaveLength(1);
    });

    it('should detect spending spikes', async () => {
      // Normal spending
      await invoicesService.create(tenantId, { vendorId: vendor1, amount: 200, date: '2025-12-15' });
      await invoicesService.create(tenantId, { vendorId: vendor1, amount: 220, date: '2025-11-15' });

      // Spike
      await invoicesService.create(tenantId, { vendorId: vendor1, amount: 2500, date: '2026-01-15' });

      const metrics = await insightsService.computeAnomaliesMetrics(tenantId);
      const spikes = metrics.items.filter(i => i.category === 'spike');
      expect(spikes).toHaveLength(1);
      expect(spikes[0].multiplier).toBeGreaterThan(10);
    });
  });
});
```

### Frontend Unit Tests

#### Auth Notifier (`frontend/test/features/auth/auth_notifier_test.dart`)

```dart
void main() {
  group('AuthNotifier', () {
    late AuthNotifier notifier;
    late MockAuthRepository mockRepo;

    setUp(() {
      mockRepo = MockAuthRepository();
      notifier = AuthNotifier(mockRepo);
    });

    test('should login successfully', () async {
      when(mockRepo.login(any, any)).thenAnswer((_) async => Right(testUser));

      await notifier.login('user@example.com', 'password');

      expect(notifier.state.user, equals(testUser));
      expect(notifier.state.isAuthenticated, isTrue);
    });

    test('should handle login failure', () async {
      when(mockRepo.login(any, any)).thenAnswer((_) async => Left(ServerFailure()));

      await notifier.login('user@example.com', 'wrong');

      expect(notifier.state.user, isNull);
      expect(notifier.state.error, isNotNull);
    });

    test('should logout and clear state', () async {
      notifier.state = AuthState(user: testUser, isAuthenticated: true);

      await notifier.logout();

      expect(notifier.state.user, isNull);
      expect(notifier.state.isAuthenticated, isFalse);
    });
  });
}
```

---

## Integration Tests

### Backend Integration Tests

#### Auth Flow (`backend/test/e2e/auth.e2e-spec.ts`)

```typescript
describe('Auth E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it('should complete signup → login → access protected route', async () => {
    // Signup
    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        fullName: 'Test User',
        systemCurrency: 'USD'
      })
      .expect(201);

    expect(signupRes.body.accessToken).toBeDefined();
    const token = signupRes.body.accessToken;

    // Access protected route
    const profileRes = await request(app.getHttpServer())
      .get('/settings/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(profileRes.body.email).toBe('test@example.com');
  });

  it('should reject access without token', async () => {
    await request(app.getHttpServer())
      .get('/vendors')
      .expect(401);
  });
});
```

#### Upload Pipeline (`backend/test/e2e/upload-pipeline.e2e-spec.ts`)

```typescript
describe('Upload Pipeline E2E', () => {
  let app: INestApplication;
  let token: string;
  let tenantId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const auth = await createTestUser(app);
    token = auth.token;
    tenantId = auth.userId;
  });

  it('should upload PDF invoice and extract data', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', 'test/fixtures/sample_invoice.pdf')
      .expect(201);

    expect(res.body.invoice).toBeDefined();
    expect(res.body.vendor).toBeDefined();
    expect(res.body.extraction.status).toBe('SUCCESS');
    expect(res.body.extraction.confidence.totalAmount).toBeGreaterThan(0.7);
  });

  it('should create vendor if not exists', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', 'test/fixtures/new_vendor_invoice.pdf')
      .expect(201);

    expect(res.body.vendor.isNew).toBe(true);
  });

  it('should handle Hebrew invoice', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', 'test/fixtures/invoice_hebrew.pdf')
      .expect(201);

    expect(res.body.extraction.status).toBe('SUCCESS');
  });
});
```

#### Tenant Isolation (`backend/test/e2e/tenant-isolation.e2e-spec.ts`)

```typescript
describe('Tenant Isolation E2E', () => {
  let app: INestApplication;
  let tenant1Token: string;
  let tenant2Token: string;
  let tenant1VendorId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const user1 = await createTestUser(app);
    const user2 = await createTestUser(app);
    tenant1Token = user1.token;
    tenant2Token = user2.token;

    // Create vendor for tenant1
    const vendorRes = await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', `Bearer ${tenant1Token}`)
      .send({ name: 'Tenant1 Vendor' })
      .expect(201);
    tenant1VendorId = vendorRes.body.id;
  });

  it('should not allow tenant2 to access tenant1 vendor', async () => {
    await request(app.getHttpServer())
      .get(`/vendors/${tenant1VendorId}`)
      .set('Authorization', `Bearer ${tenant2Token}`)
      .expect(404);  // Not found (not unauthorized, to avoid leaking existence)
  });

  it('should not allow tenant2 to update tenant1 vendor', async () => {
    await request(app.getHttpServer())
      .patch(`/vendors/${tenant1VendorId}`)
      .set('Authorization', `Bearer ${tenant2Token}`)
      .send({ name: 'Hacked Name' })
      .expect(404);
  });

  it('should not allow tenant2 to delete tenant1 vendor', async () => {
    await request(app.getHttpServer())
      .delete(`/vendors/${tenant1VendorId}`)
      .set('Authorization', `Bearer ${tenant2Token}`)
      .expect(404);
  });

  it('should return only tenant\'s own data in list endpoints', async () => {
    const res = await request(app.getHttpServer())
      .get('/vendors')
      .set('Authorization', `Bearer ${tenant2Token}`)
      .expect(200);

    expect(res.body.every(v => v.id !== tenant1VendorId)).toBe(true);
  });
});
```

---

## Smoke Tests

### Manual Smoke Test Checklist

**Objective**: Verify complete user journey works end-to-end

#### Test Scenario: New User Onboarding

1. **Signup**
   - [ ] Navigate to welcome screen
   - [ ] Click "Sign Up"
   - [ ] Fill form: name, email, password, currency (USD)
   - [ ] Submit → redirected to Home
   - [ ] Verify empty state displayed

2. **Upload Invoice**
   - [ ] Click "Upload an Invoice"
   - [ ] Select sample PDF invoice
   - [ ] Wait for processing (< 30s)
   - [ ] Verify success snackbar
   - [ ] Verify invoice appears under vendor

3. **View Analytics**
   - [ ] Click on vendor card
   - [ ] Verify KPIs displayed
   - [ ] Verify charts rendered
   - [ ] Click "Export" → CSV downloads

4. **Generate Insights**
   - [ ] Navigate to Insights section
   - [ ] Click "Generate Insights"
   - [ ] Wait for generation (< 10s)
   - [ ] Verify insights displayed

5. **Logout and Login**
   - [ ] Click logout
   - [ ] Redirected to welcome screen
   - [ ] Login with same credentials
   - [ ] Verify data persisted

**Expected Duration**: < 5 minutes

---

## Test Data Fixtures

### Sample Invoices

Location: `backend/test/fixtures/`

- `invoice_with_text.pdf` - PDF with selectable text (English)
- `invoice_scanned.pdf` - Scanned PDF requiring OCR (English)
- `invoice_hebrew.pdf` - Hebrew invoice
- `invoice_mixed.pdf` - Hebrew + English mixed
- `invoice_low_quality.jpg` - Low quality image (tests OCR limits)

### Seed Data

```typescript
// backend/test/helpers/seed.ts
export async function seedTestData(tenantId: string) {
  const vendors = await Promise.all([
    createVendor(tenantId, 'AWS', 5000),
    createVendor(tenantId, 'Spotify', 100),
    createVendor(tenantId, 'Office Depot', 1000)
  ]);

  const invoices = [
    { vendorId: vendors[0].id, amount: 450, currency: 'USD', date: '2026-01-15' },
    { vendorId: vendors[0].id, amount: 420, currency: 'USD', date: '2025-12-15' },
    { vendorId: vendors[1].id, amount: 9.99, currency: 'USD', date: '2026-01-01' },
    { vendorId: vendors[1].id, amount: 9.99, currency: 'USD', date: '2025-12-01' },
    { vendorId: vendors[2].id, amount: 150, currency: 'USD', date: '2026-01-10' }
  ];

  await Promise.all(invoices.map(i => createInvoice(tenantId, i)));
}
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Test

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm ci
      - run: cd backend && npm run test:unit
      - run: cd backend && npm run test:e2e

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
      - run: cd frontend && flutter pub get
      - run: cd frontend && flutter test
```

---

## Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Backend Services | 80% |
| Backend Controllers | 70% |
| Frontend UseCases | 80% |
| Frontend Notifiers | 75% |
| Frontend Widgets | 60% |

---

## Summary

**Total Test Files**: ~30
**Unit Tests**: ~150
**Integration Tests**: ~20
**Smoke Tests**: 1 comprehensive scenario
**Test Execution Time**: < 2 minutes (unit + integration)
