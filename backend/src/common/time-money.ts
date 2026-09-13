const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MINUTES_PER_DAY = 24 * 60;

export class CalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculationError';
  }
}

export function parseTimeToMinutes(time: string): number {
  if (!TIME_PATTERN.test(time)) {
    throw new CalculationError('La hora debe tener el formato HH:mm');
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function calculateGrossMinutes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (end <= start) {
    return MINUTES_PER_DAY - start + end;
  }
  return end - start;
}

export function roundHalfUpToInteger(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    throw new CalculationError('El divisor debe ser mayor que cero');
  }
  const whole = Math.trunc(numerator / denominator);
  const remainder = numerator % denominator;
  return remainder * 2 >= denominator ? whole + 1 : whole;
}

export function calculateEarnedAmount(netMinutes: number, hourlyRate: number): number {
  if (netMinutes < 0 || hourlyRate < 0) {
    throw new CalculationError('Los minutos y el valor de la hora no pueden ser negativos');
  }
  return roundHalfUpToInteger(netMinutes * hourlyRate, 60);
}

export interface ShiftCalculationInput {
  startTime: string;
  endTime: string;
  mealBreakMinutes: number;
  hourlyRate: number;
}

export interface ShiftCalculationResult {
  grossMinutes: number;
  mealBreakMinutes: number;
  netMinutes: number;
  hourlyRate: number;
  earnedAmount: number;
}

export function calculateShift(input: ShiftCalculationInput): ShiftCalculationResult {
  if (!Number.isInteger(input.mealBreakMinutes) || input.mealBreakMinutes < 0) {
    throw new CalculationError('Los minutos de alimentación deben ser un entero mayor o igual a 0');
  }
  if (!Number.isInteger(input.hourlyRate) || input.hourlyRate <= 0) {
    throw new CalculationError('El valor de la hora debe ser un entero mayor que 0');
  }

  const grossMinutes = calculateGrossMinutes(input.startTime, input.endTime);
  if (input.mealBreakMinutes >= grossMinutes) {
    throw new CalculationError(
      'Los minutos de alimentación deben ser menores que el tiempo bruto trabajado',
    );
  }

  const netMinutes = grossMinutes - input.mealBreakMinutes;
  const earnedAmount = calculateEarnedAmount(netMinutes, input.hourlyRate);

  return {
    grossMinutes,
    mealBreakMinutes: input.mealBreakMinutes,
    netMinutes,
    hourlyRate: input.hourlyRate,
    earnedAmount,
  };
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function todayInBogota(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

export function toDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CalculationError('La fecha debe tener el formato YYYY-MM-DD');
  }
  return new Date(`${value}T00:00:00.000Z`);
}

export function dateOnlyToString(value: Date): string {
  return value.toISOString().slice(0, 10);
}
