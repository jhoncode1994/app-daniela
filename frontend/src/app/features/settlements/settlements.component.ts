import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { httpErrorMessage } from '../../core/http-error';
import { PaymentRecord, Provider, SettlementPreview, Worker } from '../../core/models';
import { DurationPipe } from '../../shared/duration.pipe';
import { MoneyPipe } from '../../shared/money.pipe';
import { downloadPaymentPdf } from '../../shared/payment-pdf';

@Component({
  selector: 'app-settlements',
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
    <div class="page-enter">
      <p class="eyebrow">Pagos</p>
      <h1>Liquidación</h1>
      <p class="hint">
        Cada pago es de una trabajadora en un proveedor. Ejemplo: primero Claudia × Alma Rosa;
        después Claudia × Bizcocho. No se mezclan.
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
          <mat-select formControlName="providerId" (selectionChange)="onFiltersChanged()">
            @for (provider of providers(); track provider.id) {
              <mat-option [value]="provider.id">{{ provider.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fecha inicial</mat-label>
          <input matInput type="date" formControlName="from" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fecha final</mat-label>
          <input matInput type="date" formControlName="to" />
        </mat-form-field>
        <button mat-stroked-button type="submit" class="full" [disabled]="form.invalid">
          Consultar solo este proveedor
        </button>
      </form>

      @if (settlement(); as data) {
        <mat-card class="preview">
          <p class="scope">Solo {{ data.provider.name }}</p>
          <h2>{{ data.worker.name }}</h2>
          <p class="range">{{ data.from }} a {{ data.to }}</p>
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
              <span>Pendiente de {{ data.provider.name }}</span>
              <strong>{{ data.pendingAmount | money }}</strong>
            </div>
          </div>
          @if (data.pendingShiftCount > 0) {
            <button mat-flat-button color="primary" class="full" type="button" [disabled]="paying()" (click)="pay()">
              Pagar {{ data.pendingAmount | money }} · {{ data.worker.name }} en {{ data.provider.name }}
            </button>
          } @else {
            <p>No hay jornadas pendientes de {{ data.worker.name }} en {{ data.provider.name }} para este periodo.</p>
          }
        </mat-card>
      }

      <h2>Pagos anteriores@if (paymentsScope()) { · {{ paymentsScope() }} }</h2>
      @for (payment of payments(); track payment.id) {
        <mat-card class="item">
          <div>
            <h3>{{ payment.worker.name }}@if (payment.provider) { · {{ payment.provider.name }} }</h3>
            <p>{{ payment.paymentDate }} · {{ payment.shiftCount }} jornada(s)</p>
          </div>
          <div class="amount">
            <strong>{{ payment.amount | money }}</strong>
            <button mat-stroked-button type="button" (click)="downloadPdf(payment)">Descargar PDF</button>
          </div>
        </mat-card>
      } @empty {
        <p class="empty">Aún no hay pagos registrados para esta selección.</p>
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
      .range {
        color: var(--color-muted-foreground);
      }
      .hint {
        margin: -4px 0 18px;
      }
      .scope {
        margin: 0 0 4px;
        color: var(--color-primary);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      form,
      .preview {
        display: flex;
        flex-direction: column;
      }
      .preview,
      .item {
        padding: var(--space-md);
        margin: 12px 0;
      }
      .full {
        width: 100%;
        min-height: var(--touch);
        margin: 8px 0;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin: 12px 0 8px;
      }
      .grid span {
        display: block;
        color: var(--color-muted-foreground);
        font-size: 0.85rem;
      }
      .grid strong {
        font-size: 1rem;
      }
      .pending {
        grid-column: 1 / -1;
        padding: 12px;
        border-radius: var(--radius-sm);
        background: linear-gradient(180deg, #fff8f7 0%, #ffffff 100%);
        border: 1px solid rgba(165, 107, 116, 0.28);
      }
      .pending strong {
        color: var(--color-primary);
        font-size: 1.2rem;
      }
      .item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .item strong {
        color: var(--color-success);
      }
      .amount {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
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
  readonly settlement = signal<SettlementPreview | null>(null);
  readonly payments = signal<PaymentRecord[]>([]);
  readonly paymentsScope = signal<string | null>(null);
  readonly paying = signal(false);
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
    private readonly snack: MatSnackBar,
    private readonly route: ActivatedRoute,
  ) {
    this.form = fb.nonNullable.group({
      workerId: ['', Validators.required],
      providerId: ['', Validators.required],
      from: ['', Validators.required],
      to: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    const queryWorkerId = this.route.snapshot.queryParamMap.get('workerId');
    const queryProviderId = this.route.snapshot.queryParamMap.get('providerId');

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
      this.reloadPayments();
    });
  }

  onFiltersChanged(): void {
    this.settlement.set(null);
    this.reloadPayments();
  }

  preview(): void {
    if (this.form.invalid) {
      return;
    }
    const { workerId, providerId, from, to } = this.form.getRawValue();
    this.reloadPayments();
    this.api.previewSettlement(workerId, providerId, from, to).subscribe({
      next: (data) => this.settlement.set(data),
      error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
    });
  }

  pay(): void {
    if (this.form.invalid) {
      return;
    }
    const current = this.settlement();
    if (
      current &&
      !window.confirm(
        `¿Pagar solo lo de ${current.worker.name} en ${current.provider.name}? El tiempo de otros proveedores no se incluye.`,
      )
    ) {
      return;
    }
    this.paying.set(true);
    const { workerId, providerId, from, to } = this.form.getRawValue();
    this.api.createPayment({ workerId, providerId, from, to }).subscribe({
      next: (payment) => {
        this.paying.set(false);
        this.snack.open(`Pago de ${current?.provider.name} registrado. Descargando PDF…`, 'OK', {
          duration: 3000,
        });
        this.downloadPdf(payment);
        this.preview();
      },
      error: (err) => {
        this.paying.set(false);
        this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 });
      },
    });
  }

  downloadPdf(payment: PaymentRecord): void {
    downloadPaymentPdf(payment).catch(() =>
      this.snack.open('No se pudo generar el PDF', 'OK', { duration: 4000 }),
    );
  }

  private reloadPayments(): void {
    const { workerId, providerId } = this.form.getRawValue();
    const worker = this.workers().find((item) => item.id === workerId);
    const provider = this.providers().find((item) => item.id === providerId);
    this.paymentsScope.set(
      worker && provider ? `${worker.name} · ${provider.name}` : null,
    );
    this.api
      .getPayments({
        workerId: workerId || undefined,
        providerId: providerId || undefined,
      })
      .subscribe((payments) => this.payments.set(payments));
  }
}
