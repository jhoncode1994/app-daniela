import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateWorkerDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsInt()
  @Min(1)
  hourlyRate: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
