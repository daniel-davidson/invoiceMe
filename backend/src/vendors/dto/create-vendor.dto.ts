import { IsString, IsNumber, IsOptional, MinLength, MaxLength, IsPositive } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsNumber()
  @IsPositive()
  monthlyLimit: number; // ❗ v2.0: REQUIRED, must be > 0
}
