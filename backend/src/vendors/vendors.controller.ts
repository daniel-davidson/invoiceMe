import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Tenant } from '../common/decorators/tenant.decorator';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { ReorderVendorsDto } from './dto/reorder-vendors.dto';

@Controller('vendors')
@UseGuards(JwtAuthGuard, TenantGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  async findAll(
    @Tenant() tenantId: string,
    @Query('includeInvoiceCount') includeInvoiceCount?: string,
    @Query('includeLatestInvoices') includeLatestInvoices?: string,
    @Query('search') search?: string,
  ) {
    return this.vendorsService.findAll(
      tenantId,
      includeInvoiceCount === 'true',
      includeLatestInvoices === 'true',
      search,
    );
  }

  @Get(':id')
  async findOne(
    @Tenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vendorsService.findOne(tenantId, id);
  }

  @Post()
  async create(
    @Tenant() tenantId: string,
    @Body() dto: CreateVendorDto,
  ) {
    return this.vendorsService.create(tenantId, dto);
  }

  @Patch(':id')
  async update(
    @Tenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.vendorsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Tenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vendorsService.remove(tenantId, id);
  }

  @Post('reorder')
  async reorder(
    @Tenant() tenantId: string,
    @Body() dto: ReorderVendorsDto,
  ) {
    return this.vendorsService.reorder(tenantId, dto.vendorIds);
  }
}
