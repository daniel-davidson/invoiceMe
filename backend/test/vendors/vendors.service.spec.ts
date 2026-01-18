import { Test, TestingModule } from '@nestjs/testing';
import { VendorsService } from '../../src/vendors/vendors.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('VendorsService', () => {
  let service: VendorsService;
  let prismaService: PrismaService;

  const tenantId = 'tenant-123';
  const otherTenantId = 'tenant-456';

  const mockPrismaService = {
    vendor: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return vendors for tenant only', async () => {
      const mockVendors = [
        { id: 'v1', tenantId, name: 'Google', displayOrder: 0 },
        { id: 'v2', tenantId, name: 'Apple', displayOrder: 1 },
      ];

      mockPrismaService.vendor.findMany.mockResolvedValue(mockVendors);

      const result = await service.findAll(tenantId);

      expect(mockPrismaService.vendor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId },
        }),
      );
      expect(result).toHaveLength(2);
    });

    it('should not return vendors from other tenants', async () => {
      mockPrismaService.vendor.findMany.mockResolvedValue([]);

      const result = await service.findAll(otherTenantId);

      expect(result).toHaveLength(0);
    });

    it('should order by displayOrder', async () => {
      mockPrismaService.vendor.findMany.mockResolvedValue([]);

      await service.findAll(tenantId);

      expect(mockPrismaService.vendor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { displayOrder: 'asc' },
        }),
      );
    });
  });

  describe('create', () => {
    it('should create vendor with tenantId', async () => {
      const createDto = { name: 'New Vendor' };
      const mockVendor = {
        id: 'v-new',
        tenantId,
        name: createDto.name,
        displayOrder: 0,
      };

      mockPrismaService.vendor.findFirst.mockResolvedValue(null);
      mockPrismaService.vendor.aggregate.mockResolvedValue({
        _max: { displayOrder: -1 },
      });
      mockPrismaService.vendor.create.mockResolvedValue(mockVendor);

      const result = await service.create(tenantId, createDto);

      expect(mockPrismaService.vendor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            name: createDto.name,
          }),
        }),
      );
      expect(result.tenantId).toBe(tenantId);
    });

    it('should reject duplicate vendor name within tenant', async () => {
      const createDto = { name: 'Existing Vendor' };

      mockPrismaService.vendor.findFirst.mockResolvedValue({
        id: 'existing',
        tenantId,
        name: createDto.name,
      });

      await expect(service.create(tenantId, createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow same vendor name for different tenants', async () => {
      const createDto = { name: 'Shared Name' };

      mockPrismaService.vendor.findFirst.mockResolvedValue(null);
      mockPrismaService.vendor.aggregate.mockResolvedValue({
        _max: { displayOrder: 0 },
      });
      mockPrismaService.vendor.create.mockResolvedValue({
        id: 'v-new',
        tenantId,
        name: createDto.name,
        displayOrder: 1,
      });

      const result = await service.create(tenantId, createDto);
      expect(result.name).toBe(createDto.name);
    });
  });

  describe('update', () => {
    it('should update vendor for correct tenant', async () => {
      const vendorId = 'v1';
      const updateDto = { name: 'Updated Name' };

      mockPrismaService.vendor.findFirst.mockResolvedValue({
        id: vendorId,
        tenantId,
        name: 'Old Name',
      });
      mockPrismaService.vendor.update.mockResolvedValue({
        id: vendorId,
        tenantId,
        name: updateDto.name,
      });

      const result = await service.update(tenantId, vendorId, updateDto);

      expect(result.name).toBe(updateDto.name);
    });

    it('should throw NotFoundException for wrong tenant', async () => {
      const vendorId = 'v1';

      mockPrismaService.vendor.findFirst.mockResolvedValue(null);

      await expect(
        service.update(otherTenantId, vendorId, { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete vendor for correct tenant', async () => {
      const vendorId = 'v1';

      mockPrismaService.vendor.findFirst.mockResolvedValue({
        id: vendorId,
        tenantId,
        name: 'To Delete',
        _count: { invoices: 5 },
      });
      mockPrismaService.vendor.delete.mockResolvedValue({});

      const result = await service.remove(tenantId, vendorId);

      expect(result.deletedVendorId).toBe(vendorId);
      expect(result.deletedInvoicesCount).toBe(5);
    });

    it('should throw NotFoundException for wrong tenant', async () => {
      mockPrismaService.vendor.findFirst.mockResolvedValue(null);

      await expect(service.remove(otherTenantId, 'v1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('tenant isolation', () => {
    it('should always filter by tenantId in findMany', async () => {
      await service.findAll(tenantId);

      expect(mockPrismaService.vendor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });

    it('should always filter by tenantId in findFirst', async () => {
      mockPrismaService.vendor.findFirst.mockResolvedValue(null);

      try {
        await service.findOne(tenantId, 'v1');
      } catch {}

      expect(mockPrismaService.vendor.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });
  });
});
