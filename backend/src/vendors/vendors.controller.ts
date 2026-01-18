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
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { Tenant } from '../common/decorators/tenant.decorator';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { ReorderVendorsDto } from './dto/reorder-vendors.dto';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  async findAll(
    @Tenant() tenantId: string,
    @Query('includeInvoiceCount') includeInvoiceCount?: string,
  ) {
    return this.vendorsService.findAll(
      tenantId,
      includeInvoiceCount === 'true',
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
