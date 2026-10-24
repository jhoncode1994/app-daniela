import { ArrayMinSize, IsArray, IsOptional, IsUUID, Matches } from 'class-validator';

export class CreatePaymentDto {
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

  // Si viene vacio se paga todo lo pendiente de ese proveedor y esa referencia.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  shiftIds?: string[];

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  paymentDate?: string;
}
