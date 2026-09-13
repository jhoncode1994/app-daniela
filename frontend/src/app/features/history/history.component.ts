import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-history',
  imports: [
    ReactiveFormsModule,
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
    <h1>Historial</h1>
    <form [formGroup]="form" (ngSubmit)="load()">
      <mat-form-field appearance="outline">
        <mat-label>Trabajadora</mat-label>
        <mat-select formControlName="workerId">
          <mat-option value="">Todas</mat-option>
          @for (worker of workers(); track worker.id) {
            <mat-option [value]="worker.id">{{ worker.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
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

    @for (shift of shifts(); track shift.id) {
      <mat-card class="item">
        <div class="top">
          <div>
            <h3>{{ shift.worker.name }}</h3>
            <p>{{ shift.workDate }} · {{ shift.startTime }} - {{ shift.endTime }}</p>
          </div>
          <mat-chip [class.paid]="shift.paymentStatus === 'PAGADA'">
            {{ shift.paymentStatus === 'PAGADA' ? 'Pagada' : 'Pendiente' }}
          </mat-chip>
        </div>
        <p>Alimentación: {{ shift.mealBreakMinutes }} min</p>
        <p>Neto: {{ shift.netMinutes | duration }} · {{ shift.earnedAmount | money }}</p>
        @if (shift.paymentStatus === 'PENDIENTE') {
          <button mat-button color="warn" type="button" (click)="remove(shift)">Eliminar</button>
        }
      </mat-card>
    } @empty {
      <p class="empty">No hay jornadas con esos filtros.</p>
    }
  `,
  styles: [
    `
      form { display: flex; flex-direction: column; }
      .full { min-height: var(--touch); margin-bottom: var(--space-md); }
      .item { padding: var(--space-md); margin-bottom: 12px; }
      .top { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
      h3, p { margin: 0 0 6px; }
      p, .empty { color: var(--color-muted-foreground); }
      mat-chip { background: var(--color-muted); }
      mat-chip.paid { background: var(--color-success-soft); color: var(--color-success); }
    `,
  ],
})
export class HistoryComponent implements OnInit {
  readonly workers = signal<Worker[]>([]);
  readonly shifts = signal<WorkShift[]>([]);
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
    private readonly snack: MatSnackBar,
  ) {
    this.form = fb.nonNullable.group({
      workerId: [''],
      from: [''],
      to: [''],
      paymentStatus: [''],
    });
  }

  ngOnInit(): void {
    this.api.getWorkers().subscribe((workers) => this.workers.set(workers));
    this.load();
  }

  load(): void {
    const value = this.form.getRawValue();
    this.api
      .getShifts({
        workerId: value.workerId || undefined,
        from: value.from || undefined,
        to: value.to || undefined,
        paymentStatus: value.paymentStatus || undefined,
      })
      .subscribe((shifts) => this.shifts.set(shifts));
  }

  remove(shift: WorkShift): void {
    if (!window.confirm('¿Eliminar esta jornada pendiente?')) {
      return;
    }
    this.api.deleteShift(shift.id).subscribe({
      next: () => {
        this.snack.open('Jornada eliminada', 'OK', { duration: 2500 });
        this.load();
      },
      error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
    });
  }
}
