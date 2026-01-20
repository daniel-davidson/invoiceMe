import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Tenant } from '../common/decorators/tenant.decorator';
import { UploadInvoiceDto } from './dto/upload-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { CheckDuplicateDto } from './dto/check-duplicate.dto';

@Controller('invoices')
@UseGuards(JwtAuthGuard, TenantGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/jpg',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error('Invalid file type. Only PDF, JPEG, PNG allowed.'),
            false,
          );
        }
      },
    }),
  )
  async upload(
    @Tenant() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadInvoiceDto,
  ) {
    // Log to debug vendorId issue
    console.log('[InvoicesController] Upload request:', {
      tenantId,
      fileName: file.originalname,
      vendorIdFromDto: dto.vendorId,
      dtoKeys: Object.keys(dto),
    });

    return this.invoicesService.upload(tenantId, file, dto.vendorId);
  }

  @Post('check-duplicate')
  async checkDuplicate(
    @Tenant() tenantId: string,
    @Body() dto: CheckDuplicateDto,
  ) {
    return this.invoicesService.checkDuplicate(tenantId, dto);
  }

  @Get()
  async findAll(@Tenant() tenantId: string, @Query() query: InvoiceQueryDto) {
    return this.invoicesService.findAll(tenantId, query);
  }

  @Get(':id')
  async findOne(
    @Tenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.findOne(tenantId, id);
  }

  @Patch(':id')
  async update(
    @Tenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Tenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.remove(tenantId, id);
  }

  @Get(':id/file')
  async getFile(
    @Tenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, mimeType, fileName } = await this.invoicesService.getFile(
      tenantId,
      id,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return new StreamableFile(buffer);
  }
}
