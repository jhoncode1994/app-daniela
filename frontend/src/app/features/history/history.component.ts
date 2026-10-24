import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { httpErrorMessage } from '../../core/http-error';
import { Lot, WorkShift, Worker, Provider } from '../../core/models';
import { EditShiftDialogComponent } from './edit-shift.dialog';
import { DurationPipe } from '../../shared/duration.pipe';
import { MoneyPipe } from '../../shared/money.pipe';

interface DayGroup {
  workDate: string;
  shifts: WorkShift[];
  netMinutes: number;
  earnedAmount: number;
  pendingCount: number;
}

interface LotDebtRow {
  lotId: string | null;
  reference: string;
  pendingAmount: number;
  pendingMinutes: number;
  shiftCount: number;
}

interface ProviderDebt {
  providerId: string;
  providerName: string;
  pendingAmount: number;
  pendingMinutes: number;
  shiftCount: number;
  lots: LotDebtRow[];
}

type QuickFilter = 'all' | 'pending' | 'week' | 'month';

function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

@Component({
  selector: 'app-history',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    DurationPipe,
    MoneyPipe,
  ],
  template: `
    <div class="page-enter">
    @if (loadingWorkers()) {
      <span class="skeleton" style="height: 28px; width: 40%; margin-bottom: 16px"></span>
      <span class="skeleton" style="height: 72px; margin-bottom: 10px"></span>
      <span class="skeleton" style="height: 72px"></span>
    } @else if (!selectedWorker()) {
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
        <mat-card class="empty-state">
          <mat-icon aria-hidden="true">group_add</mat-icon>
          <p>Todavía no hay trabajadoras.</p>
          <a mat-flat-button color="primary" routerLink="/trabajadoras">Agregar trabajadora</a>
        </mat-card>
      }
    } @else {
      <a mat-button routerLink="/jornadas" class="back">
        <mat-icon>arrow_back</mat-icon>
        Trabajadoras
      </a>
      <p class="eyebrow">Historial</p>
      <h1>{{ selectedWorker()!.name }}</h1>
      <div class="segmented" role="group" aria-label="Filtros rápidos">
        @for (option of quickOptions; track option.id) {
          <button
            type="button"
            [class.on]="quick() === option.id"
            [attr.aria-pressed]="quick() === option.id"
            (click)="applyQuick(option.id)"
          >
            {{ option.label }}
          </button>
        }
      </div>

      <details class="advanced" [open]="quick() === null">
        <summary>Más filtros (proveedor, fechas, estado)</summary>
        <form [formGroup]="form" (ngSubmit)="applyCustom()">
          <mat-form-field appearance="outline">
            <mat-label>Proveedor</mat-label>
            <mat-select formControlName="providerId" (selectionChange)="load()">
              <mat-option value="">Todos</mat-option>
              @for (provider of providers(); track provider.id) {
                <mat-option [value]="provider.id">{{ provider.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Referencia</mat-label>
            <mat-select formControlName="lotId" (selectionChange)="load()">
              <mat-option value="">Todas</mat-option>
              @for (lot of visibleLots(); track lot.id) {
                <mat-option [value]="lot.id">
                  {{ lot.reference }}@if (!form.value.providerId) { · {{ lot.provider.name }} }
                </mat-option>
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
          <button mat-flat-button color="primary" type="submit" class="full">Aplicar filtros</button>
        </form>
      </details>

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
                <ul class="debt-lots">
                  @for (lot of debt.lots; track lot.lotId ?? 'none') {
                    <li>
                      @if (!lot.lotId) {
                        <span class="debt-lot-plain">
                          <span>{{ lot.reference }}</span>
                          <strong>{{ lot.pendingAmount | money }}</strong>
                        </span>
                      } @else {
                        <a
                          [routerLink]="['/liquidaciones']"
                          [queryParams]="{
                            workerId: selectedWorker()!.id,
                            providerId: debt.providerId,
                            lotId: lot.lotId,
                          }"
                        >
                          <span>{{ lot.reference }}</span>
                          <strong>{{ lot.pendingAmount | money }}</strong>
                        </a>
                      }
                    </li>
                  }
                </ul>
              </mat-card>
            }
          </div>
          <mat-card class="debt-total">
            <span>Total adeudado</span>
            <strong>{{ totalPending() | money }}</strong>
          </mat-card>
        } @else {
          <mat-card class="empty-state">
            <mat-icon aria-hidden="true">task_alt</mat-icon>
            <p>Al día: no hay montos pendientes con ningún proveedor.</p>
          </mat-card>
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
                    <span class="ref">{{ shift.lot?.reference ?? 'Sin referencia' }}</span> ·
                    Alimentación {{ shift.mealBreakMinutes }} min ·
                    {{ shift.netMinutes | duration }} ·
                    {{ shift.earnedAmount | money }}
                  </p>
                } @else {
                  <p class="time">{{ shift.startTime }} – en curso</p>
                  <p>
                    {{ shift.provider.name }} ·
                    <span class="ref">{{ shift.lot?.reference ?? 'Sin referencia' }}</span> ·
                    Ingreso abierto · aún no suma al total
                  </p>
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
                  <div class="row-buttons">
                    <button mat-button type="button" (click)="edit(shift)">Editar</button>
                    <button mat-button color="warn" type="button" (click)="remove(shift)">Quitar</button>
                  </div>
                }
              </div>
            </div>
          }
        </mat-card>
      } @empty {
        <mat-card class="empty-state">
          <mat-icon aria-hidden="true">event_busy</mat-icon>
          <p>No hay registros con estos filtros.</p>
          <a
            mat-stroked-button
            [routerLink]="['/jornadas/nueva']"
            [queryParams]="{ workerId: selectedWorker()!.id }"
          >
            Registrar una jornada
          </a>
        </mat-card>
      }
    }
    </div>
  `,
  styles: [
    `
      .empty,
      .day-total {
        color: var(--color-muted-foreground);
      }
      .back {
        margin: 0 0 var(--space-sm) -8px;
        display: inline-flex;
        gap: 4px;
        color: var(--color-muted-foreground);
      }
      .back mat-icon {
        width: 19px;
        height: 19px;
        font-size: 19px;
      }
      .segmented {
        margin: 0 0 var(--space-md);
      }
      .advanced {
        margin-bottom: var(--space-md);
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        background: var(--color-card);
        padding: 0 var(--space-md);
      }
      .advanced summary {
        min-height: 48px;
        display: flex;
        align-items: center;
        font-weight: 600;
        color: var(--color-primary);
        cursor: pointer;
      }
      .ref {
        color: var(--color-primary);
        font-weight: 600;
      }
      .debt-lots {
        list-style: none;
        margin: 8px 0 0;
        padding: 0;
        display: grid;
        gap: 2px;
      }
      .debt-lots a,
      .debt-lot-plain {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-height: 38px;
        padding: 2px 0;
        color: inherit;
        text-decoration: none;
        border-top: 1px dashed var(--color-border);
      }
      .debt-lots a strong {
        color: var(--color-primary);
        white-space: nowrap;
      }
      .debt-lots a span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .advanced form {
        padding-bottom: var(--space-sm);
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
        width: 46px;
        height: 46px;
        border-radius: 15px;
        display: grid;
        place-items: center;
        background: linear-gradient(145deg, var(--color-muted), var(--surface-3));
        border: 1px solid var(--color-border);
        color: var(--color-primary);
        font-size: 1.15rem;
        font-weight: 800;
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
        font-size: 1.15rem;
        font-weight: 800;
      }
      .day-head h3 {
        font-size: 1.05rem;
      }
      .segment {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-top: 12px;
        margin-top: 12px;
        border-top: 1px solid var(--color-border);
      }
      .row-buttons {
        display: flex;
        gap: 4px;
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
        font-weight: 700 !important;
      }
      mat-chip.paid {
        background: var(--color-success-soft);
        color: var(--color-success);
      }
      mat-chip.open-chip {
        background: var(--warn-soft);
        color: var(--warn);
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
      @media (min-width: 960px) {
        .debt-grid {
          grid-template-columns: repeat(3, 1fr);
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
        background: linear-gradient(170deg, var(--tint) 0%, var(--color-card) 60%);
        border-color: var(--color-primary-line);
      }
      .debt-label {
        color: var(--color-primary);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .debt-card strong,
      .debt-total strong {
        color: var(--color-primary);
        font-size: 1.35rem;
        font-weight: 800;
        letter-spacing: -0.02em;
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
  readonly loadingWorkers = signal(true);
  readonly selectedWorkerId = signal<string | null>(null);
  readonly quick = signal<QuickFilter | null>('all');
  readonly quickOptions: { id: QuickFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'pending', label: 'Pendientes' },
    { id: 'week', label: 'Esta semana' },
    { id: 'month', label: 'Este mes' },
  ];
  readonly form;

  readonly lots = signal<Lot[]>([]);
  readonly providerFilter = signal('');

  readonly visibleLots = computed(() => {
    const providerId = this.providerFilter();
    const lots = this.lots();
    return providerId ? lots.filter((lot) => lot.providerId === providerId) : lots;
  });

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
      let provider = map.get(shift.providerId);
      if (!provider) {
        provider = {
          providerId: shift.providerId,
          providerName: shift.provider.name,
          pendingAmount: 0,
          pendingMinutes: 0,
          shiftCount: 0,
          lots: [],
        };
        map.set(shift.providerId, provider);
      }
      provider.pendingAmount += shift.earnedAmount;
      provider.pendingMinutes += shift.netMinutes;
      provider.shiftCount += 1;

      const key = shift.lotId ?? '';
      let lot = provider.lots.find((item) => (item.lotId ?? '') === key);
      if (!lot) {
        lot = {
          lotId: shift.lotId,
          reference: shift.lot?.reference ?? 'Sin referencia',
          pendingAmount: 0,
          pendingMinutes: 0,
          shiftCount: 0,
        };
        provider.lots.push(lot);
      }
      lot.pendingAmount += shift.earnedAmount;
      lot.pendingMinutes += shift.netMinutes;
      lot.shiftCount += 1;
    }
    const debts = [...map.values()].sort((a, b) =>
      a.providerName.localeCompare(b.providerName, 'es'),
    );
    for (const debt of debts) {
      debt.lots.sort((a, b) => b.pendingAmount - a.pendingAmount);
    }
    return debts;
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
    private readonly dialog: MatDialog,
  ) {
    this.form = fb.nonNullable.group({
      providerId: [''],
      lotId: [''],
      from: [''],
      to: [''],
      paymentStatus: [''],
    });
    this.form.controls.providerId.valueChanges.subscribe(() => {
      this.form.patchValue({ lotId: '' }, { emitEvent: false });
      this.providerFilter.set(this.form.getRawValue().providerId);
    });
  }

  ngOnInit(): void {
    this.api.getProviders().subscribe((providers) => this.providers.set(providers));
    this.api.getLots().subscribe((lots) => this.lots.set(lots));
    const queryLotId = this.route.snapshot.queryParamMap.get('lotId');
    if (queryLotId) {
      this.form.patchValue({ lotId: queryLotId }, { emitEvent: false });
    }
    this.api.getWorkers().subscribe((workers) => {
      this.workers.set(workers);
      this.loadingWorkers.set(false);
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

  applyQuick(id: QuickFilter): void {
    const today = new Date();
    const patch = { from: '', to: '', paymentStatus: '' };
    if (id === 'pending') {
      patch.paymentStatus = 'PENDIENTE';
    } else if (id === 'week') {
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      patch.from = formatLocalDate(monday);
      patch.to = formatLocalDate(today);
    } else if (id === 'month') {
      patch.from = formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1));
      patch.to = formatLocalDate(today);
    }
    this.form.patchValue(patch);
    this.quick.set(id);
    this.load();
  }

  applyCustom(): void {
    this.quick.set(null);
    this.load();
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
        lotId: value.lotId || undefined,
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

  edit(shift: WorkShift): void {
    this.dialog
      .open(EditShiftDialogComponent, {
        width: 'min(420px, 92vw)',
        data: {
          shift,
          lots: this.lots().filter((lot) => lot.providerId === shift.providerId),
        },
      })
      .afterClosed()
      .subscribe((changes) => {
        if (!changes) {
          return;
        }
        this.api.updateShift(shift.id, changes).subscribe({
          next: () => {
            this.snack.open('Registro corregido', 'OK', { duration: 2500 });
            this.load();
            this.loadPendingDebts();
          },
          error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
        });
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
