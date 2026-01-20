import {
  IsString,
  IsNumber,
  IsDateString,
  IsUUID,
  IsOptional,
  IsPositive,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

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
}
