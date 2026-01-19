import { Controller, Get, Post, Delete, Param, Query, Body, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Tenant } from '../common/decorators/tenant.decorator';
import { InsightType, GenerateInsightsDto } from './dto/insight.dto';

@Controller('insights')
@UseGuards(JwtAuthGuard, TenantGuard)
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  async findAll(
    @Tenant() tenantId: string,
    @Query('type') type?: InsightType,
    @Query('limit') limit?: number,
  ) {
    return this.insightsService.findAll(tenantId, type, limit || 10);
  }

  @Get(':id')
  async findOne(
    @Tenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.insightsService.findOne(tenantId, id);
  }

  @Post('generate')
  async generate(
    @Tenant() tenantId: string,
    @Body() dto: GenerateInsightsDto,
  ) {
    return this.insightsService.generate(tenantId, dto.types);
  }

  @Delete(':id')
  async remove(
    @Tenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.insightsService.remove(tenantId, id);
  }
}
