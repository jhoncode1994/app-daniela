import { IsUUID, Matches } from 'class-validator';

export class SettlementQueryDto {
  @IsUUID()
  workerId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to: string;
}
