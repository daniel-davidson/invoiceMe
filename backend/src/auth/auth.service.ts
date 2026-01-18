import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const supabaseUrl = this.configService.get<string>('supabase.url') || '';
    const supabaseKey = this.configService.get<string>('supabase.anonKey') || '';

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async signUp(signupDto: SignupDto) {
    const { email, password, fullName, personalBusinessId, systemCurrency } = signupDto;

    // Sign up with Supabase
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('already registered')) {
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

    return {
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresIn: data.session?.expires_in,
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
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!data.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Fetch user details from our database
    const user = await this.prisma.user.findUnique({
      where: { id: data.user.id },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresIn: data.session?.expires_in,
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
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      throw new UnauthorizedException('Failed to sign out');
    }

    return { message: 'Successfully signed out' };
  }

  async refreshToken(refreshToken: string) {
    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresIn: data.session?.expires_in,
    };
  }
}
