import { Type } from 'class-transformer';
import { IsInt, IsUUID, Matches, Min } from 'class-validator';

export class ShiftInputDto {
  @IsUUID()
  workerId: string;

  @IsUUID()
  providerId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener el formato YYYY-MM-DD' })
  workDate: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora de ingreso debe tener el formato HH:mm' })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora de salida debe tener el formato HH:mm' })
  endTime: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  mealBreakMinutes: number;
}
