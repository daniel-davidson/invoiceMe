import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Tenant } from '../common/decorators/tenant.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  async getMe(@Tenant() tenantId: string) {
    return this.usersService.findById(tenantId, tenantId);
  }

  @Patch('me')
  async updateMe(
    @Tenant() tenantId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(tenantId, tenantId, updateUserDto);
  }
}

@Controller('settings')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SettingsController {
  constructor(private readonly usersService: UsersService) { }

  @Get('profile')
  async getProfile(@Tenant() tenantId: string) {
    return this.usersService.findById(tenantId, tenantId);
  }

  @Patch('profile')
  async updateProfile(
    @Tenant() tenantId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(tenantId, tenantId, updateUserDto);
  }

  @Patch('currency')
  async updateCurrency(
    @Tenant() tenantId: string,
    @Body('currency') currency: string,
  ) {
    return this.usersService.updateSystemCurrency(tenantId, tenantId, currency);
  }
}
