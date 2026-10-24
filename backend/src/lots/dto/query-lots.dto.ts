import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true' || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === '0') {
    return false;
  }
  return undefined;
}

export class QueryLotsDto {
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @IsOptional()
  @Transform(({ obj }) => toOptionalBoolean(obj.closed))
  @IsBoolean()
  closed?: boolean;
}
