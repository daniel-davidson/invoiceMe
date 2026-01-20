/**
 * Tenant Isolation E2E Test
 *
 * Verifies that users cannot access each other's data across the API.
 *
 * Test Scenario:
 * 1. Create 2 test users (Tenant A & Tenant B)
 * 2. Each tenant creates vendors and uploads invoices
 * 3. Verify Tenant A cannot access Tenant B's data (and vice versa)
 * 4. Verify analytics are properly isolated
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Tenant Isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test user IDs (mock tenantIds)
  const tenantA = 'test-tenant-a-' + Date.now();
  const tenantB = 'test-tenant-b-' + Date.now();

  // Auth tokens (for testing, these would be JWT tokens)
  let tokenA: string;
  let tokenB: string;

  // Created resource IDs
  let vendorAId: string;
  let vendorBId: string;
  let invoiceAId: string;
  let invoiceBId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test users
    await prisma.user.create({
      data: {
        id: tenantA,
        email: `tenant-a-${Date.now()}@test.com`,
        fullName: 'Tenant A',
        systemCurrency: 'USD',
      },
    });

    await prisma.user.create({
      data: {
        id: tenantB,
        email: `tenant-b-${Date.now()}@test.com`,
        fullName: 'Tenant B',
        systemCurrency: 'USD',
      },
    });

    // In a real scenario, you'd authenticate and get JWT tokens
    // For this test, we'll mock the tenant ID in requests
    tokenA = `mock-token-${tenantA}`;
    tokenB = `mock-token-${tenantB}`;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    await prisma.invoice.deleteMany({
      where: { tenantId: { in: [tenantA, tenantB] } },
    });

    await prisma.vendor.deleteMany({
      where: { tenantId: { in: [tenantA, tenantB] } },
    });

    await prisma.user.deleteMany({
      where: { id: { in: [tenantA, tenantB] } },
    });

    await app.close();
  });

  describe('Vendor Isolation', () => {
    it('Tenant A can create a vendor', async () => {
      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Vendor A', monthlyLimit: 1000 })
        .expect(201);

      vendorAId = response.body.id;
      expect(response.body.name).toBe('Vendor A');
      expect(response.body.tenantId).toBe(tenantA);
    });

    it('Tenant B can create a vendor', async () => {
      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'Vendor B', monthlyLimit: 2000 })
        .expect(201);

      vendorBId = response.body.id;
      expect(response.body.name).toBe('Vendor B');
      expect(response.body.tenantId).toBe(tenantB);
    });

    it("Tenant A cannot access Tenant B's vendor", async () => {
      await request(app.getHttpServer())
        .get(`/vendors/${vendorBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404); // Not found (due to tenant scoping)
    });

    it("Tenant B cannot access Tenant A's vendor", async () => {
      await request(app.getHttpServer())
        .get(`/vendors/${vendorAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('Tenant A can only see their own vendors', async () => {
      const response = await request(app.getHttpServer())
        .get('/vendors')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(vendorAId);
      expect(response.body[0].name).toBe('Vendor A');
    });

    it('Tenant B can only see their own vendors', async () => {
      const response = await request(app.getHttpServer())
        .get('/vendors')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(vendorBId);
      expect(response.body[0].name).toBe('Vendor B');
    });

    it("Tenant A cannot update Tenant B's vendor", async () => {
      await request(app.getHttpServer())
        .patch(`/vendors/${vendorBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Hacked Vendor B' })
        .expect(404);

      // Verify vendor B is unchanged
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorBId },
      });
      expect(vendor?.name).toBe('Vendor B');
    });

    it("Tenant A cannot delete Tenant B's vendor", async () => {
      await request(app.getHttpServer())
        .delete(`/vendors/${vendorBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      // Verify vendor B still exists
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorBId },
      });
      expect(vendor).not.toBeNull();
    });
  });

  describe('Invoice Isolation', () => {
    beforeAll(async () => {
      // Create test invoices directly in DB (upload API requires file upload)
      const invoiceA = await prisma.invoice.create({
        data: {
          tenantId: tenantA,
          vendorId: vendorAId,
          name: 'Invoice A',
          originalAmount: 500,
          originalCurrency: 'USD',
          invoiceDate: new Date(),
          fileUrl: '/test/invoice-a.pdf',
          needsReview: false,
        },
      });
      invoiceAId = invoiceA.id;

      const invoiceB = await prisma.invoice.create({
        data: {
          tenantId: tenantB,
          vendorId: vendorBId,
          name: 'Invoice B',
          originalAmount: 750,
          originalCurrency: 'USD',
          invoiceDate: new Date(),
          fileUrl: '/test/invoice-b.pdf',
          needsReview: false,
        },
      });
      invoiceBId = invoiceB.id;
    });

    it("Tenant A cannot access Tenant B's invoice", async () => {
      await request(app.getHttpServer())
        .get(`/invoices/${invoiceBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });

    it("Tenant B cannot access Tenant A's invoice", async () => {
      await request(app.getHttpServer())
        .get(`/invoices/${invoiceAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('Tenant A can only see their own invoices', async () => {
      const response = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(invoiceAId);
    });

    it('Tenant B can only see their own invoices', async () => {
      const response = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(invoiceBId);
    });

    it("Tenant A cannot update Tenant B's invoice", async () => {
      await request(app.getHttpServer())
        .patch(`/invoices/${invoiceBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Hacked Invoice B' })
        .expect(404);

      // Verify invoice B is unchanged
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceBId },
      });
      expect(invoice?.name).toBe('Invoice B');
    });

    it("Tenant A cannot delete Tenant B's invoice", async () => {
      await request(app.getHttpServer())
        .delete(`/invoices/${invoiceBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      // Verify invoice B still exists
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceBId },
      });
      expect(invoice).not.toBeNull();
    });
  });

  describe('Analytics Isolation', () => {
    it('Tenant A analytics only includes their data', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/overall')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body.kpis.vendorCount).toBe(1);
      expect(response.body.kpis.invoiceCount).toBe(1);
      // Verify total spend matches only Tenant A's invoice
      expect(response.body.kpis.totalSpend).toBeCloseTo(500, 2);
    });

    it('Tenant B analytics only includes their data', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/overall')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(response.body.kpis.vendorCount).toBe(1);
      expect(response.body.kpis.invoiceCount).toBe(1);
      // Verify total spend matches only Tenant B's invoice
      expect(response.body.kpis.totalSpend).toBeCloseTo(750, 2);
    });

    it("Tenant A cannot access Tenant B's vendor analytics", async () => {
      await request(app.getHttpServer())
        .get(`/analytics/vendor/${vendorBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });

    it("Tenant B cannot access Tenant A's vendor analytics", async () => {
      await request(app.getHttpServer())
        .get(`/analytics/vendor/${vendorAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });
  });

  describe('Search and Filter Isolation', () => {
    it("Tenant A search cannot find Tenant B's data", async () => {
      const response = await request(app.getHttpServer())
        .get('/invoices?search=Invoice B')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it("Tenant B search cannot find Tenant A's data", async () => {
      const response = await request(app.getHttpServer())
        .get('/invoices?search=Invoice A')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it("Filtering by Tenant B's vendorId returns nothing for Tenant A", async () => {
      const response = await request(app.getHttpServer())
        .get(`/invoices?vendorId=${vendorBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });
});
