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
import { Lot, WorkShift, Worker, Provider } from '../../core/models';
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
        Elige la trabajadora, el proveedor y la referencia del lote. La fecha y la hora ya vienen
        de hoy; toca "Ahora" para actualizar la hora.
      </p>

      <mat-card class="context">
        <p class="label">Para quién y en qué lote</p>
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
          <mat-label>Proveedor</mat-label>
          <mat-select formControlName="providerId" (selectionChange)="onProviderChange()">
            @for (provider of providers(); track provider.id) {
              <mat-option [value]="provider.id">{{ provider.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Referencia del lote</mat-label>
          <mat-select formControlName="lotId" (selectionChange)="onLotChange()">
            @for (lot of lots(); track lot.id) {
              <mat-option [value]="lot.id">{{ lot.reference }}</mat-option>
            }
          </mat-select>
          @if (!form.value.providerId) {
            <mat-hint>Elige primero el proveedor.</mat-hint>
          } @else if (lots().length === 0) {
            <mat-hint>Ese proveedor no tiene referencias en el taller.</mat-hint>
          }
        </mat-form-field>

        @if (form.value.providerId && lots().length === 0) {
          <a mat-stroked-button class="full" routerLink="/referencias">Registrar una referencia</a>
        }

        <mat-form-field appearance="outline">
          <mat-label>Fecha</mat-label>
          <input matInput type="date" formControlName="workDate" (change)="reload()" />
        </mat-form-field>
        </form>
      </mat-card>

      @if (openShift(); as open) {
        <mat-card class="open-card">
          <span class="pill is-success">Ingreso abierto</span>
          <h2>{{ open.startTime }} · {{ open.workDate }}</h2>
          <p>
            {{ open.provider.name }}@if (open.lot) { · Ref. <strong>{{ open.lot.reference }}</strong> }
            · aún no suma horas.
          </p>

          <form [formGroup]="outForm" (ngSubmit)="clockOut()">
            <mat-form-field appearance="outline">
              <mat-label>Hora de salida</mat-label>
              <input matInput type="time" formControlName="endTime" />
            </mat-form-field>
            <button mat-stroked-button class="now" type="button" (click)="setNow(outForm.controls.endTime)">
              Ahora
            </button>
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
          <span class="pill is-off">Sin ingreso abierto</span>
          <p>Registra la hora en que llegó la trabajadora.</p>
          <form [formGroup]="inForm" (ngSubmit)="clockIn()">
            <mat-form-field appearance="outline">
              <mat-label>Hora de ingreso</mat-label>
              <input matInput type="time" formControlName="startTime" />
            </mat-form-field>
            <button mat-stroked-button class="now" type="button" (click)="setNow(inForm.controls.startTime)">
              Ahora
            </button>
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
          <div>
            <span class="label">Tiempo pagado</span>
            <strong>{{ dayNetMinutes() | duration }}</strong>
          </div>
          <div>
            <span class="label">Total del día</span>
            <strong class="pay">{{ dayEarned() | money }}</strong>
          </div>
        </mat-card>

        @for (shift of dayShifts(); track shift.id) {
          <mat-card class="item" [class.open]="!shift.endTime">
            <div class="item-main">
              @if (shift.endTime) {
                <p class="time">{{ shift.startTime }} – {{ shift.endTime }}</p>
                <p>
                  {{ shift.provider.name }}@if (shift.lot) { · {{ shift.lot.reference }} } ·
                  {{ shift.netMinutes | duration }}
                </p>
              } @else {
                <p class="time">{{ shift.startTime }} – en curso</p>
                <p>
                  {{ shift.provider.name }}@if (shift.lot) { · {{ shift.lot.reference }} } ·
                  esperando salida
                </p>
              }
            </div>
            @if (shift.endTime) {
              <strong>{{ shift.earnedAmount | money }}</strong>
            }
          </mat-card>
        }

        @if (form.value.workerId) {
          <a mat-button class="full" [routerLink]="['/jornadas', form.value.workerId]">
            Ver historial de esta trabajadora
          </a>
        }
      }
    </div>
  `,
  styles: [
    `
      form,
      .in-card,
      .open-card {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .context,
      .in-card,
      .open-card,
      .item,
      .totals {
        padding: var(--space-md);
        margin-bottom: 12px;
      }
      .context .label {
        margin-bottom: var(--space-sm);
      }
      .open-card {
        border-color: var(--color-primary-line);
        background: linear-gradient(170deg, var(--tint) 0%, var(--color-card) 60%);
      }
      .open-card h2 {
        margin: 10px 0 2px;
        font-size: 1.5rem;
        letter-spacing: -0.03em;
      }
      .in-card p,
      .open-card p,
      .item p {
        margin: 6px 0;
        color: var(--color-muted-foreground);
      }
      .time {
        color: var(--color-foreground) !important;
        font-weight: 700;
        font-size: 1.05rem;
      }
      .totals {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .totals strong {
        font-size: 1.25rem;
        font-weight: 800;
        letter-spacing: -0.02em;
      }
      .totals .pay {
        color: var(--color-primary);
      }
      .item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .item-main {
        min-width: 0;
      }
      .item strong {
        font-size: 1.05rem;
        white-space: nowrap;
      }
      .item.open {
        border-style: dashed;
      }
      .now {
        align-self: flex-start;
        margin-bottom: 8px;
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
  readonly providers = signal<Provider[]>([]);
  readonly lots = signal<Lot[]>([]);
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
      providerId: ['', Validators.required],
      lotId: ['', Validators.required],
      workDate: [todayLocal(), Validators.required],
    });
    this.inForm = this.fb.nonNullable.group({
      startTime: [nowLocal(), Validators.required],
    });
    this.outForm = this.fb.nonNullable.group({
      endTime: [nowLocal(), Validators.required],
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
      } else {
        const saved = readSaved(LAST_WORKER_KEY);
        if (saved && active.some((worker) => worker.id === saved)) {
          this.form.patchValue({ workerId: saved });
        }
      }
      this.reload();
    });

    this.loadProviders();
  }

  private loadProviders(): void {
    this.api.getProviders().subscribe((providers) => {
      const active = providers.filter((provider) => provider.active);
      this.providers.set(active);
      const queryProviderId = this.route.snapshot.queryParamMap.get('providerId');
      if (queryProviderId && active.some((provider) => provider.id === queryProviderId)) {
        this.form.patchValue({ providerId: queryProviderId });
      } else if (active.length === 1) {
        this.form.patchValue({ providerId: active[0].id });
      } else {
        const saved = readSaved(LAST_PROVIDER_KEY);
        if (saved && active.some((provider) => provider.id === saved)) {
          this.form.patchValue({ providerId: saved });
        }
      }
      this.loadLots(this.route.snapshot.queryParamMap.get('lotId'));
      this.reload();
    });
  }

  onProviderChange(): void {
    this.form.patchValue({ lotId: '' });
    this.loadLots(null);
    this.reload();
  }

  onLotChange(): void {
    const { lotId } = this.form.getRawValue();
    if (lotId) {
      writeSaved(LAST_LOT_KEY, lotId);
    }
    this.reload();
  }

  // Solo se ofrecen las referencias que siguen en el taller.
  private loadLots(preferredLotId: string | null): void {
    const { providerId } = this.form.getRawValue();
    if (!providerId) {
      this.lots.set([]);
      return;
    }
    this.api.getLots({ providerId, closed: false }).subscribe({
      next: (lots) => {
        this.lots.set(lots);
        const saved = readSaved(LAST_LOT_KEY);
        const pick = [preferredLotId, saved].find((id) => id && lots.some((lot) => lot.id === id));
        if (pick) {
          this.form.patchValue({ lotId: pick });
        } else if (lots.length === 1) {
          this.form.patchValue({ lotId: lots[0].id });
        }
        this.reload();
      },
      error: () => this.lots.set([]),
    });
  }

  setNow(control: { setValue(value: string): void }): void {
    control.setValue(nowLocal());
  }

  reload(): void {
    const { workerId, providerId, lotId, workDate } = this.form.getRawValue();
    if (workerId) {
      writeSaved(LAST_WORKER_KEY, workerId);
    }
    if (providerId) {
      writeSaved(LAST_PROVIDER_KEY, providerId);
    }
    if (lotId) {
      writeSaved(LAST_LOT_KEY, lotId);
    }
    if (!workerId || !workDate) {
      this.dayShifts.set([]);
      this.openShift.set(null);
      return;
    }

    this.api
      .getShifts({
        workerId,
        providerId: providerId || undefined,
        from: workDate,
        to: workDate,
      })
      .subscribe({
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
    const { workerId, providerId, lotId, workDate } = this.form.getRawValue();
    this.api
      .clockIn({
        workerId,
        providerId,
        lotId,
        workDate,
        startTime: this.inForm.getRawValue().startTime,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.snack.open('Ingreso registrado', 'OK', { duration: 2500 });
          this.inForm.reset({ startTime: nowLocal() });
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
        this.outForm.reset({ endTime: nowLocal(), mealBreakMinutes: 0 });
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

const LAST_WORKER_KEY = 'jornadas.lastWorkerId';
const LAST_PROVIDER_KEY = 'jornadas.lastProviderId';
const LAST_LOT_KEY = 'jornadas.lastLotId';

function nowLocal(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function readSaved(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSaved(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento disponible: la app funciona igual.
  }
}
