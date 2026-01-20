import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../../src/analytics/analytics.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const tenantId = 'tenant-123';
  const vendorId = 'vendor-123';

  const mockPrismaService = {
    vendor: {
      findFirst: jest.fn(),
      aggregate: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVendorAnalytics', () => {
    it('should return KPIs for vendor', async () => {
      mockPrismaService.vendor.findFirst.mockResolvedValue({
        id: vendorId,
        tenantId,
        name: 'Test Vendor',
        monthlyLimit: new Decimal(1000),
      });

      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { normalizedAmount: new Decimal(500) },
      });

      const result = await service.getVendorAnalytics(tenantId, vendorId);

      expect(result.vendorName).toBe('Test Vendor');
      expect(result.kpis).toBeDefined();
      expect(result.kpis.currentMonthSpend).toBeDefined();
    });

    it('should calculate monthly average correctly', async () => {
      mockPrismaService.vendor.findFirst.mockResolvedValue({
        id: vendorId,
        tenantId,
        name: 'Test Vendor',
        monthlyLimit: null,
      });

      // 12 months total: 1200 → average = 100
      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { normalizedAmount: new Decimal(100) } }) // current month
        .mockResolvedValueOnce({
          _sum: { normalizedAmount: new Decimal(1200) },
        }) // last 12 months
        .mockResolvedValueOnce({
          _sum: { normalizedAmount: new Decimal(800) },
        }); // yearly

      const result = await service.getVendorAnalytics(tenantId, vendorId);

      expect(result.kpis.monthlyAverage).toBe(100); // 1200 / 12
    });

    it('should calculate limit utilization percentage', async () => {
      mockPrismaService.vendor.findFirst.mockResolvedValue({
        id: vendorId,
        tenantId,
        name: 'Test Vendor',
        monthlyLimit: new Decimal(1000),
      });

      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { normalizedAmount: new Decimal(500) },
      });

      const result = await service.getVendorAnalytics(tenantId, vendorId);

      expect(result.kpis.limitUtilization).toBe(50); // 500/1000 * 100
    });

    it('should throw NotFoundException for wrong tenant', async () => {
      mockPrismaService.vendor.findFirst.mockResolvedValue(null);

      await expect(
        service.getVendorAnalytics('other-tenant', vendorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return line chart data with 12 months', async () => {
      mockPrismaService.vendor.findFirst.mockResolvedValue({
        id: vendorId,
        tenantId,
        name: 'Test',
        monthlyLimit: null,
      });
      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { normalizedAmount: new Decimal(100) },
      });

      const result = await service.getVendorAnalytics(tenantId, vendorId);

      expect(result.lineChart.labels).toHaveLength(12);
      expect(result.lineChart.datasets[0].data).toHaveLength(12);
    });
  });

  describe('getOverallAnalytics', () => {
    it('should return aggregated KPIs for all vendors', async () => {
      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { normalizedAmount: new Decimal(5000) },
      });
      mockPrismaService.vendor.aggregate.mockResolvedValue({
        _sum: { monthlyLimit: new Decimal(10000) },
      });
      mockPrismaService.vendor.count = jest.fn().mockResolvedValue(5);
      mockPrismaService.invoice.count.mockResolvedValue(50);
      mockPrismaService.invoice.groupBy.mockResolvedValue([
        { vendorId: 'v1', _sum: { normalizedAmount: new Decimal(2000) } },
        { vendorId: 'v2', _sum: { normalizedAmount: new Decimal(1500) } },
      ]);
      mockPrismaService.vendor.findMany = jest.fn().mockResolvedValue([
        { id: 'v1', name: 'Google' },
        { id: 'v2', name: 'Apple' },
      ]);

      const result = await service.getOverallAnalytics(tenantId);

      expect(result.kpis.totalSpend).toBeDefined();
      expect(result.kpis.remainingBalance).toBeDefined();
    });

    it('should calculate remaining balance correctly', async () => {
      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { normalizedAmount: new Decimal(3000) },
      });
      mockPrismaService.vendor.aggregate.mockResolvedValue({
        _sum: { monthlyLimit: new Decimal(5000) },
      });
      mockPrismaService.vendor.count = jest.fn().mockResolvedValue(2);
      mockPrismaService.invoice.count.mockResolvedValue(10);
      mockPrismaService.invoice.groupBy.mockResolvedValue([]);
      mockPrismaService.vendor.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getOverallAnalytics(tenantId);

      expect(result.kpis.remainingBalance).toBe(2000); // 5000 - 3000
    });

    it('should return top 5 vendors by spend', async () => {
      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { normalizedAmount: new Decimal(10000) },
      });
      mockPrismaService.vendor.aggregate.mockResolvedValue({
        _sum: { monthlyLimit: new Decimal(15000) },
      });
      mockPrismaService.vendor.count = jest.fn().mockResolvedValue(10);
      mockPrismaService.invoice.count.mockResolvedValue(100);
      mockPrismaService.invoice.groupBy.mockResolvedValue([
        { vendorId: 'v1', _sum: { normalizedAmount: new Decimal(3000) } },
        { vendorId: 'v2', _sum: { normalizedAmount: new Decimal(2500) } },
        { vendorId: 'v3', _sum: { normalizedAmount: new Decimal(2000) } },
        { vendorId: 'v4', _sum: { normalizedAmount: new Decimal(1500) } },
        { vendorId: 'v5', _sum: { normalizedAmount: new Decimal(1000) } },
      ]);
      mockPrismaService.vendor.findMany = jest.fn().mockResolvedValue([
        { id: 'v1', name: 'Google' },
        { id: 'v2', name: 'Apple' },
        { id: 'v3', name: 'Amazon' },
        { id: 'v4', name: 'Microsoft' },
        { id: 'v5', name: 'Netflix' },
      ]);

      const result = await service.getOverallAnalytics(tenantId);

      expect(result.pieChart.segments).toHaveLength(5);
    });
  });

  describe('updateVendorLimit', () => {
    it('should update monthly limit for vendor', async () => {
      mockPrismaService.vendor.findFirst.mockResolvedValue({
        id: vendorId,
        tenantId,
      });
      mockPrismaService.vendor.update.mockResolvedValue({
        id: vendorId,
        monthlyLimit: new Decimal(2000),
      });

      const result = await service.updateVendorLimit(tenantId, vendorId, 2000);

      expect(mockPrismaService.vendor.update).toHaveBeenCalledWith({
        where: { id: vendorId },
        data: { monthlyLimit: 2000 },
      });
    });

    it('should allow null to remove limit', async () => {
      mockPrismaService.vendor.findFirst.mockResolvedValue({
        id: vendorId,
        tenantId,
      });
      mockPrismaService.vendor.update.mockResolvedValue({
        id: vendorId,
        monthlyLimit: null,
      });

      await service.updateVendorLimit(tenantId, vendorId, null);

      expect(mockPrismaService.vendor.update).toHaveBeenCalledWith({
        where: { id: vendorId },
        data: { monthlyLimit: null },
      });
    });

    it('should throw NotFoundException for wrong tenant', async () => {
      mockPrismaService.vendor.findFirst.mockResolvedValue(null);

      await expect(
        service.updateVendorLimit('other-tenant', vendorId, 1000),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('tenant isolation', () => {
    it('should always filter by tenantId', async () => {
      mockPrismaService.vendor.findFirst.mockResolvedValue({
        id: vendorId,
        tenantId,
        name: 'Test',
        monthlyLimit: null,
      });
      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { normalizedAmount: null },
      });

      await service.getVendorAnalytics(tenantId, vendorId);

      expect(mockPrismaService.vendor.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });
  });
});
