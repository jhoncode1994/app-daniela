import {
  calculateEarnedAmount,
  calculateGrossMinutes,
  calculateShift,
  formatDuration,
} from './time-money';

describe('time-money', () => {
  it('calcula 14 horas brutas de 05:00 a 19:00', () => {
    expect(calculateGrossMinutes('05:00', '19:00')).toBe(840);
  });

  it('soporta turnos que cruzan medianoche', () => {
    expect(calculateGrossMinutes('22:00', '06:00')).toBe(480);
  });

  it('calcula el ejemplo de 50 minutos de alimentación y $6000', () => {
    const result = calculateShift({
      startTime: '05:00',
      endTime: '19:00',
      mealBreakMinutes: 50,
      hourlyRate: 6000,
    });

    expect(result.grossMinutes).toBe(840);
    expect(result.netMinutes).toBe(790);
    expect(result.earnedAmount).toBe(79000);
    expect(formatDuration(result.netMinutes)).toBe('13h 10m');
  });

  it('redondea el valor al peso más cercano (half-up)', () => {
    expect(calculateEarnedAmount(791, 6500)).toBe(85692);
  });
});
