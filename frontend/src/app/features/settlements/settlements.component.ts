import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { httpErrorMessage } from '../../core/http-error';
import { Lot, PaymentRecord, Provider, SettlementPreview, Worker } from '../../core/models';
import { DurationPipe } from '../../shared/duration.pipe';
import { MoneyPipe } from '../../shared/money.pipe';
import { ConfirmDialogComponent } from '../../shared/confirm.dialog';
import { ConfirmPaymentDialogComponent } from './confirm-payment.dialog';
import { downloadPaymentPdf, sharePaymentPdf } from '../../shared/payment-pdf';

@Component({
  selector: 'app-settlements',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    DurationPipe,
    MoneyPipe,
  ],
  template: `
    <div class="page-enter">
      <p class="eyebrow">Pagos</p>
      <h1>Liquidación</h1>
      <p class="hint">
        Cada pago es de una trabajadora en una referencia de un proveedor. Nunca se mezclan
        referencias ni proveedores en el mismo pago.
      </p>

      <form [formGroup]="form" (ngSubmit)="preview()">
        <mat-form-field appearance="outline">
          <mat-label>Trabajadora</mat-label>
          <mat-select formControlName="workerId" (selectionChange)="onFiltersChanged()">
            @for (worker of workers(); track worker.id) {
              <mat-option [value]="worker.id">{{ worker.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Proveedor</mat-label>
          <mat-select formControlName="providerId" (selectionChange)="onProviderChanged()">
            @for (provider of providers(); track provider.id) {
              <mat-option [value]="provider.id">{{ provider.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Referencia</mat-label>
          <mat-select formControlName="lotId" (selectionChange)="onFiltersChanged()">
            @for (lot of lots(); track lot.id) {
              <mat-option [value]="lot.id">
                {{ lot.reference }}@if (lot.closed) { · dada de baja }
              </mat-option>
            }
          </mat-select>
          @if (!form.value.providerId) {
            <mat-hint>Elige primero el proveedor.</mat-hint>
          } @else if (lots().length === 0) {
            <mat-hint>Ese proveedor no tiene referencias registradas.</mat-hint>
          }
        </mat-form-field>

        <details class="dates">
          <summary>Acotar por fechas (opcional)</summary>
          <div class="dates-row">
            <mat-form-field appearance="outline">
              <mat-label>Fecha inicial</mat-label>
              <input matInput type="date" formControlName="from" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Fecha final</mat-label>
              <input matInput type="date" formControlName="to" />
            </mat-form-field>
          </div>
        </details>

        <button mat-stroked-button type="submit" class="full" [disabled]="form.invalid">
          Consultar esta referencia
        </button>
      </form>

      @if (settlement(); as data) {
        <mat-card class="preview">
          <p class="scope">{{ data.provider.name }} · Ref. {{ data.lot.reference }}</p>
          <h2>{{ data.worker.name }}</h2>
          @if (data.from || data.to) {
            <p class="range">{{ data.from ?? 'inicio' }} a {{ data.to ?? 'hoy' }}</p>
          } @else {
            <p class="range">Todo lo trabajado en esta referencia</p>
          }
          <div class="grid">
            <div>
              <span>Tiempo bruto</span>
              <strong>{{ data.grossMinutes | duration }}</strong>
            </div>
            <div>
              <span>Descontado</span>
              <strong>{{ data.mealMinutes | duration }}</strong>
            </div>
            <div>
              <span>Horas pagadas</span>
              <strong>{{ data.netMinutes | duration }}</strong>
            </div>
            <div>
              <span>Total ganado</span>
              <strong>{{ data.earnedAmount | money }}</strong>
            </div>
            <div>
              <span>Ya pagado aquí</span>
              <strong>{{ data.paidAmount | money }}</strong>
            </div>
            <div class="pending">
              <span>Pendiente en {{ data.lot.reference }}</span>
              <strong>{{ data.pendingAmount | money }}</strong>
            </div>
          </div>
          @if (data.pendingShiftCount === 0) {
            <p>
              No hay jornadas pendientes de {{ data.worker.name }} en la referencia
              {{ data.lot.reference }}.
            </p>
          }
        </mat-card>

        @if (data.pendingShiftCount > 0) {
          <mat-card class="picker">
            <div class="picker-head">
              <h3>Elige qué jornadas pagar</h3>
              <div>
                <button mat-button type="button" (click)="selectAllPending()">Todas</button>
                <button mat-button type="button" (click)="clearSelection()">Ninguna</button>
              </div>
            </div>
            @for (shift of pendingShifts(); track shift.id) {
              <label class="pick" [class.on]="isSelected(shift.id)">
                <input
                  type="checkbox"
                  [checked]="isSelected(shift.id)"
                  (change)="toggleShift(shift.id)"
                />
                <span class="pick-main">
                  <strong>{{ shift.workDate }}</strong>
                  <em>{{ shift.startTime }}–{{ shift.endTime }} · {{ shift.netMinutes | duration }}</em>
                </span>
                <span class="pick-amount">{{ shift.earnedAmount | money }}</span>
              </label>
            }
          </mat-card>
        }

        @if (currentLot(); as lot) {
          <mat-card class="lot-money">
            <p class="scope">Referencia {{ lot.reference }}</p>
            <div class="grid">
              <div>
                <span>Valor del lote</span>
                <strong>{{ lot.value | money }}</strong>
              </div>
              <div>
                <span>Mano de obra</span>
                <strong>{{ lot.laborTotal | money }}</strong>
              </div>
              <div>
                <span>Pagado a trabajadoras</span>
                <strong>{{ lot.laborPaid | money }}</strong>
              </div>
              <div>
                <span>Falta por pagar</span>
                <strong>{{ lot.laborPending | money }}</strong>
              </div>
              <div class="pending" [class.negative]="lot.profit < 0">
                <span>Ganancia de la referencia</span>
                <strong>{{ lot.profit | money }}</strong>
              </div>
            </div>
            @if (lot.value === 0) {
              <p class="range">
                Registra unidades y valor por unidad en la referencia para ver la ganancia.
              </p>
            }
          </mat-card>
        }

        @if (data.pendingShiftCount > 0) {
          <div class="pay-bar">
            <div class="pay-info">
              <span>{{ data.worker.name }} · {{ data.lot.reference }} · {{ selectedCount() }} jornada(s)</span>
              <strong>{{ selectedAmount() | money }}</strong>
            </div>
            <button
              mat-flat-button
              color="primary"
              type="button"
              [disabled]="paying() || selectedCount() === 0"
              (click)="pay()"
            >
              Pagar
            </button>
          </div>
        }
      }

      <h2>Pagos anteriores@if (paymentsScope()) { · {{ paymentsScope() }} }</h2>
      @for (payment of payments(); track payment.id) {
        <mat-card class="item" [class.voided]="payment.voided">
          <div class="item-head">
            <div>
              <h3>
                {{ payment.worker.name }}@if (payment.provider) { · {{ payment.provider.name }} }
              </h3>
              @if (payment.lot) {
                <p class="ref-line">Ref. {{ payment.lot.reference }}</p>
              }
              <p>{{ payment.paymentDate }} · {{ payment.shiftCount }} jornada(s)</p>
            </div>
            <div class="amount">
              <strong>{{ payment.amount | money }}</strong>
              @if (payment.voided) {
                <span class="badge">Anulado</span>
              }
            </div>
          </div>
          <details class="detail">
            <summary>Ver detalle por día</summary>
            <ul>
              @for (shift of payment.shifts; track shift.id) {
                <li>
                  <span>{{ shift.workDate }} · {{ shift.startTime }}–{{ shift.endTime }} · {{ shift.netMinutes | duration }}</span>
                  <strong>{{ shift.earnedAmount | money }}</strong>
                </li>
              }
            </ul>
          </details>
          @if (!payment.voided) {
          <div class="item-actions">
            <button mat-stroked-button type="button" (click)="downloadPdf(payment)">Descargar PDF</button>
            <button mat-stroked-button type="button" (click)="sharePdf(payment)">Compartir</button>
            <button mat-button color="warn" type="button" (click)="cancelPayment(payment)">Anular pago</button>
          </div>
          }
        </mat-card>
              } @empty {
        <mat-card class="empty-state">
          <mat-icon aria-hidden="true">receipt_long</mat-icon>
          <p>Aún no hay pagos registrados para esta selección.</p>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .empty,
      .range {
        color: var(--color-muted-foreground);
      }
      .scope {
        margin: 0 0 6px;
        color: var(--color-primary);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      form,
      .preview {
        display: flex;
        flex-direction: column;
      }
      .preview,
      .picker,
      .lot-money,
      .item {
        padding: var(--space-md);
        margin: 12px 0;
      }
      .dates {
        margin: 4px 0 8px;
      }
      .dates summary {
        cursor: pointer;
        padding: 10px 2px;
        color: var(--color-primary);
        font-weight: 600;
      }
      .dates-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-sm);
      }
      @media (max-width: 360px) {
        .dates-row {
          grid-template-columns: 1fr;
        }
      }
      .picker-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 6px;
      }
      .picker-head h3 {
        margin: 0;
        font-size: 1rem;
      }
      .pick {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 12px;
        min-height: var(--touch);
        padding: 8px 10px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        margin-top: 8px;
        cursor: pointer;
        transition: border-color var(--transition), background var(--transition);
      }
      .pick.on {
        border-color: var(--color-primary-line);
        background: var(--tint);
      }
      .pick input {
        width: 20px;
        height: 20px;
        accent-color: var(--color-primary);
      }
      .pick-main {
        display: grid;
        min-width: 0;
      }
      .pick-main em {
        color: var(--color-muted-foreground);
        font-size: 0.85rem;
        font-style: normal;
      }
      .pick-amount {
        font-weight: 700;
        white-space: nowrap;
      }
      .pending.negative strong {
        color: var(--color-destructive);
      }
      .ref-line {
        margin: 2px 0 0;
        color: var(--color-primary);
        font-size: 0.85rem;
        font-weight: 600;
      }
      .full {
        width: 100%;
        min-height: var(--touch);
        margin: 8px 0;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;
        margin: var(--space-md) 0 var(--space-sm);
      }
      .grid > div {
        padding: 10px 12px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--surface-2);
      }
      .grid span {
        display: block;
        color: var(--color-muted-foreground);
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .grid strong {
        font-size: 1.05rem;
        font-weight: 800;
      }
      .pending {
        grid-column: 1 / -1;
        background: linear-gradient(170deg, var(--tint) 0%, var(--color-card) 70%) !important;
        border-color: var(--color-primary-line) !important;
      }
      .pending strong {
        color: var(--color-primary);
        font-size: 1.4rem;
        letter-spacing: -0.02em;
      }
      .pay-bar {
        position: sticky;
        bottom: calc(var(--bottom-nav-space) - 24px);
        z-index: 15;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: var(--space-md) 0;
        padding: 12px 12px 12px 16px;
        border-radius: var(--radius);
        background: var(--glass);
        backdrop-filter: blur(12px);
        border: 1px solid var(--color-primary-line);
        box-shadow: var(--shadow-md);
      }
      @media (min-width: 1024px) {
        .pay-bar {
          bottom: var(--space-md);
        }
      }
      .pay-info {
        min-width: 0;
      }
      .pay-info span {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--color-muted-foreground);
        font-size: 0.85rem;
      }
      .pay-info strong {
        color: var(--color-primary);
        font-size: 1.25rem;
      }
      .pay-bar button {
        min-width: 110px;
        min-height: var(--touch);
      }
      .item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .item strong {
        color: var(--color-success);
      }
      .amount {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
      }
      .badge {
        padding: 3px 11px;
        border-radius: var(--radius-pill);
        background: var(--warn-soft);
        color: var(--warn);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .item.voided {
        opacity: 0.75;
      }
      .item.voided .amount strong {
        color: var(--color-muted-foreground);
        text-decoration: line-through;
      }
      .item-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .item-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .detail {
        margin: 4px 0;
      }
      .detail summary {
        min-height: 44px;
        display: flex;
        align-items: center;
        color: var(--color-primary);
        font-weight: 600;
        cursor: pointer;
      }
      .detail ul {
        margin: 0 0 8px;
        padding: 0;
        list-style: none;
      }
      .detail li {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 0;
        border-top: 1px solid var(--color-border);
        font-size: 0.9rem;
      }
      p {
        margin: 6px 0;
      }
      h2 {
        margin: 8px 0 4px;
      }
      h3 {
        margin: 0 0 4px;
      }
    `,
  ],
})
export class SettlementsComponent implements OnInit {
  readonly workers = signal<Worker[]>([]);
  readonly providers = signal<Provider[]>([]);
  readonly lots = signal<Lot[]>([]);
  readonly settlement = signal<SettlementPreview | null>(null);
  readonly payments = signal<PaymentRecord[]>([]);
  readonly paymentsScope = signal<string | null>(null);
  readonly paying = signal(false);
  readonly selected = signal<Set<string>>(new Set());
  readonly form;

