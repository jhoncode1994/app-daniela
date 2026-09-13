import { Component, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { httpErrorMessage } from '../../core/http-error';
import { BatchShiftPreview, WorkShift, Worker } from '../../core/models';
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
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    DurationPipe,
    MoneyPipe,
  ],
  template: `
    <h1>Registrar jornada</h1>
    <p class="hint">Puedes agregar varios ingresos y salidas el mismo día. Cada uno suma al total.</p>

    <form [formGroup]="form">
      <mat-form-field appearance="outline">
        <mat-label>Trabajadora</mat-label>
        <mat-select formControlName="workerId" (selectionChange)="reloadDayShifts()">
          @for (worker of workers(); track worker.id) {
            <mat-option [value]="worker.id">{{ worker.name }} · {{ worker.hourlyRate | money }}/h</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Fecha</mat-label>
        <input matInput type="date" formControlName="workDate" (change)="reloadDayShifts()" />
      </mat-form-field>

      <div formArrayName="segments" class="segments">
        @for (segment of segments.controls; track $index; let i = $index) {
          <mat-card class="segment" [formGroupName]="i">
            <div class="segment-head">
              <h2>Ingreso / salida {{ i + 1 }}</h2>
              @if (segments.length > 1) {
                <button mat-button type="button" color="warn" (click)="removeSegment(i)">Quitar</button>
              }
            </div>
            <mat-form-field appearance="outline">
              <mat-label>Hora de ingreso</mat-label>
              <input matInput type="time" formControlName="startTime" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Hora de salida</mat-label>
              <input matInput type="time" formControlName="endTime" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Alimentación (minutos)</mat-label>
              <input matInput type="number" formControlName="mealBreakMinutes" />
            </mat-form-field>
          </mat-card>
        }
      </div>

      <button mat-stroked-button type="button" class="full" (click)="addSegment()">
        <mat-icon>add</mat-icon>
        Agregar otro ingreso / salida
      </button>

      <button
        mat-stroked-button
        type="button"
        class="full"
        [disabled]="form.invalid || loading()"
        (click)="preview()"
      >
        Calcular total del día
      </button>
    </form>

    @if (previewResult(); as result) {
      <mat-card class="preview">
        <h2>Revisa antes de guardar</h2>
        @for (segment of result.segments; track $index) {
          <p>
            {{ segment.startTime }} – {{ segment.endTime }}:
            <strong>{{ segment.netMinutes | duration }}</strong>
            · {{ segment.earnedAmount | money }}
          </p>
        }
        <p>Tiempo bruto: <strong>{{ result.totals.grossMinutes | duration }}</strong></p>
        <p>Alimentación: <strong>{{ result.totals.mealBreakMinutes | duration }}</strong></p>
        <p>Tiempo neto: <strong>{{ result.totals.netMinutes | duration }}</strong></p>
        <p>Valor hora: <strong>{{ result.totals.hourlyRate | money }}</strong></p>
        <p>Total ganado: <strong>{{ result.totals.earnedAmount | money }}</strong></p>
        <button
          mat-flat-button
          color="primary"
          class="full"
          type="button"
          [disabled]="saving()"
          (click)="save()"
        >
          Guardar {{ result.segments.length }} registro(s)
        </button>
      </mat-card>
    }

    @if (dayShifts().length > 0) {
      <h2>Ya registrados este día</h2>
      @for (shift of dayShifts(); track shift.id) {
        <mat-card class="item">
          <p>{{ shift.startTime }} – {{ shift.endTime }}</p>
          <p>{{ shift.netMinutes | duration }} · {{ shift.earnedAmount | money }}</p>
        </mat-card>
      }
    }

    <a mat-button routerLink="/jornadas">Ver historial</a>
  `,
  styles: [
    `
      .hint {
        margin: 0 0 16px;
        color: var(--color-muted-foreground);
      }
      form,
      .preview,
      .segment {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .segments {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 8px;
      }
      .segment,
      .preview,
      .item {
        padding: var(--space-md);
        margin-bottom: 12px;
      }
      .segment-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }
      .segment-head h2,
      .preview h2 {
        margin: 0 0 8px;
        font-size: 1.05rem;
      }
      .preview p,
      .item p {
        margin: 6px 0;
        color: var(--color-muted-foreground);
      }
      .full {
        width: 100%;
        min-height: var(--touch);
        margin: 8px 0;
      }
    `,
  ],
})
export class ShiftFormComponent implements OnInit {
  readonly workers = signal<Worker[]>([]);
  readonly previewResult = signal<BatchShiftPreview | null>(null);
  readonly dayShifts = signal<WorkShift[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly snack: MatSnackBar,
  ) {
    this.form = this.fb.nonNullable.group({
      workerId: ['', Validators.required],
      workDate: [todayLocal(), Validators.required],
      segments: this.fb.array([this.createSegment()]),
    });
  }

  get segments(): FormArray {
    return this.form.get('segments') as FormArray;
  }

  ngOnInit(): void {
    this.api.getWorkers().subscribe((workers) => {
      const active = workers.filter((worker) => worker.active);
      this.workers.set(active);
      if (active.length === 1) {
        this.form.patchValue({ workerId: active[0].id });
        this.reloadDayShifts();
      }
    });
  }

  createSegment() {
    return this.fb.nonNullable.group({
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      mealBreakMinutes: [0, [Validators.required, Validators.min(0)]],
    });
  }

  addSegment(): void {
    this.segments.push(this.createSegment());
    this.previewResult.set(null);
  }

  removeSegment(index: number): void {
    this.segments.removeAt(index);
    this.previewResult.set(null);
  }

  reloadDayShifts(): void {
    const { workerId, workDate } = this.form.getRawValue();
    if (!workerId || !workDate) {
      this.dayShifts.set([]);
      return;
    }
    this.api.getShifts({ workerId, from: workDate, to: workDate }).subscribe({
      next: (shifts) => this.dayShifts.set(shifts),
      error: () => this.dayShifts.set([]),
    });
  }

  preview(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading.set(true);
    this.api.previewBatchShifts(this.form.getRawValue()).subscribe({
      next: (result) => {
        this.previewResult.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.previewResult.set(null);
        this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 });
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.saving.set(true);
    this.api.createBatchShifts(this.form.getRawValue()).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.snack.open(`${created.length} registro(s) guardados`, 'OK', { duration: 2500 });
        this.previewResult.set(null);
        while (this.segments.length > 1) {
          this.segments.removeAt(1);
        }
        this.segments.at(0).reset({ startTime: '', endTime: '', mealBreakMinutes: 0 });
        this.reloadDayShifts();
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
