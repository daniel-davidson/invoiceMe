/**
 * Docs Verified: Supabase Auth Integration
 * - Official docs: https://supabase.com/docs/reference/javascript/auth-signup
 * - API Keys docs: https://supabase.com/docs/guides/api/api-keys
 * - JWT Signing Keys: https://supabase.com/docs/guides/auth/signing-keys
 * - Verified on: 2026-01-19
 * - SDK: @supabase/supabase-js ^2.49.0
 */
import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const supabaseUrl = this.configService.get<string>('supabase.url') || '';
    
    // Client key for public auth operations (signUp, signIn)
    // Support both new (publishableKey) and legacy (anonKey) key systems
    const clientKey = 
      this.configService.get<string>('supabase.publishableKey') ||
      this.configService.get<string>('supabase.anonKey') || '';

    // Admin key for privileged operations (token verification, user management)
    // Support both new (secretKey) and legacy (serviceRoleKey)
    const adminKey = 
      this.configService.get<string>('supabase.secretKey') ||
      this.configService.get<string>('supabase.serviceRoleKey');

    this.supabase = createClient(supabaseUrl, clientKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    // Create admin client if secret/service role key is available
    if (adminKey) {
      this.supabaseAdmin = createClient(supabaseUrl, adminKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
    }

    this.logger.log(`Supabase client initialized for ${supabaseUrl}`);
  }

  async signUp(signupDto: SignupDto) {
    const { email, password, fullName, personalBusinessId, systemCurrency } = signupDto;

    // Sign up with Supabase Auth
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      this.logger.warn(`Signup failed for ${email}: ${error.message}`);
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        throw new ConflictException('Email already exists');
      }
      throw new UnauthorizedException(error.message);
    }

    if (!data.user) {
      throw new UnauthorizedException('Failed to create user');
    }

    // Create user record in our database
    const user = await this.prisma.user.create({
      data: {
        id: data.user.id,
        email,
        fullName,
        personalBusinessId,
        systemCurrency,
      },
    });

    this.logger.log(`User created: ${user.id}`);

    return {
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresIn: data.session?.expires_in,
      expiresAt: data.session?.expires_at,
      tokenType: data.session?.token_type || 'bearer',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        personalBusinessId: user.personalBusinessId,
        systemCurrency: user.systemCurrency,
        createdAt: user.createdAt,
      },
    };
  }

  async signIn(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      this.logger.warn(`Login failed for ${email}: ${error.message}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!data.user || !data.session) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Fetch user details from our database
    let user = await this.prisma.user.findUnique({
      where: { id: data.user.id },
    });

    // If user doesn't exist in our DB (e.g., created directly in Supabase), create them
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email || email,
          fullName: data.user.user_metadata?.full_name || email.split('@')[0],
          systemCurrency: 'USD',
        },
      });
      this.logger.log(`Created missing user record for: ${user.id}`);
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      expiresAt: data.session.expires_at,
      tokenType: data.session.token_type || 'bearer',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        personalBusinessId: user.personalBusinessId,
        systemCurrency: user.systemCurrency,
        createdAt: user.createdAt,
      },
    };
  }

  async signOut(accessToken: string) {
    // For server-side signout, we need to use the admin client
    // The regular client doesn't have the user's session
    if (this.supabaseAdmin) {
      // Get user from token to invalidate their session
      const { data: userData, error: userError } = await this.supabaseAdmin.auth.getUser(accessToken);
      
      if (userError || !userData.user) {
        this.logger.warn(`Signout failed - invalid token`);
        throw new UnauthorizedException('Invalid token');
      }

      // Note: Supabase v2 doesn't have a server-side "sign out specific user" method
      // The token will expire naturally. For immediate invalidation, you'd need
      // to implement token blacklisting or use Supabase's session management
      this.logger.log(`User signed out: ${userData.user.id}`);
    }

    return { message: 'Successfully signed out' };
  }

  async refreshToken(refreshToken: string) {
    // Create a temporary client with the refresh token
    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      this.logger.warn(`Token refresh failed: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!data.session) {
      throw new UnauthorizedException('Failed to refresh session');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      expiresAt: data.session.expires_at,
      tokenType: data.session.token_type || 'bearer',
    };
  }

  /**
   * Verify a token and get user claims
   * Uses admin client for secure verification
   */
  async verifyToken(accessToken: string) {
    if (!this.supabaseAdmin) {
      throw new UnauthorizedException('Admin client not configured');
    }

    const { data, error } = await this.supabaseAdmin.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      sub: data.user.id,
      email: data.user.email,
      role: data.user.role,
      aud: data.user.aud,
    };
  }

  /**
   * Get user by ID (admin operation)
   */
  async getUserById(userId: string) {
    if (!this.supabaseAdmin) {
      // Fallback to database lookup
      return this.prisma.user.findUnique({ where: { id: userId } });
    }

    const { data, error } = await this.supabaseAdmin.auth.admin.getUserById(userId);

    if (error) {
      this.logger.warn(`Failed to get user ${userId}: ${error.message}`);
      return null;
    }

    return data.user;
  }
}