  private queryLotId: string | null = null;

  readonly pendingShifts = computed(() =>
    (this.settlement()?.shifts ?? []).filter((shift) => shift.paymentStatus === 'PENDIENTE'),
  );

  readonly selectedAmount = computed(() =>
    this.pendingShifts()
      .filter((shift) => this.selected().has(shift.id))
      .reduce((sum, shift) => sum + shift.earnedAmount, 0),
  );

  readonly selectedMinutes = computed(() =>
    this.pendingShifts()
      .filter((shift) => this.selected().has(shift.id))
      .reduce((sum, shift) => sum + shift.netMinutes, 0),
  );

  readonly selectedCount = computed(
    () => this.pendingShifts().filter((shift) => this.selected().has(shift.id)).length,
  );

  readonly currentLot = signal<Lot | null>(null);

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
    private readonly snack: MatSnackBar,
    private readonly route: ActivatedRoute,
    private readonly dialog: MatDialog,
  ) {
    this.form = fb.nonNullable.group({
      workerId: ['', Validators.required],
      providerId: ['', Validators.required],
      lotId: ['', Validators.required],
      from: [''],
      to: [''],
    });
  }

  ngOnInit(): void {
    const queryWorkerId = this.route.snapshot.queryParamMap.get('workerId');
    const queryProviderId = this.route.snapshot.queryParamMap.get('providerId');
    this.queryLotId = this.route.snapshot.queryParamMap.get('lotId');

    this.api.getWorkers().subscribe((workers) => {
      this.workers.set(workers);
      if (queryWorkerId && workers.some((worker) => worker.id === queryWorkerId)) {
        this.form.patchValue({ workerId: queryWorkerId });
      } else if (workers.length === 1) {
        this.form.patchValue({ workerId: workers[0].id });
      }
      this.reloadPayments();
    });
    this.api.getProviders().subscribe((providers) => {
      const active = providers.filter((provider) => provider.active);
      this.providers.set(active);
      if (queryProviderId && active.some((provider) => provider.id === queryProviderId)) {
        this.form.patchValue({ providerId: queryProviderId });
      } else if (active.length === 1) {
        this.form.patchValue({ providerId: active[0].id });
      }
      this.loadLots();
      this.reloadPayments();
    });
  }

  onProviderChanged(): void {
    this.form.patchValue({ lotId: '' });
    this.settlement.set(null);
    this.loadLots();
    this.reloadPayments();
  }

  onFiltersChanged(): void {
    this.settlement.set(null);
    this.syncCurrentLot();
    this.reloadPayments();
  }

  private syncCurrentLot(): void {
    const { lotId } = this.form.getRawValue();
    this.currentLot.set(this.lots().find((lot) => lot.id === lotId) ?? null);
  }

  // Al liquidar sí se ofrecen las referencias dadas de baja: pueden tener horas sin pagar.
  private loadLots(): void {
    const { providerId } = this.form.getRawValue();
    if (!providerId) {
      this.lots.set([]);
      return;
    }
    this.api.getLots({ providerId }).subscribe({
      next: (lots) => {
        this.lots.set(lots);
        const preferred = this.queryLotId;
        this.queryLotId = null;
        if (preferred && lots.some((lot) => lot.id === preferred)) {
          this.form.patchValue({ lotId: preferred });
          this.syncCurrentLot();
          this.preview();
        } else if (lots.length === 1) {
          this.form.patchValue({ lotId: lots[0].id });
          this.syncCurrentLot();
        } else {
          this.syncCurrentLot();
        }
      },
      error: () => this.lots.set([]),
    });
  }

  preview(): void {
    if (this.form.invalid) {
      return;
    }
    const { workerId, providerId, lotId, from, to } = this.form.getRawValue();
    this.reloadPayments();
    this.api.previewSettlement(workerId, providerId, lotId, from, to).subscribe({
      next: (data) => {
        this.settlement.set(data);
        // Por defecto se paga todo lo pendiente; el usuario puede destildar jornadas.
        this.selected.set(
          new Set(
            data.shifts
              .filter((shift) => shift.paymentStatus === 'PENDIENTE')
              .map((shift) => shift.id),
          ),
        );
      },
      error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
    });
  }

  toggleShift(shiftId: string): void {
    const next = new Set(this.selected());
    if (next.has(shiftId)) {
      next.delete(shiftId);
    } else {
      next.add(shiftId);
    }
    this.selected.set(next);
  }

  isSelected(shiftId: string): boolean {
    return this.selected().has(shiftId);
  }

  selectAllPending(): void {
    const data = this.settlement();
    if (!data) {
      return;
    }
    this.selected.set(
      new Set(
        data.shifts.filter((shift) => shift.paymentStatus === 'PENDIENTE').map((shift) => shift.id),
      ),
    );
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  pay(): void {
    const current = this.settlement();
    if (this.form.invalid || !current || this.selectedCount() === 0) {
      return;
    }
    this.dialog
      .open(ConfirmPaymentDialogComponent, {
        width: 'min(420px, 92vw)',
        data: {
          worker: current.worker.name,
          provider: current.provider.name,
          reference: current.lot.reference,
          from: current.from,
          to: current.to,
          shiftCount: this.selectedCount(),
          netMinutes: this.selectedMinutes(),
          amount: this.selectedAmount(),
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.submitPayment(current);
        }
      });
  }

  private submitPayment(current: SettlementPreview): void {
    this.paying.set(true);
    const { workerId, providerId, lotId, from, to } = this.form.getRawValue();
    const shiftIds = this.pendingShifts()
      .filter((shift) => this.selected().has(shift.id))
      .map((shift) => shift.id);
    this.api
      .createPayment({
        workerId,
        providerId,
        lotId,
        from: from || undefined,
        to: to || undefined,
        shiftIds,
      })
      .subscribe({
      next: (payment) => {
        this.paying.set(false);
        this.snack.open(
          `Pago de ${current.lot.reference} (${current.provider.name}) registrado. Descargando PDF…`,
          'OK',
          { duration: 3000 },
        );
        this.downloadPdf(payment);
        this.loadLots();
        this.preview();
      },
      error: (err) => {
        this.paying.set(false);
        this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 });
      },
      });
  }

  cancelPayment(payment: PaymentRecord): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: 'min(420px, 92vw)',
        data: {
          title: 'Anular pago',
          message: `Se anulará el pago de ${payment.worker.name} del ${payment.paymentDate} y sus ${payment.shiftCount} jornada(s) volverán a quedar pendientes. El pago se conserva en el historial marcado como anulado.`,
          confirmLabel: 'Anular pago',
          destructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.api.deletePayment(payment.id).subscribe({
          next: () => {
            this.snack.open('Pago anulado; las jornadas quedaron pendientes', 'OK', { duration: 3500 });
            this.reloadPayments();
            if (this.settlement()) {
              this.preview();
            }
          },
          error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
        });
      });
  }

  sharePdf(payment: PaymentRecord): void {
    sharePaymentPdf(payment).catch(() =>
      this.snack.open('No se pudo compartir el PDF', 'OK', { duration: 4000 }),
    );
  }

  downloadPdf(payment: PaymentRecord): void {
    downloadPaymentPdf(payment).catch(() =>
      this.snack.open('No se pudo generar el PDF', 'OK', { duration: 4000 }),
    );
  }

  private reloadPayments(): void {
    const { workerId, providerId, lotId } = this.form.getRawValue();
    const worker = this.workers().find((item) => item.id === workerId);
    const provider = this.providers().find((item) => item.id === providerId);
    const lot = this.lots().find((item) => item.id === lotId);
    this.paymentsScope.set(
      worker && provider
        ? `${worker.name} · ${provider.name}${lot ? ` · ${lot.reference}` : ''}`
        : null,
    );
    this.api
      .getPayments({
        workerId: workerId || undefined,
        providerId: providerId || undefined,
        lotId: lotId || undefined,
      })
      .subscribe((payments) => this.payments.set(payments));
  }
}
