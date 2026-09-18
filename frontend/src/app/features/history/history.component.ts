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
import { WorkShift, Worker, Provider } from '../../core/models';
import { DurationPipe } from '../../shared/duration.pipe';
import { MoneyPipe } from '../../shared/money.pipe';

interface DayGroup {
  workDate: string;
  shifts: WorkShift[];
  netMinutes: number;
  earnedAmount: number;
  pendingCount: number;
}

interface ProviderDebt {
  providerId: string;
  providerName: string;
  pendingAmount: number;
  pendingMinutes: number;
  shiftCount: number;
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
    <div class="page-enter">
    @if (!selectedWorker()) {
      <p class="eyebrow">Por persona</p>
      <h1>Historial</h1>
      <p class="hint">Elige una trabajadora para ver solo su historial.</p>
      @for (worker of workers(); track worker.id) {
        <a class="worker-link" [routerLink]="['/jornadas', worker.id]">
          <mat-card class="worker-card">
            <div class="avatar" aria-hidden="true">{{ worker.name.charAt(0) }}</div>
            <div>
              <h3>{{ worker.name }}</h3>
              <p>{{ worker.hourlyRate | money }} / hora</p>
            </div>
          </mat-card>
        </a>
      } @empty {
        <p class="empty">No hay trabajadoras. Agrégalas primero.</p>
      }
    } @else {
      <a mat-button routerLink="/jornadas" class="back">Volver a trabajadoras</a>
      <p class="eyebrow">Historial</p>
      <h1>{{ selectedWorker()!.name }}</h1>
      <p class="hint">
        Filtra por proveedor para ver solo Alma Rosa o solo Bizcocho de esta trabajadora.
      </p>

      <form [formGroup]="form" (ngSubmit)="load()">
        <mat-form-field appearance="outline">
          <mat-label>Proveedor</mat-label>
          <mat-select formControlName="providerId">
            <mat-option value="">Todos</mat-option>
            @for (provider of providers(); track provider.id) {
              <mat-option [value]="provider.id">{{ provider.name }}</mat-option>
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

      <a
        mat-stroked-button
        class="full"
        [routerLink]="['/jornadas/nueva']"
        [queryParams]="{ workerId: selectedWorker()!.id }"
      >
        Registrar jornada
      </a>

      <section class="debts">
        <h2>Pendiente por proveedor</h2>
        @if (providerDebts().length > 0) {
          <div class="debt-grid">
            @for (debt of providerDebts(); track debt.providerId) {
              <mat-card class="debt-card">
                <span class="debt-label">{{ debt.providerName }}</span>
                <strong>{{ debt.pendingAmount | money }}</strong>
                <p>{{ debt.pendingMinutes | duration }} · {{ debt.shiftCount }} registro(s)</p>
                <a
                  mat-button
                  color="primary"
                  [routerLink]="['/liquidaciones']"
                  [queryParams]="{
                    workerId: selectedWorker()!.id,
                    providerId: debt.providerId
                  }"
                >
                  Liquidar
                </a>
              </mat-card>
            }
          </div>
          <mat-card class="debt-total">
            <span>Total adeudado</span>
            <strong>{{ totalPending() | money }}</strong>
          </mat-card>
        } @else {
          <p class="empty">No hay montos pendientes con ningún proveedor.</p>
        }
      </section>

      <h2>Registros</h2>
      @for (day of dayGroups(); track day.workDate) {
        <mat-card class="day">
          <div class="day-head">
            <h3>{{ day.workDate }}</h3>
            <strong>{{ day.earnedAmount | money }}</strong>
          </div>
          <p class="day-total">Total neto del día: {{ day.netMinutes | duration }}</p>
          @for (shift of day.shifts; track shift.id) {
            <div class="segment">
              <div>
                @if (shift.endTime) {
                  <p class="time">{{ shift.startTime }} – {{ shift.endTime }}</p>
                  <p>
                    {{ shift.provider.name }} ·
                    Alimentación {{ shift.mealBreakMinutes }} min ·
                    {{ shift.netMinutes | duration }} ·
                    {{ shift.earnedAmount | money }}
                  </p>
                } @else {
                  <p class="time">{{ shift.startTime }} – en curso</p>
                  <p>{{ shift.provider.name }} · Ingreso abierto · aún no suma al total</p>
                }
              </div>
              <div class="segment-actions">
                @if (shift.endTime) {
                  <mat-chip [class.paid]="shift.paymentStatus === 'PAGADA'">
                    {{ shift.paymentStatus === 'PAGADA' ? 'Pagada' : 'Pendiente' }}
                  </mat-chip>
                } @else {
                  <mat-chip class="open-chip">En curso</mat-chip>
                }
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
    </div>
  `,
  styles: [
    `
      .eyebrow {
        margin: 0 0 4px;
        color: var(--color-primary);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .hint,
      .empty,
      .day-total {
        color: var(--color-muted-foreground);
      }
      .back {
        margin: 0 0 8px -8px;
      }
      .worker-link {
        text-decoration: none;
        color: inherit;
        display: block;
        margin-bottom: 10px;
      }
      .worker-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: var(--space-md);
      }
      .avatar {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: var(--color-muted);
        color: var(--color-primary);
        font-weight: 700;
        flex-shrink: 0;
      }
      .day {
        padding: var(--space-md);
        margin-bottom: 12px;
      }
      .worker-card h3,
      .day-head h3,
      .segment p {
        margin: 0 0 4px;
      }
      .worker-card p,
      .segment p:not(.time) {
        margin: 0;
        color: var(--color-muted-foreground);
      }
      .time {
        color: var(--color-foreground) !important;
        font-weight: 600;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 4px;
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
      .day-head strong {
        color: var(--color-primary);
        font-size: 1.05rem;
      }
      .segment {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-top: 10px;
        margin-top: 10px;
        border-top: 1px solid var(--color-border);
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
      mat-chip.open-chip {
        background: #fff1e8;
        color: #9a5b2f;
      }
      .debts {
        margin: 8px 0 20px;
      }
      .debts h2,
      h2 {
        margin: 8px 0 12px;
        font-size: 1.05rem;
      }
      .debt-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }
      @media (min-width: 520px) {
        .debt-grid {
          grid-template-columns: 1fr 1fr;
        }
      }
      .debt-card,
      .debt-total {
        padding: var(--space-md);
      }
      .debt-card {
        display: flex;
        flex-direction: column;
        gap: 4px;
        background: linear-gradient(180deg, #fff8f7 0%, #ffffff 100%);
        border-color: rgba(165, 107, 116, 0.28);
      }
      .debt-label {
        color: var(--color-primary);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .debt-card strong,
      .debt-total strong {
        color: var(--color-primary);
        font-size: 1.25rem;
      }
      .debt-card p {
        margin: 0;
        color: var(--color-muted-foreground);
      }
      .debt-card a {
        align-self: flex-start;
        margin: 4px 0 0 -8px;
        min-height: 40px;
      }
      .debt-total {
        margin-top: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .debt-total span {
        font-weight: 600;
      }
    `,
  ],
})
export class HistoryComponent implements OnInit {
  readonly workers = signal<Worker[]>([]);
  readonly providers = signal<Provider[]>([]);
  readonly shifts = signal<WorkShift[]>([]);
  readonly pendingShifts = signal<WorkShift[]>([]);
  readonly selectedWorkerId = signal<string | null>(null);
  readonly form;

  readonly selectedWorker = computed(() => {
    const id = this.selectedWorkerId();
    return this.workers().find((worker) => worker.id === id) ?? null;
  });

  readonly providerDebts = computed(() => {
    const map = new Map<string, ProviderDebt>();
    for (const shift of this.pendingShifts()) {
      if (!shift.endTime || shift.paymentStatus !== 'PENDIENTE') {
        continue;
      }
      const existing = map.get(shift.providerId);
      if (existing) {
        existing.pendingAmount += shift.earnedAmount;
        existing.pendingMinutes += shift.netMinutes;
        existing.shiftCount += 1;
      } else {
        map.set(shift.providerId, {
          providerId: shift.providerId,
          providerName: shift.provider.name,
          pendingAmount: shift.earnedAmount,
          pendingMinutes: shift.netMinutes,
          shiftCount: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.providerName.localeCompare(b.providerName, 'es'));
  });

  readonly totalPending = computed(() =>
    this.providerDebts().reduce((sum, debt) => sum + debt.pendingAmount, 0),
  );

  readonly dayGroups = computed(() => {
    const map = new Map<string, DayGroup>();
    for (const shift of this.shifts()) {
      const existing = map.get(shift.workDate);
      const countsTowardTotal = !!shift.endTime;
      if (existing) {
        existing.shifts.push(shift);
        if (countsTowardTotal) {
          existing.netMinutes += shift.netMinutes;
          existing.earnedAmount += shift.earnedAmount;
          if (shift.paymentStatus === 'PENDIENTE') {
            existing.pendingCount += 1;
          }
        }
      } else {
        map.set(shift.workDate, {
          workDate: shift.workDate,
          shifts: [shift],
          netMinutes: countsTowardTotal ? shift.netMinutes : 0,
          earnedAmount: countsTowardTotal ? shift.earnedAmount : 0,
          pendingCount: countsTowardTotal && shift.paymentStatus === 'PENDIENTE' ? 1 : 0,
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
      providerId: [''],
      from: [''],
      to: [''],
      paymentStatus: [''],
    });
  }

  ngOnInit(): void {
    this.api.getProviders().subscribe((providers) => this.providers.set(providers));
    this.api.getWorkers().subscribe((workers) => {
      this.workers.set(workers);
      this.route.paramMap.subscribe((params) => {
        const workerId = params.get('workerId');
        this.selectedWorkerId.set(workerId);
        if (workerId) {
          this.load();
          this.loadPendingDebts();
        } else {
          this.shifts.set([]);
          this.pendingShifts.set([]);
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
        providerId: value.providerId || undefined,
        from: value.from || undefined,
        to: value.to || undefined,
        paymentStatus: value.paymentStatus || undefined,
      })
      .subscribe((shifts) => this.shifts.set(shifts));
  }

  loadPendingDebts(): void {
    const workerId = this.selectedWorkerId();
    if (!workerId) {
      this.pendingShifts.set([]);
      return;
    }
    this.api.getShifts({ workerId, paymentStatus: 'PENDIENTE' }).subscribe({
      next: (shifts) => this.pendingShifts.set(shifts),
      error: () => this.pendingShifts.set([]),
    });
  }

  remove(shift: WorkShift): void {
    if (!window.confirm('¿Eliminar este ingreso/salida pendiente?')) {
      return;
    }
    this.api.deleteShift(shift.id).subscribe({
      next: () => {
        this.snack.open('Registro eliminado', 'OK', { duration: 2500 });
        this.load();
        this.loadPendingDebts();
      },
      error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
    });
  }
}
