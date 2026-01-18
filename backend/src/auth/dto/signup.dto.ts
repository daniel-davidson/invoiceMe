import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  personalBusinessId?: string;

  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'systemCurrency must be a valid 3-letter ISO currency code',
  })
  systemCurrency: string;
}
