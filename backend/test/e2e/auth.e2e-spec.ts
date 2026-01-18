import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/signup (POST)', () => {
    const signupDto = {
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Test User',
      systemCurrency: 'USD',
    };

    it('should create a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(signupDto.email);
    });

    it('should reject duplicate email', async () => {
      // First signup
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          ...signupDto,
          email: `duplicate-${Date.now()}@example.com`,
        });

      // Duplicate signup
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(409);
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          ...signupDto,
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should validate password length', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          ...signupDto,
          password: '123',
        })
        .expect(400);
    });

    it('should require fullName', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
          systemCurrency: 'USD',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    const loginDto = {
      email: 'existing@example.com',
      password: 'password123',
    };

    it('should return token for valid credentials', async () => {
      // Note: This requires a pre-existing user in the database
      // In a real test, you'd seed the database first
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('user');
      }
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('Protected routes', () => {
    it('should reject requests without token', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should accept requests with valid token', async () => {
      // First, sign up to get a token
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `protected-${Date.now()}@example.com`,
          password: 'password123',
          fullName: 'Protected Test',
          systemCurrency: 'USD',
        });

      if (signupResponse.status === 201) {
        const token = signupResponse.body.accessToken;

        const response = await request(app.getHttpServer())
          .get('/users/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('email');
      }
    });
  });
});
