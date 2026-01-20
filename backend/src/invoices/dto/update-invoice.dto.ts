import {
  IsString,
  IsNumber,
  IsDateString,
  IsUUID,
  IsOptional,
  IsPositive,
  IsBoolean,
  IsArray,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceItemDto } from './invoice-item.dto';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNumber?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  originalAmount?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be ISO 4217 code' })
  originalCurrency?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsBoolean()
  useItemsTotal?: boolean;

  @IsOptional()
  @IsBoolean()
  needsReview?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items?: InvoiceItemDto[];
}
