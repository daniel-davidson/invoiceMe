import { Test, TestingModule } from '@nestjs/testing';
import { InsightsService } from '../../src/insights/insights.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { OllamaService } from '../../src/extraction/llm/ollama.service';
import { NotFoundException } from '@nestjs/common';
import { InsightType } from '../../src/insights/dto/insight.dto';
import { Decimal } from '@prisma/client/runtime/library';

describe('InsightsService', () => {
  let service: InsightsService;

  const tenantId = 'tenant-123';

  const mockPrismaService = {
    insight: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    invoice: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    vendor: {
      findUnique: jest.fn(),
    },
  };

  const mockOllamaService = {
    generate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsightsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OllamaService, useValue: mockOllamaService },
      ],
    }).compile();

    service = module.get<InsightsService>(InsightsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return insights for tenant', async () => {
      const mockInsights = [
        {
          id: 'i1',
          tenantId,
          insightType: InsightType.MONTHLY_NARRATIVE,
          title: 'January Summary',
          content: 'Your spending increased by 10%',
          generatedAt: new Date(),
        },
      ];

      mockPrismaService.insight.findMany.mockResolvedValue(mockInsights);

      const result = await service.findAll(tenantId);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });

    it('should filter by insight type', async () => {
      mockPrismaService.insight.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, InsightType.ANOMALIES);

      expect(mockPrismaService.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            insightType: InsightType.ANOMALIES,
          }),
        }),
      );
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.insight.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, undefined, 5);

      expect(mockPrismaService.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return insight for correct tenant', async () => {
      const mockInsight = {
        id: 'i1',
        tenantId,
        insightType: InsightType.MONTHLY_NARRATIVE,
        title: 'Test',
        content: 'Content',
      };

      mockPrismaService.insight.findFirst.mockResolvedValue(mockInsight);

      const result = await service.findOne(tenantId, 'i1');

      expect(result.id).toBe('i1');
    });

    it('should throw NotFoundException for wrong tenant', async () => {
      mockPrismaService.insight.findFirst.mockResolvedValue(null);

      await expect(service.findOne('other-tenant', 'i1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete insight for correct tenant', async () => {
      mockPrismaService.insight.findFirst.mockResolvedValue({
        id: 'i1',
        tenantId,
      });
      mockPrismaService.insight.delete.mockResolvedValue({});

      const result = await service.remove(tenantId, 'i1');

      expect(result.deleted).toBe(true);
    });

    it('should throw NotFoundException for wrong tenant', async () => {
      mockPrismaService.insight.findFirst.mockResolvedValue(null);

      await expect(service.remove('other-tenant', 'i1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generate', () => {
    beforeEach(() => {
      // Setup common mocks for generation
      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { normalizedAmount: new Decimal(1000) },
      });
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.groupBy.mockResolvedValue([]);
      mockOllamaService.generate.mockResolvedValue('Generated insight text');
      mockPrismaService.insight.create.mockImplementation((args) =>
        Promise.resolve({
          id: 'new-insight',
          ...args.data,
        }),
      );
    });

    it('should generate all insight types by default', async () => {
      const result = await service.generate(tenantId);

      expect(result.generated).toBeDefined();
      expect(result.processingTimeMs).toBeDefined();
    });

    it('should generate specific insight types when requested', async () => {
      await service.generate(tenantId, [InsightType.MONTHLY_NARRATIVE]);

      expect(mockPrismaService.insight.create).toHaveBeenCalled();
    });

    it('should use SQL metrics, not recalculate in LLM', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { normalizedAmount: new Decimal(1500) } }) // current
        .mockResolvedValueOnce({ _sum: { normalizedAmount: new Decimal(1000) } }); // previous

      await service.generate(tenantId, [InsightType.MONTHLY_NARRATIVE]);

      // The SQL aggregate should be called, not LLM calculation
      expect(mockPrismaService.invoice.aggregate).toHaveBeenCalled();

      // LLM should only summarize, receiving the metrics
      expect(mockOllamaService.generate).toHaveBeenCalledWith(
        expect.stringContaining('SQL-computed metrics'),
      );
    });

    it('should detect recurring charges pattern', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        { id: '1', vendorId: 'v1', originalAmount: new Decimal(99.99), vendor: { name: 'Netflix' } },
        { id: '2', vendorId: 'v1', originalAmount: new Decimal(99.99), vendor: { name: 'Netflix' } },
        { id: '3', vendorId: 'v1', originalAmount: new Decimal(99.99), vendor: { name: 'Netflix' } },
      ]);

      await service.generate(tenantId, [InsightType.RECURRING_CHARGES]);

      expect(mockPrismaService.insight.create).toHaveBeenCalled();
    });

    it('should detect duplicate invoices as anomalies', async () => {
      const sameDate = new Date('2024-01-15');
      mockPrismaService.invoice.findMany.mockResolvedValue([
        { id: '1', vendorId: 'v1', originalAmount: new Decimal(100), invoiceDate: sameDate, vendor: { name: 'Test' } },
        { id: '2', vendorId: 'v1', originalAmount: new Decimal(100), invoiceDate: sameDate, vendor: { name: 'Test' } },
      ]);
      mockPrismaService.invoice.groupBy.mockResolvedValue([
        { vendorId: 'v1', _avg: { normalizedAmount: new Decimal(100) } },
      ]);

      await service.generate(tenantId, [InsightType.ANOMALIES]);

      expect(mockPrismaService.insight.create).toHaveBeenCalled();
    });

    it('should detect spend spikes as anomalies', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        { id: '1', vendorId: 'v1', originalAmount: new Decimal(100), normalizedAmount: new Decimal(100), invoiceDate: new Date(), vendor: { name: 'Test' } },
        { id: '2', vendorId: 'v1', originalAmount: new Decimal(500), normalizedAmount: new Decimal(500), invoiceDate: new Date(), vendor: { name: 'Test' } }, // 5x average = spike
      ]);
      mockPrismaService.invoice.groupBy.mockResolvedValue([
        { vendorId: 'v1', _avg: { normalizedAmount: new Decimal(100) } },
      ]);

      await service.generate(tenantId, [InsightType.ANOMALIES]);

      // Should flag the 500 invoice as a spike (> 3x average)
      expect(mockPrismaService.insight.create).toHaveBeenCalled();
    });
  });

  describe('LLM rules compliance', () => {
    it('should never let LLM compute totals', async () => {
      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { normalizedAmount: new Decimal(1000) },
      });
      mockOllamaService.generate.mockResolvedValue('Summary text');
      mockPrismaService.insight.create.mockResolvedValue({ id: 'i1' });

      await service.generate(tenantId, [InsightType.MONTHLY_NARRATIVE]);

      // Verify LLM prompt contains SQL-computed values
      expect(mockOllamaService.generate).toHaveBeenCalledWith(
        expect.stringContaining('DO NOT recalculate'),
      );
    });

    it('should provide fallback if LLM fails', async () => {
      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { normalizedAmount: new Decimal(1000) },
      });
      mockOllamaService.generate.mockRejectedValue(new Error('LLM unavailable'));
      mockPrismaService.insight.create.mockResolvedValue({ id: 'i1' });

      // Should not throw, should use fallback narrative
      const result = await service.generate(tenantId, [InsightType.MONTHLY_NARRATIVE]);

      expect(result).toBeDefined();
    });
  });

  describe('tenant isolation', () => {
    it('should always filter by tenantId in queries', async () => {
      mockPrismaService.insight.findMany.mockResolvedValue([]);

      await service.findAll(tenantId);

      expect(mockPrismaService.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });

    it('should store tenantId on created insights', async () => {
      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { normalizedAmount: new Decimal(1000) },
      });
      mockOllamaService.generate.mockResolvedValue('Text');
      mockPrismaService.insight.create.mockImplementation((args) =>
        Promise.resolve({ id: 'i1', ...args.data }),
      );

      await service.generate(tenantId, [InsightType.MONTHLY_NARRATIVE]);

      expect(mockPrismaService.insight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId }),
        }),
      );
    });
  });
});
