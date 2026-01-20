import { IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @IsOptional()
  @IsUUID()
  id?: string; // Omit for new items

  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  unitPrice?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  total: number;

  @IsOptional()
  @IsString()
  currency?: string; // Defaults to invoice currency if null
}

export class InvoiceItemResponseDto {
  id: string;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  total: number;
  currency: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
