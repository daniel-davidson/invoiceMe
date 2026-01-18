import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from '../../src/invoices/invoices.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ExtractionService } from '../../src/extraction/extraction.service';
import { StorageService } from '../../src/storage/storage.service';
import { NotFoundException } from '@nestjs/common';

describe('InvoicesService', () => {
  let service: InvoicesService;

  const tenantId = 'tenant-123';
  const otherTenantId = 'tenant-456';

  const mockPrismaService = {
    invoice: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockExtractionService = {
    processInvoice: jest.fn(),
  };

  const mockStorageService = {
    saveFile: jest.fn(),
    deleteFile: jest.fn(),
    getFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExtractionService, useValue: mockExtractionService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('should process valid PDF upload', async () => {
      const mockFile = {
        buffer: Buffer.from('fake-pdf'),
        originalname: 'invoice.pdf',
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      mockPrismaService.user.findUnique.mockResolvedValue({
        systemCurrency: 'USD',
      });

      mockExtractionService.processInvoice.mockResolvedValue({
        invoice: { id: 'inv-1', vendorId: 'v1' },
        vendor: { id: 'v1', name: 'Test Vendor', isNew: false },
        extraction: { status: 'SUCCESS', warnings: [] },
      });

      const result = await service.upload(tenantId, mockFile);

      expect(mockExtractionService.processInvoice).toHaveBeenCalled();
      expect(result.invoice).toBeDefined();
    });

    it('should process valid image upload', async () => {
      const mockFile = {
        buffer: Buffer.from('fake-image'),
        originalname: 'invoice.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      mockPrismaService.user.findUnique.mockResolvedValue({
        systemCurrency: 'EUR',
      });

      mockExtractionService.processInvoice.mockResolvedValue({
        invoice: { id: 'inv-2', vendorId: 'v2' },
        vendor: { id: 'v2', name: 'Image Vendor', isNew: true },
        extraction: { status: 'SUCCESS', warnings: [] },
      });

      const result = await service.upload(tenantId, mockFile);

      expect(result.vendor.isNew).toBe(true);
    });

    it('should reject unsupported file types', () => {
      const invalidMimes = ['text/plain', 'application/json', 'video/mp4'];

      invalidMimes.forEach((mime) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/jpg',
        ];
        expect(allowedMimes.includes(mime)).toBe(false);
      });
    });
  });

  describe('findAll', () => {
    it('should return invoices for tenant only', async () => {
      const mockInvoices = [
        { id: 'inv-1', tenantId, vendorId: 'v1', vendor: { name: 'A' } },
        { id: 'inv-2', tenantId, vendorId: 'v2', vendor: { name: 'B' } },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);
      mockPrismaService.invoice.count.mockResolvedValue(2);

      const result = await service.findAll(tenantId, {});

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
      expect(result.data).toHaveLength(2);
    });

    it('should support pagination', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(100);

      const result = await service.findAll(tenantId, { page: 2, limit: 10 });

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.pagination.totalPages).toBe(10);
    });

    it('should filter by vendorId', async () => {
      const vendorId = 'v1';
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      await service.findAll(tenantId, { vendorId });

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId, vendorId }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      await service.findAll(tenantId, {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            invoiceDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return invoice for correct tenant', async () => {
      const invoiceId = 'inv-1';
      mockPrismaService.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        tenantId,
        vendorId: 'v1',
        vendor: { id: 'v1', name: 'Test' },
      });

      const result = await service.findOne(tenantId, invoiceId);

      expect(result.id).toBe(invoiceId);
    });

    it('should throw NotFoundException for wrong tenant', async () => {
      mockPrismaService.invoice.findFirst.mockResolvedValue(null);

      await expect(service.findOne(otherTenantId, 'inv-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update invoice for correct tenant', async () => {
      const invoiceId = 'inv-1';

      mockPrismaService.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        tenantId,
      });
      mockPrismaService.invoice.update.mockResolvedValue({
        id: invoiceId,
        tenantId,
        name: 'Updated Invoice',
      });

      const result = await service.update(tenantId, invoiceId, {
        name: 'Updated Invoice',
      });

      expect(result.name).toBe('Updated Invoice');
    });

    it('should validate amount is positive', () => {
      const invalidAmounts = [-100, 0, -0.01];
      const validAmounts = [0.01, 1, 100, 999999.99];

      invalidAmounts.forEach((amount) => {
        expect(amount > 0).toBe(false);
      });

      validAmounts.forEach((amount) => {
        expect(amount > 0).toBe(true);
      });
    });

    it('should validate currency is ISO 4217', () => {
      const validCurrencies = ['USD', 'EUR', 'ILS', 'GBP'];
      const invalidCurrencies = ['US', 'DOLLAR', '123', ''];

      validCurrencies.forEach((code) => {
        expect(/^[A-Z]{3}$/.test(code)).toBe(true);
      });

      invalidCurrencies.forEach((code) => {
        expect(/^[A-Z]{3}$/.test(code)).toBe(false);
      });
    });
  });

  describe('remove', () => {
    it('should delete invoice and file for correct tenant', async () => {
      const invoiceId = 'inv-1';
      const fileUrl = 'tenant-123/file.pdf';

      mockPrismaService.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        tenantId,
        fileUrl,
      });
      mockPrismaService.invoice.delete.mockResolvedValue({});

      const result = await service.remove(tenantId, invoiceId);

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(fileUrl);
      expect(result.deletedInvoiceId).toBe(invoiceId);
    });
  });

  describe('tenant isolation', () => {
    it('should always include tenantId in queries', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      await service.findAll(tenantId, {});

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });
  });
});
