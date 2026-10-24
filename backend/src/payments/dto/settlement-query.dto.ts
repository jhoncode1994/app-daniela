import { IsOptional, IsUUID, Matches } from 'class-validator';

export class SettlementQueryDto {
  @IsUUID()
  workerId: string;

  @IsUUID()
  providerId: string;

  @IsUUID()
  lotId: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
