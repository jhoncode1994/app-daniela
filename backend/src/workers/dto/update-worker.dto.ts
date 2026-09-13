import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateWorkerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  hourlyRate?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
