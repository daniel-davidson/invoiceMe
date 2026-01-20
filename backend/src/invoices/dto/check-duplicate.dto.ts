import { IsString } from 'class-validator';

export class CheckDuplicateDto {
  @IsString()
  fileHash: string;
}
