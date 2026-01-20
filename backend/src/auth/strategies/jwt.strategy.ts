/**
 * Docs Verified: Supabase JWT & JWKS Integration
 * - JWT docs: https://supabase.com/docs/guides/auth/jwts
 * - JWKS docs: https://supabase.com/docs/guides/auth/signing-keys
 * - passport-jwt: https://www.npmjs.com/package/passport-jwt
 * - jwks-rsa: https://www.npmjs.com/package/jwks-rsa
 * - Verified on: 2026-01-19
 * - SDK: passport-jwt ^4.0.1, jwks-rsa ^3.1.0
 */
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
  StrategyOptionsWithoutRequest,
} from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';

/**
 * Build JWT strategy options based on configuration
 * Must be a static function called before super()
 */
function buildJwtOptions(
  configService: ConfigService,
): StrategyOptionsWithoutRequest {
  const jwksUrl = configService.get<string>('supabase.jwksUrl');
  const jwtSecret = configService.get<string>('supabase.jwtSecret');

  // New system: Asymmetric JWT verification via JWKS
  if (jwksUrl) {
    console.log(
      '🔐 JWT Strategy: Using JWKS endpoint for asymmetric verification',
    );
    return {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: jwksUrl,
      }),
      algorithms: ['RS256', 'ES256'],
    };
  }

  // Legacy system: Symmetric JWT verification
  if (jwtSecret) {
    console.log('🔐 JWT Strategy: Using symmetric JWT secret');
    return {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      algorithms: ['HS256'],
    };
  }

  // Fallback: No JWT verification configured
  console.warn('⚠️  WARNING: No SUPABASE_JWKS_URL or JWT_SECRET configured!');
  return {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: false,
    secretOrKey: 'fallback-secret-not-for-production',
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    super(buildJwtOptions(configService));
  }

  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload: missing sub');
    }

    // Extract tenant ID from Supabase JWT sub claim
    return {
      sub: payload.sub,
      tenantId: payload.sub, // tenantId = userId for B2C multi-tenancy
      email: payload.email,
      role: payload.role || 'authenticated',
      aud: payload.aud,
    };
  }
}
