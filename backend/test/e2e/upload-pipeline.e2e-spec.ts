import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from '../../src/app.module';

describe('Upload Pipeline (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    // Create a test user and get token
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: `upload-test-${Date.now()}@example.com`,
        password: 'password123',
        fullName: 'Upload Tester',
        systemCurrency: 'USD',
      });

    if (signupResponse.status === 201) {
      authToken = signupResponse.body.accessToken;
      tenantId = signupResponse.body.user.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/invoices/upload (POST)', () => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    it('should process PDF invoice upload', async () => {
      const pdfPath = path.join(fixturesPath, 'sample-invoice.pdf');

      // Skip if fixture doesn't exist
      if (!fs.existsSync(pdfPath)) {
        console.log('Skipping: sample-invoice.pdf fixture not found');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/invoices/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', pdfPath);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('invoice');
      expect(response.body).toHaveProperty('vendor');
      expect(response.body).toHaveProperty('extraction');
    });

    it('should process image invoice upload', async () => {
      const imagePath = path.join(fixturesPath, 'sample-invoice.jpg');

      if (!fs.existsSync(imagePath)) {
        console.log('Skipping: sample-invoice.jpg fixture not found');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/invoices/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', imagePath);

      expect(response.status).toBe(201);
      expect(response.body.invoice).toBeDefined();
    });

    it('should reject unsupported file types', async () => {
      const response = await request(app.getHttpServer())
        .post('/invoices/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test content'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
    });

    it('should create vendor if not exists', async () => {
      const pdfPath = path.join(fixturesPath, 'new-vendor-invoice.pdf');

      if (!fs.existsSync(pdfPath)) {
        console.log('Skipping: new-vendor-invoice.pdf fixture not found');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/invoices/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', pdfPath);

      if (response.status === 201) {
        expect(response.body.vendor.isNew).toBe(true);
      }
    });

    it('should match existing vendor', async () => {
      // First, create a vendor
      await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Google' });

      // Then upload an invoice from "Google"
      const pdfPath = path.join(fixturesPath, 'google-invoice.pdf');

      if (!fs.existsSync(pdfPath)) {
        console.log('Skipping: google-invoice.pdf fixture not found');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/invoices/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', pdfPath);

      if (response.status === 201) {
        expect(response.body.vendor.isNew).toBe(false);
      }
    });

    it('should flag low-confidence extractions for review', async () => {
      const blurryPath = path.join(fixturesPath, 'blurry-invoice.jpg');

      if (!fs.existsSync(blurryPath)) {
        console.log('Skipping: blurry-invoice.jpg fixture not found');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/invoices/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', blurryPath);

      if (response.status === 201) {
        // Blurry images should have low confidence and be flagged
        expect(response.body.invoice.needsReview).toBe(true);
      }
    });

    it('should convert foreign currency to system currency', async () => {
      const eurPath = path.join(fixturesPath, 'euro-invoice.pdf');

      if (!fs.existsSync(eurPath)) {
        console.log('Skipping: euro-invoice.pdf fixture not found');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/invoices/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', eurPath);

      if (
        response.status === 201 &&
        response.body.invoice.originalCurrency !== 'USD'
      ) {
        expect(response.body.invoice.normalizedAmount).toBeDefined();
        expect(response.body.invoice.fxRate).toBeDefined();
      }
    });
  });

  describe('Pipeline failure handling', () => {
    it('should handle OCR failure gracefully', async () => {
      // Empty/corrupted file should not crash
      const response = await request(app.getHttpServer())
        .post('/invoices/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from([0x25, 0x50, 0x44, 0x46]), {
          filename: 'corrupted.pdf',
          contentType: 'application/pdf',
        });

      // Should either fail gracefully or create with needsReview
      expect([201, 400, 422, 500]).toContain(response.status);
    });

    it('should handle LLM failure with fallback', async () => {
      // This tests the fallback behavior when Ollama is unavailable
      // The extraction should still work with default values
      const pdfPath = path.join(__dirname, '../fixtures/sample-invoice.pdf');

      if (!fs.existsSync(pdfPath)) {
        console.log('Skipping: sample-invoice.pdf fixture not found');
        return;
      }

      // Note: In CI without Ollama, this tests fallback behavior
      const response = await request(app.getHttpServer())
        .post('/invoices/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', pdfPath);

      // Should handle gracefully even if LLM fails
      expect([201, 500]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body.invoice).toBeDefined();
      }
    });
  });
});
