import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLotDto {
  @IsUUID()
  providerId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  reference: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  units?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsBoolean()
  closed?: boolean;
}
