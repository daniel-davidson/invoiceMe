import { Controller, Get, Patch, Param, Body, ParseUUIDPipe, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('vendor/:vendorId')
  async getVendorAnalytics(
    @Tenant() tenantId: string,
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('year') year?: number,
  ) {
    return this.analyticsService.getVendorAnalytics(tenantId, vendorId);
  }

  @Get('overall')
  async getOverallAnalytics(
    @Tenant() tenantId: string,
    @Query('year') year?: number,
  ) {
    return this.analyticsService.getOverallAnalytics(tenantId);
  }

  @Patch('vendor/:vendorId/limit')
  async updateVendorLimit(
    @Tenant() tenantId: string,
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Body() body: { monthlyLimit: number | null },
  ) {
    return this.analyticsService.updateVendorLimit(tenantId, vendorId, body.monthlyLimit);
  }
}
