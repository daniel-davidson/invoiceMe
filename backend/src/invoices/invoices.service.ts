import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExtractionService } from '../extraction/extraction.service';
import { StorageService } from '../storage/storage.service';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

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
    );

    // If vendorId was explicitly provided and differs from extracted, update the invoice
    if (vendorId && vendorId !== result.vendor.id) {
      await this.prisma.invoice.update({
        where: { id: result.invoice.id },
        data: { vendorId },
      });
      result.invoice.vendorId = vendorId;
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

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { vendor: { name: { contains: search, mode: 'insensitive' } } },
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
        include: { vendor: { select: { id: true, name: true } } },
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
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        name: dto.name,
        originalAmount: dto.originalAmount,
        originalCurrency: dto.originalCurrency,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
        vendorId: dto.vendorId,
      },
      include: { vendor: { select: { id: true, name: true } } },
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
}
