import { IsUUID, Matches } from 'class-validator';

export class ClockInDto {
  @IsUUID()
  workerId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener el formato YYYY-MM-DD' })
  workDate: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora de ingreso debe tener el formato HH:mm' })
  startTime: string;
}
