import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('export')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('invoices')
  async exportInvoices(
    @Tenant() tenantId: string,
    @Query('vendorId') vendorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportService.exportInvoices(
      tenantId,
      vendorId,
      startDate,
      endDate,
    );

    const filename = `invoices_${new Date().toISOString().split('T')[0]}.csv`;

    if (res) {
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      res.send(csv);
    }
  }

  @Get('analytics')
  async exportAnalytics(
    @Tenant() tenantId: string,
    @Query('vendorId') vendorId?: string,
    @Query('year') year?: number,
    @Res() res?: Response,
  ) {
    const csv = await this.exportService.exportAnalytics(tenantId, vendorId, year);

    const filename = `analytics_${new Date().toISOString().split('T')[0]}.csv`;

    if (res) {
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      res.send(csv);
    }
  }
}
