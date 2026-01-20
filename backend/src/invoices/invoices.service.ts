import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExtractionService } from '../extraction/extraction.service';
import { StorageService } from '../storage/storage.service';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CheckDuplicateDto } from './dto/check-duplicate.dto';
import * as crypto from 'crypto';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private extractionService: ExtractionService,
    private storageService: StorageService,
  ) {}

  async upload(
    tenantId: string,
    file: Express.Multer.File,
    vendorId?: string,
  ) {
    // Log for debugging
    console.log('[InvoicesService] Upload called with:', {
      tenantId,
      fileName: file.originalname,
      explicitVendorId: vendorId,
      hasVendorId: !!vendorId,
    });

    // Compute file hash for dedupe
    const fileHash = this.computeFileHash(file.buffer);
    
    // Check for duplicate
    const duplicate = await this.checkDuplicate(tenantId, { fileHash });
    if (duplicate.isDuplicate) {
      throw new ConflictException({
        message: 'This invoice has already been uploaded',
        isDuplicate: true,
        existingInvoice: duplicate.existingInvoice,
      });
    }
    
    // Get user's system currency
    const user = await this.prisma.user.findUnique({
      where: { id: tenantId },
      select: { systemCurrency: true },
    });
    const systemCurrency = user?.systemCurrency || 'USD';

    // Process extraction (this handles file saving internally)
    const result = await this.extractionService.processInvoice(
      file.buffer,
      file.originalname,
      file.mimetype,
      tenantId,
      systemCurrency,
      fileHash, // Pass fileHash to extraction service
    );

    console.log('[InvoicesService] Extraction result:', {
      extractedVendorNameCandidate: result.extractedVendorNameCandidate,
      vendorId: result.invoice.vendorId, // v2.0: null on upload
      explicitVendorIdProvided: vendorId,
    });

    // v2.0: If vendorId was explicitly provided (from post-upload modal), assign it
    if (vendorId) {
      console.log('[InvoicesService] Assigning vendor via explicit vendorId:', {
        vendorId,
      });
      
      await this.prisma.invoice.update({
        where: { id: result.invoice.id },
        data: { 
          vendorId,
          needsReview: false, // User explicitly assigned, no longer needs review
        },
      });
      result.invoice.vendorId = vendorId;
      result.invoice.needsReview = false;
    }

    return result;
  }

  async findAll(tenantId: string, query: InvoiceQueryDto) {
    const { vendorId, search, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    // Enhanced search: vendor name, invoice name, invoice number, amount (as string)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { vendor: { name: { contains: search, mode: 'insensitive' } } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        // Amount search: convert search to number if possible
        ...(isNaN(Number(search)) ? [] : [
          { originalAmount: { equals: Number(search) } },
        ]),
      ];
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate);
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { 
          vendor: { select: { id: true, name: true } },
          items: { orderBy: { displayOrder: 'asc' } },
        },
        orderBy: { invoiceDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        vendor: { select: { id: true, name: true } },
        items: { orderBy: { displayOrder: 'asc' } },
        extractionRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async update(tenantId: string, id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Validation: if useItemsTotal=true and items provided, validate total matches
    if (dto.useItemsTotal !== false && dto.items && dto.items.length > 0) {
      const itemsTotal = dto.items.reduce((sum, item) => sum + item.total, 0);
      const invoiceAmount = dto.originalAmount ?? Number(invoice.originalAmount);
      
      const tolerance = 0.01; // $0.01 tolerance
      if (Math.abs(itemsTotal - invoiceAmount) > tolerance) {
        throw new Error(
          `Total mismatch: invoice amount $${invoiceAmount.toFixed(2)} ≠ items total $${itemsTotal.toFixed(2)} (useItemsTotal is true)`,
        );
      }
    }

    // Use transaction for atomic update (invoice + items)
    return this.prisma.$transaction(async (tx) => {
      // Update invoice header
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          name: dto.name,
          invoiceNumber: dto.invoiceNumber,
          originalAmount: dto.originalAmount,
          originalCurrency: dto.originalCurrency,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
          vendorId: dto.vendorId,
          useItemsTotal: dto.useItemsTotal,
          needsReview: dto.needsReview,
        },
      });

      // Handle items update (full replace)
      if (dto.items !== undefined) {
        const existingItemIds = invoice.items.map(item => item.id);
        const providedItemIds = dto.items.filter(item => item.id).map(item => item.id!);

        // Delete items not in provided array
        const itemsToDelete = existingItemIds.filter(id => !providedItemIds.includes(id));
        if (itemsToDelete.length > 0) {
          await tx.invoiceItem.deleteMany({
            where: { id: { in: itemsToDelete } },
          });
        }

        // Update existing items or create new ones
        for (let i = 0; i < dto.items.length; i++) {
          const itemDto = dto.items[i];
          
          if (itemDto.id) {
            // Update existing item
            await tx.invoiceItem.update({
              where: { id: itemDto.id },
              data: {
                description: itemDto.description,
                quantity: itemDto.quantity,
                unitPrice: itemDto.unitPrice,
                total: itemDto.total,
                currency: itemDto.currency,
                displayOrder: i,
              },
            });
          } else {
            // Create new item
            await tx.invoiceItem.create({
              data: {
                invoiceId: id,
                tenantId,
                description: itemDto.description,
                quantity: itemDto.quantity,
                unitPrice: itemDto.unitPrice,
                total: itemDto.total,
                currency: itemDto.currency || updatedInvoice.originalCurrency,
                displayOrder: i,
              },
            });
          }
        }
      }

      // Fetch updated invoice with items
      return tx.invoice.findUnique({
        where: { id },
        include: {
          vendor: { select: { id: true, name: true } },
          items: { orderBy: { displayOrder: 'asc' } },
        },
      });
    });
  }

  async remove(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Delete file
    await this.storageService.deleteFile(invoice.fileUrl);

    // Delete invoice (cascades to extraction runs)
    await this.prisma.invoice.delete({ where: { id } });

    return { deletedInvoiceId: id };
  }

  async getFile(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.storageService.getFile(invoice.fileUrl);
  }

  /**
   * Compute SHA-256 hash of file for dedupe detection
   */
  private computeFileHash(buffer: Buffer): string {
    return 'sha256:' + crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check if file already uploaded (dedupe)
   */
  async checkDuplicate(tenantId: string, dto: CheckDuplicateDto) {
    const existing = await this.prisma.invoice.findFirst({
      where: {
        tenantId,
        fileHash: dto.fileHash,
      },
      include: {
        vendor: { select: { name: true } },
      },
    });

    if (existing) {
      return {
        isDuplicate: true,
        existingInvoice: {
          id: existing.id,
          name: existing.name,
          vendorName: existing.vendor.name,
          originalAmount: Number(existing.originalAmount),
          originalCurrency: existing.originalCurrency,
          invoiceDate: existing.invoiceDate,
          createdAt: existing.createdAt,
        },
      };
    }

    return { isDuplicate: false };
  }
}
