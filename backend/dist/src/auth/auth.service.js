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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    configService;
    prisma;
    supabase;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        const supabaseUrl = this.configService.get('supabase.url') || '';
        const supabaseKey = this.configService.get('supabase.anonKey') || '';
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    async signUp(signupDto) {
        const { email, password, fullName, personalBusinessId, systemCurrency } = signupDto;
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
        });
        if (error) {
            if (error.message.includes('already registered')) {
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
    async signIn(loginDto) {
        const { email, password } = loginDto;
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!data.user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: data.user.id },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
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
    async signOut(accessToken) {
        const { error } = await this.supabase.auth.signOut();
        if (error) {
            throw new common_1.UnauthorizedException('Failed to sign out');
        }
        return { message: 'Successfully signed out' };
    }
    async refreshToken(refreshToken) {
        const { data, error } = await this.supabase.auth.refreshSession({
            refresh_token: refreshToken,
        });
        if (error) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        return {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
            expiresIn: data.session?.expires_in,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map