"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = AuthService_1 = class AuthService {
    configService;
    prisma;
    logger = new common_1.Logger(AuthService_1.name);
    supabase;
    supabaseAdmin = null;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        const supabaseUrl = this.configService.get('supabase.url') || '';
        const clientKey = this.configService.get('supabase.publishableKey') ||
            this.configService.get('supabase.anonKey') ||
            '';
        const adminKey = this.configService.get('supabase.secretKey') ||
            this.configService.get('supabase.serviceRoleKey');
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, clientKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
            },
        });
        if (adminKey) {
            this.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, adminKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                    detectSessionInUrl: false,
                },
            });
        }
        this.logger.log(`Supabase client initialized for ${supabaseUrl}`);
    }
    async signUp(signupDto) {
        const { email, password, fullName, personalBusinessId, systemCurrency } = signupDto;
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
            if (error.message.includes('already registered') ||
                error.message.includes('already exists')) {
                throw new common_1.ConflictException('Email already exists');
            }
            throw new common_1.UnauthorizedException(error.message);
        }
        if (!data.user) {
            throw new common_1.UnauthorizedException('Failed to create user');
        }
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
    async signIn(loginDto) {
        const { email, password } = loginDto;
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            this.logger.warn(`Login failed for ${email}: ${error.message}`);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!data.user || !data.session) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        let user = await this.prisma.user.findUnique({
            where: { id: data.user.id },
        });
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
    async signOut(accessToken) {
        if (this.supabaseAdmin) {
            const { data: userData, error: userError } = await this.supabaseAdmin.auth.getUser(accessToken);
            if (userError || !userData.user) {
                this.logger.warn(`Signout failed - invalid token`);
                throw new common_1.UnauthorizedException('Invalid token');
            }
            this.logger.log(`User signed out: ${userData.user.id}`);
        }
        return { message: 'Successfully signed out' };
    }
    async refreshToken(refreshToken) {
        const { data, error } = await this.supabase.auth.refreshSession({
            refresh_token: refreshToken,
        });
        if (error) {
            this.logger.warn(`Token refresh failed: ${error.message}`);
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (!data.session) {
            throw new common_1.UnauthorizedException('Failed to refresh session');
        }
        return {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresIn: data.session.expires_in,
            expiresAt: data.session.expires_at,
            tokenType: data.session.token_type || 'bearer',
        };
    }
    async verifyToken(accessToken) {
        if (!this.supabaseAdmin) {
            throw new common_1.UnauthorizedException('Admin client not configured');
        }
        const { data, error } = await this.supabaseAdmin.auth.getUser(accessToken);
        if (error || !data.user) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
        return {
            sub: data.user.id,
            email: data.user.email,
            role: data.user.role,
            aud: data.user.aud,
        };
    }
    async getUserById(userId) {
        if (!this.supabaseAdmin) {
            return this.prisma.user.findUnique({ where: { id: userId } });
        }
        const { data, error } = await this.supabaseAdmin.auth.admin.getUserById(userId);
        if (error) {
            this.logger.warn(`Failed to get user ${userId}: ${error.message}`);
            return null;
        }
        return data.user;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map