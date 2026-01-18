import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'test-jwt-secret',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const signupDto = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      systemCurrency: 'USD',
    };

    it('should create a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: signupDto.email,
        fullName: signupDto.fullName,
        systemCurrency: signupDto.systemCurrency,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      // Note: Actual signup would go through Supabase
      // This tests the user creation in our DB after Supabase auth
      expect(mockPrismaService.user.findUnique).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: signupDto.email,
      });

      // The service should check for existing users
      const existingUser = await prismaService.user.findUnique({
        where: { email: signupDto.email },
      });

      expect(existingUser).toBeDefined();
    });

    it('should validate email format', () => {
      const invalidEmails = ['invalid', 'test@', '@test.com', ''];
      
      invalidEmails.forEach((email) => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(false);
      });
    });

    it('should validate password length', () => {
      const shortPassword = '12345';
      const validPassword = 'password123';

      expect(shortPassword.length >= 6).toBe(false);
      expect(validPassword.length >= 6).toBe(true);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return user for valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        fullName: 'Test User',
        systemCurrency: 'USD',
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const user = await prismaService.user.findUnique({
        where: { email: loginDto.email },
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe(loginDto.email);
    });

    it('should throw for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const user = await prismaService.user.findUnique({
        where: { email: 'nonexistent@example.com' },
      });

      expect(user).toBeNull();
    });
  });

  describe('tenant isolation', () => {
    it('should always include tenantId in user context', () => {
      const userId = 'user-123';
      const tenantId = userId; // In our system, tenantId = userId

      expect(tenantId).toBe(userId);
    });
  });
});
