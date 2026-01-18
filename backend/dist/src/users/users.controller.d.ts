import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(tenantId: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        personalBusinessId: string | null;
        systemCurrency: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(tenantId: string, updateUserDto: UpdateUserDto): Promise<{
        id: string;
        email: string;
        fullName: string;
        personalBusinessId: string | null;
        systemCurrency: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateCurrency(tenantId: string, currency: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        personalBusinessId: string | null;
        systemCurrency: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
