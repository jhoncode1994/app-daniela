import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { httpErrorMessage } from '../../core/http-error';
import { WorkShift, Worker } from '../../core/models';
import { DurationPipe } from '../../shared/duration.pipe';
import { MoneyPipe } from '../../shared/money.pipe';

@Component({
  selector: 'app-shift-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    DurationPipe,
    MoneyPipe,
  ],
  template: `
    <div class="page-enter">
      <p class="eyebrow">Fichaje</p>
      <h1>Registrar jornada</h1>
      <p class="hint">
        Registra solo el ingreso o solo la salida. El valor se calcula cuando hay ingreso y salida.
        Puedes hacer varios tramos el mismo día.
      </p>

      <form [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label>Trabajadora</mat-label>
          <mat-select formControlName="workerId" (selectionChange)="reload()">
            @for (worker of workers(); track worker.id) {
              <mat-option [value]="worker.id">{{ worker.name }} · {{ worker.hourlyRate | money }}/h</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fecha</mat-label>
          <input matInput type="date" formControlName="workDate" (change)="reload()" />
        </mat-form-field>
      </form>

      @if (openShift(); as open) {
        <mat-card class="open-card">
          <p class="status">Ingreso abierto</p>
          <h2>{{ open.startTime }} · {{ open.workDate }}</h2>
          <p>Aún no suma horas. Al registrar la salida se calcula este tramo.</p>

          <form [formGroup]="outForm" (ngSubmit)="clockOut()">
            <mat-form-field appearance="outline">
              <mat-label>Hora de salida</mat-label>
              <input matInput type="time" formControlName="endTime" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Alimentación (minutos)</mat-label>
              <input matInput type="number" formControlName="mealBreakMinutes" />
            </mat-form-field>
            <button
              mat-flat-button
              color="primary"
              class="full"
              type="submit"
              [disabled]="outForm.invalid || saving()"
            >
              Registrar salida
            </button>
          </form>
        </mat-card>
      } @else {
        <mat-card class="in-card">
          <p class="status">Sin ingreso abierto</p>
          <p>Registra la hora en que llegó la trabajadora.</p>
          <form [formGroup]="inForm" (ngSubmit)="clockIn()">
            <mat-form-field appearance="outline">
              <mat-label>Hora de ingreso</mat-label>
              <input matInput type="time" formControlName="startTime" />
            </mat-form-field>
            <button
              mat-flat-button
              color="primary"
              class="full"
              type="submit"
              [disabled]="form.invalid || inForm.invalid || saving()"
            >
              Registrar ingreso
            </button>
          </form>
        </mat-card>
      }

      @if (closedShifts().length > 0 || openShift()) {
        <h2>Este día</h2>
        <mat-card class="totals">
          <p>
            Total calculado:
            <strong>{{ dayNetMinutes() | duration }}</strong>
            ·
            <strong>{{ dayEarned() | money }}</strong>
          </p>
        </mat-card>

        @for (shift of dayShifts(); track shift.id) {
          <mat-card class="item" [class.open]="!shift.endTime">
            @if (shift.endTime) {
              <p class="time">{{ shift.startTime }} – {{ shift.endTime }}</p>
              <p>{{ shift.netMinutes | duration }} · {{ shift.earnedAmount | money }}</p>
            } @else {
              <p class="time">{{ shift.startTime }} – en curso</p>
              <p>Esperando salida</p>
            }
          </mat-card>
        }

        @if (form.value.workerId) {
          <a mat-button [routerLink]="['/jornadas', form.value.workerId]">Ver historial de esta trabajadora</a>
        }
      }
    </div>
  `,
  styles: [
    `
      .hint {
        margin: 0 0 16px;
        color: var(--color-muted-foreground);
      }
      .eyebrow,
      .status {
        margin: 0 0 4px;
        color: var(--color-primary);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      form,
      .in-card,
      .open-card {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .in-card,
      .open-card,
      .item,
      .totals {
        padding: var(--space-md);
        margin-bottom: 12px;
      }
      .open-card {
        border-color: rgba(165, 107, 116, 0.35);
        background: linear-gradient(180deg, #fff8f7 0%, #ffffff 100%);
      }
      .open-card h2 {
        margin: 4px 0 8px;
      }
      .in-card p,
      .open-card p,
      .item p,
      .totals p {
        margin: 6px 0;
        color: var(--color-muted-foreground);
      }
      .time {
        color: var(--color-foreground) !important;
        font-weight: 600;
      }
      .item.open {
        border-style: dashed;
      }
      .full {
        width: 100%;
        min-height: var(--touch);
        margin-top: 8px;
      }
    `,
  ],
})
export class ShiftFormComponent implements OnInit {
  readonly workers = signal<Worker[]>([]);
  readonly dayShifts = signal<WorkShift[]>([]);
  readonly openShift = signal<WorkShift | null>(null);
  readonly saving = signal(false);
  readonly form;
  readonly inForm;
  readonly outForm;

