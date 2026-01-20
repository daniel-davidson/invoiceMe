import { Controller, Get, Patch, Param, Body, ParseUUIDPipe, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Tenant } from '../common/decorators/tenant.decorator';
import { VendorAnalyticsDto, OverallAnalyticsDto } from './dto/analytics-response.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('vendor/:vendorId')
  async getVendorAnalytics(
    @Tenant() tenantId: string,
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
  ): Promise<VendorAnalyticsDto> {
    return this.analyticsService.getVendorAnalytics(tenantId, vendorId, year, month);
  }

  @Get('vendor/:vendorId/available-periods')
  async getAvailablePeriods(
    @Tenant() tenantId: string,
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ) {
    return this.analyticsService.getAvailablePeriods(tenantId, vendorId);
  }

  @Get('overall')
  async getOverallAnalytics(
    @Tenant() tenantId: string,
    @Query('year') year?: number,
  ): Promise<OverallAnalyticsDto> {
    return this.analyticsService.getOverallAnalytics(tenantId);
  }

  @Patch('vendor/:vendorId/limit')
  async updateVendorLimit(
    @Tenant() tenantId: string,
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Body() body: { monthlyLimit: number }, // v2.0: monthlyLimit required, cannot be null
  ) {
    return this.analyticsService.updateVendorLimit(tenantId, vendorId, body.monthlyLimit);
  }

  @Get('vendor/:vendorId/export')
  async exportVendorCsv(
    @Tenant() tenantId: string,
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.analyticsService.exportVendorCsv(tenantId, vendorId);
    const date = new Date().toISOString().split('T')[0];
    
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="vendor-analytics-${date}.csv"`,
    });
    
    return csv;
  }

  @Get('overall/export')
  async exportOverallCsv(
    @Tenant() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.analyticsService.exportOverallCsv(tenantId);
    const date = new Date().toISOString().split('T')[0];
    
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="overall-analytics-${date}.csv"`,
    });
    
    return csv;
  }
}
