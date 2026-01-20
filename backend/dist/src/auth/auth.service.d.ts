import { ConfigService } from '@nestjs/config';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private configService;
    private prisma;
    private readonly logger;
    private supabase;
    private supabaseAdmin;
    constructor(configService: ConfigService, prisma: PrismaService);
    signUp(signupDto: SignupDto): Promise<{
        accessToken: string | undefined;
        refreshToken: string | undefined;
        expiresIn: number | undefined;
        expiresAt: number | undefined;
        tokenType: "bearer";
        user: {
            id: string;
            email: string;
            fullName: string;
            personalBusinessId: string | null;
            systemCurrency: string;
            createdAt: Date;
        };
    }>;
    signIn(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        expiresAt: number | undefined;
        tokenType: "bearer";
        user: {
            id: string;
            email: string;
            fullName: string;
            personalBusinessId: string | null;
            systemCurrency: string;
            createdAt: Date;
        };
    }>;
    signOut(accessToken: string): Promise<{
        message: string;
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        expiresAt: number | undefined;
        tokenType: "bearer";
    }>;
    verifyToken(accessToken: string): Promise<{
        sub: string;
        email: string | undefined;
        role: string | undefined;
        aud: string;
    }>;
    getUserById(userId: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        personalBusinessId: string | null;
        systemCurrency: string;
        createdAt: Date;
        updatedAt: Date;
    } | import("@supabase/supabase-js").AuthUser | null>;
}
