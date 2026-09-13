import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Matches, Min } from 'class-validator';

export class ClockOutDto {
  @IsUUID()
  workerId: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora de salida debe tener el formato HH:mm' })
  endTime: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mealBreakMinutes?: number;
}
