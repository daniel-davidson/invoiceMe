import {
  IsString,
  IsNumber,
  IsOptional,
  MinLength,
  MaxLength,
  IsPositive,
} from 'class-validator';

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  monthlyLimit?: number;
}
