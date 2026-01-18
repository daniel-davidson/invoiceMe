import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import type { RequestWithTenant } from '../common/interfaces/request-with-tenant';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(signupDto: SignupDto): Promise<{
        accessToken: string | undefined;
        refreshToken: string | undefined;
        expiresIn: number | undefined;
        user: {
            id: string;
            email: string;
            fullName: string;
            personalBusinessId: string | null;
            systemCurrency: string;
            createdAt: Date;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: {
            id: string;
            email: string;
            fullName: string;
            personalBusinessId: string | null;
            systemCurrency: string;
            createdAt: Date;
        };
    }>;
    logout(req: RequestWithTenant): Promise<{
        message: string;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string | undefined;
        refreshToken: string | undefined;
        expiresIn: number | undefined;
    }>;
}
