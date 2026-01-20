import { IsArray, IsUUID } from 'class-validator';

export class ReorderVendorsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  vendorIds: string[];
}
