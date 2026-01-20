import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async findById(id: string, tenantId: string) {
    // Verify the user is accessing their own data
    if (id !== tenantId) {
      throw new NotFoundException('User not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      personalBusinessId: user.personalBusinessId,
      systemCurrency: user.systemCurrency,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async update(
    id: string,
    tenantId: string,
    updateData: {
      fullName?: string;
      personalBusinessId?: string;
      systemCurrency?: string;
    },
  ) {
    // Verify the user is updating their own data
    if (id !== tenantId) {
      throw new NotFoundException('User not found');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      personalBusinessId: user.personalBusinessId,
      systemCurrency: user.systemCurrency,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateSystemCurrency(id: string, tenantId: string, currency: string) {
    return this.update(id, tenantId, { systemCurrency: currency });
  }
}
