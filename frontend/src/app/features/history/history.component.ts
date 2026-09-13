import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { httpErrorMessage } from '../../core/http-error';
import { WorkShift, Worker } from '../../core/models';
import { DurationPipe } from '../../shared/duration.pipe';
import { MoneyPipe } from '../../shared/money.pipe';

interface DayGroup {
  workDate: string;
  shifts: WorkShift[];
  netMinutes: number;
  earnedAmount: number;
  pendingCount: number;
}

@Component({
  selector: 'app-history',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    DurationPipe,
    MoneyPipe,
  ],
  template: `
    @if (!selectedWorker()) {
      <h1>Historial</h1>
      <p class="hint">Elige una trabajadora para ver su historial.</p>
      @for (worker of workers(); track worker.id) {
        <a class="worker-link" [routerLink]="['/jornadas', worker.id]">
          <mat-card class="worker-card">
            <h3>{{ worker.name }}</h3>
            <p>{{ worker.hourlyRate | money }} / hora</p>
          </mat-card>
        </a>
      } @empty {
        <p class="empty">No hay trabajadoras. Agrégalas primero.</p>
      }
    } @else {
      <a mat-button routerLink="/jornadas">Volver a trabajadoras</a>
      <h1>{{ selectedWorker()!.name }}</h1>
      <p class="hint">Historial solo de esta trabajadora. Cada día puede tener varios ingresos y salidas.</p>

      <form [formGroup]="form" (ngSubmit)="load()">
        <mat-form-field appearance="outline">
          <mat-label>Desde</mat-label>
          <input matInput type="date" formControlName="from" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Hasta</mat-label>
          <input matInput type="date" formControlName="to" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Estado de pago</mat-label>
          <mat-select formControlName="paymentStatus">
            <mat-option value="">Todos</mat-option>
            <mat-option value="PENDIENTE">Pendiente</mat-option>
            <mat-option value="PAGADA">Pagada</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-flat-button color="primary" type="submit" class="full">Filtrar</button>
      </form>

      <a
        mat-stroked-button
        class="full"
        [routerLink]="['/jornadas/nueva']"
        [queryParams]="{ workerId: selectedWorker()!.id }"
      >
        Registrar jornada
      </a>

      @for (day of dayGroups(); track day.workDate) {
        <mat-card class="day">
          <div class="day-head">
            <h3>{{ day.workDate }}</h3>
            <strong>{{ day.earnedAmount | money }}</strong>
          </div>
          <p>Total neto del día: {{ day.netMinutes | duration }}</p>
          @for (shift of day.shifts; track shift.id) {
            <div class="segment">
              <div>
                <p>{{ shift.startTime }} – {{ shift.endTime }}</p>
                <p>
                  Alimentación {{ shift.mealBreakMinutes }} min ·
                  {{ shift.netMinutes | duration }} ·
                  {{ shift.earnedAmount | money }}
                </p>
              </div>
              <div class="segment-actions">
                <mat-chip [class.paid]="shift.paymentStatus === 'PAGADA'">
                  {{ shift.paymentStatus === 'PAGADA' ? 'Pagada' : 'Pendiente' }}
                </mat-chip>
                @if (shift.paymentStatus === 'PENDIENTE') {
                  <button mat-button color="warn" type="button" (click)="remove(shift)">Quitar</button>
                }
              </div>
            </div>
          }
        </mat-card>
      } @empty {
        <p class="empty">No hay registros para esta trabajadora con esos filtros.</p>
      }
    }
  `,
  styles: [
    `
      .hint,
      .empty {
        color: var(--color-muted-foreground);
      }
      .worker-link {
        text-decoration: none;
        color: inherit;
        display: block;
        margin-bottom: 10px;
      }
      .worker-card,
      .day {
        padding: var(--space-md);
        margin-bottom: 12px;
      }
      .worker-card h3,
      .day-head h3,
      .segment p {
        margin: 0 0 4px;
      }
      .worker-card p {
        margin: 0;
        color: var(--color-muted-foreground);
      }
      form {
        display: flex;
        flex-direction: column;
      }
      .full {
        width: 100%;
        min-height: var(--touch);
        margin-bottom: var(--space-md);
      }
      .day-head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
      }
      .segment {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-top: 10px;
        margin-top: 10px;
        border-top: 1px solid var(--color-border);
      }
      .segment p {
        color: var(--color-muted-foreground);
      }
      .segment-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      @media (min-width: 640px) {
        .segment {
          flex-direction: row;
          justify-content: space-between;
          align-items: flex-start;
        }
        .segment-actions {
          flex-direction: column;
          align-items: flex-end;
        }
      }
      mat-chip {
        background: var(--color-muted);
      }
      mat-chip.paid {
        background: var(--color-success-soft);
        color: var(--color-success);
      }
    `,
  ],
})
export class HistoryComponent implements OnInit {
  readonly workers = signal<Worker[]>([]);
  readonly shifts = signal<WorkShift[]>([]);
  readonly selectedWorkerId = signal<string | null>(null);
  readonly form;

  readonly selectedWorker = computed(() => {
    const id = this.selectedWorkerId();
    return this.workers().find((worker) => worker.id === id) ?? null;
  });

  readonly dayGroups = computed(() => {
    const map = new Map<string, DayGroup>();
    for (const shift of this.shifts()) {
      const existing = map.get(shift.workDate);
      if (existing) {
        existing.shifts.push(shift);
        existing.netMinutes += shift.netMinutes;
        existing.earnedAmount += shift.earnedAmount;
        if (shift.paymentStatus === 'PENDIENTE') {
          existing.pendingCount += 1;
        }
      } else {
        map.set(shift.workDate, {
          workDate: shift.workDate,
          shifts: [shift],
          netMinutes: shift.netMinutes,
          earnedAmount: shift.earnedAmount,
          pendingCount: shift.paymentStatus === 'PENDIENTE' ? 1 : 0,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.workDate.localeCompare(a.workDate));
  });

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
    private readonly snack: MatSnackBar,
    private readonly route: ActivatedRoute,
  ) {
    this.form = fb.nonNullable.group({
      from: [''],
      to: [''],
      paymentStatus: [''],
    });
  }

  ngOnInit(): void {
    this.api.getWorkers().subscribe((workers) => {
      this.workers.set(workers);
      this.route.paramMap.subscribe((params) => {
        const workerId = params.get('workerId');
        this.selectedWorkerId.set(workerId);
        if (workerId) {
          this.load();
        } else {
          this.shifts.set([]);
        }
      });
    });
  }

  load(): void {
    const workerId = this.selectedWorkerId();
    if (!workerId) {
      return;
    }
    const value = this.form.getRawValue();
    this.api
      .getShifts({
        workerId,
        from: value.from || undefined,
        to: value.to || undefined,
        paymentStatus: value.paymentStatus || undefined,
      })
      .subscribe((shifts) => this.shifts.set(shifts));
  }

  remove(shift: WorkShift): void {
    if (!window.confirm('¿Eliminar este ingreso/salida pendiente?')) {
      return;
    }
    this.api.deleteShift(shift.id).subscribe({
      next: () => {
        this.snack.open('Registro eliminado', 'OK', { duration: 2500 });
        this.load();
      },
      error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
    });
  }
}
