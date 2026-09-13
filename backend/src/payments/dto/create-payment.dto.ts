import { IsOptional, IsUUID, Matches } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  workerId: string;

  @IsUUID()
  providerId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  paymentDate?: string;
}
