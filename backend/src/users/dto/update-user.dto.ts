import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  personalBusinessId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'systemCurrency must be a valid 3-letter ISO currency code',
  })
  systemCurrency?: string;
}
