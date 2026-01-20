import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // For JWKS-based verification (new system), secret is not needed here
        // The JwtStrategy handles verification via JWKS endpoint
        // For legacy system, we use the JWT secret
        const jwtSecret = configService.get<string>('supabase.jwtSecret');
        const jwksUrl = configService.get<string>('supabase.jwksUrl');

        return {
          // Only set secret for legacy system; for JWKS, passport-jwt handles it
          secret: jwksUrl ? undefined : jwtSecret || '',
          // Note: We rely on Supabase's token expiration, not our own
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
