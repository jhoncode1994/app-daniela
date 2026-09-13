import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(totalMinutes: number | null | undefined): string {
    const minutes = totalMinutes ?? 0;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours}h ${String(rest).padStart(2, '0')}m`;
  }
}