  readonly closedShifts = computed(() => this.dayShifts().filter((shift) => !!shift.endTime));
  readonly dayNetMinutes = computed(() =>
    this.closedShifts().reduce((sum, shift) => sum + shift.netMinutes, 0),
  );
  readonly dayEarned = computed(() =>
    this.closedShifts().reduce((sum, shift) => sum + shift.earnedAmount, 0),
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly snack: MatSnackBar,
    private readonly route: ActivatedRoute,
  ) {
    this.form = this.fb.nonNullable.group({
      workerId: ['', Validators.required],
      workDate: [todayLocal(), Validators.required],
    });
    this.inForm = this.fb.nonNullable.group({
      startTime: ['', Validators.required],
    });
    this.outForm = this.fb.nonNullable.group({
      endTime: ['', Validators.required],
      mealBreakMinutes: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.api.getWorkers().subscribe((workers) => {
      const active = workers.filter((worker) => worker.active);
      this.workers.set(active);
      const queryWorkerId = this.route.snapshot.queryParamMap.get('workerId');
      if (queryWorkerId && active.some((worker) => worker.id === queryWorkerId)) {
        this.form.patchValue({ workerId: queryWorkerId });
      } else if (active.length === 1) {
        this.form.patchValue({ workerId: active[0].id });
      }
      this.reload();
    });
  }

  reload(): void {
    const { workerId, workDate } = this.form.getRawValue();
    if (!workerId || !workDate) {
      this.dayShifts.set([]);
      this.openShift.set(null);
      return;
    }

    this.api.getShifts({ workerId, from: workDate, to: workDate }).subscribe({
      next: (shifts) => this.dayShifts.set(shifts),
      error: () => this.dayShifts.set([]),
    });

    this.api.getOpenShift(workerId).subscribe({
      next: (open) => this.openShift.set(open),
      error: () => this.openShift.set(null),
    });
  }

  clockIn(): void {
    if (this.form.invalid || this.inForm.invalid) {
      return;
    }
    this.saving.set(true);
    const { workerId, workDate } = this.form.getRawValue();
    this.api
      .clockIn({
        workerId,
        workDate,
        startTime: this.inForm.getRawValue().startTime,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.snack.open('Ingreso registrado', 'OK', { duration: 2500 });
          this.inForm.reset({ startTime: '' });
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 });
        },
      });
  }

  clockOut(): void {
    if (this.form.invalid || this.outForm.invalid) {
      return;
    }
    this.saving.set(true);
    const { workerId } = this.form.getRawValue();
    const { endTime, mealBreakMinutes } = this.outForm.getRawValue();
    this.api.clockOut({ workerId, endTime, mealBreakMinutes }).subscribe({
      next: (shift) => {
        this.saving.set(false);
        this.snack.open(
          `Salida registrada · ${Math.floor(shift.netMinutes / 60)}h ${String(shift.netMinutes % 60).padStart(2, '0')}m · ${shift.earnedAmount.toLocaleString('es-CO')}`,
          'OK',
          { duration: 3500 },
        );
        this.outForm.reset({ endTime: '', mealBreakMinutes: 0 });
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 });
      },
    });
  }
}

function todayLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
