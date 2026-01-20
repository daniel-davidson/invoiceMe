import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string, tenantId: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        personalBusinessId: string | null;
        systemCurrency: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, tenantId: string, updateData: {
        fullName?: string;
        personalBusinessId?: string;
        systemCurrency?: string;
    }): Promise<{
        id: string;
        email: string;
        fullName: string;
        personalBusinessId: string | null;
        systemCurrency: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateSystemCurrency(id: string, tenantId: string, currency: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        personalBusinessId: string | null;
        systemCurrency: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
