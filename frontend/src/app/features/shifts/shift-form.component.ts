import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { httpErrorMessage } from '../../core/http-error';
import { ShiftPreview, Worker } from '../../core/models';
import { DurationPipe } from '../../shared/duration.pipe';
import { MoneyPipe } from '../../shared/money.pipe';

@Component({
  selector: 'app-shift-form',
  imports: [
    ReactiveFormsModule,
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
    <h1>Registrar jornada</h1>
    <form [formGroup]="form">
      <mat-form-field appearance="outline">
        <mat-label>Trabajadora</mat-label>
        <mat-select formControlName="workerId">
          @for (worker of workers(); track worker.id) {
            <mat-option [value]="worker.id">{{ worker.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Fecha</mat-label>
        <input matInput type="date" formControlName="workDate" />
      </mat-form-field>
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
      <button mat-stroked-button type="button" class="full" [disabled]="form.invalid || loading()" (click)="preview()">
        Calcular
      </button>
    </form>

    @if (previewResult(); as result) {
      <mat-card class="preview">
        <h2>Revisa antes de guardar</h2>
        <p>Tiempo bruto: <strong>{{ result.grossMinutes | duration }}</strong></p>
        <p>Alimentación: <strong>{{ result.mealBreakMinutes | duration }}</strong></p>
        <p>Tiempo neto: <strong>{{ result.netMinutes | duration }}</strong></p>
        <p>Valor hora: <strong>{{ result.hourlyRate | money }}</strong></p>
        <p>Total ganado: <strong>{{ result.earnedAmount | money }}</strong></p>
        <button mat-flat-button color="primary" class="full" type="button" [disabled]="saving()" (click)="save()">
          Guardar jornada
        </button>
      </mat-card>
    }
  `,
  styles: [
    `
      form, .preview { display: flex; flex-direction: column; gap: 4px; }
      .preview { margin-top: var(--space-md); padding: var(--space-md); }
      .preview p { margin: 8px 0; color: var(--color-muted-foreground); }
      .full { width: 100%; min-height: var(--touch); margin: 8px 0; }
    `,
  ],
})
export class ShiftFormComponent implements OnInit {
  readonly workers = signal<Worker[]>([]);
  readonly previewResult = signal<ShiftPreview | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
    private readonly snack: MatSnackBar,
    private readonly router: Router,
  ) {
    this.form = fb.nonNullable.group({
      workerId: ['', Validators.required],
      workDate: [todayLocal(), Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      mealBreakMinutes: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.api.getWorkers().subscribe((workers) => {
      const active = workers.filter((worker) => worker.active);
      this.workers.set(active);
      if (active.length === 1) {
        this.form.patchValue({ workerId: active[0].id });
      }
    });
  }

  preview(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading.set(true);
    this.api.previewShift(this.form.getRawValue()).subscribe({
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
    this.api.createShift(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Jornada guardada', 'OK', { duration: 2500 });
        void this.router.navigate(['/jornadas']);
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
