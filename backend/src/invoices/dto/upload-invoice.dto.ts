import { IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadInvoiceDto {
  @IsOptional()
  @IsUUID()
  @Transform(({ value }) => {
    // Ensure empty strings or undefined are treated as undefined (no override)
    if (!value || value === '' || value === 'undefined' || value === 'null') {
      return undefined;
    }
    return value;
  })
  vendorId?: string;
}
