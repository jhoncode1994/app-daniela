import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { httpErrorMessage } from '../../core/http-error';
import { PaymentRecord, SettlementPreview, Worker } from '../../core/models';
import { DurationPipe } from '../../shared/duration.pipe';
import { MoneyPipe } from '../../shared/money.pipe';

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
    <h1>Liquidación</h1>
    <form [formGroup]="form" (ngSubmit)="preview()">
      <mat-form-field appearance="outline">
        <mat-label>Trabajadora</mat-label>
        <mat-select formControlName="workerId">
          @for (worker of workers(); track worker.id) {
            <mat-option [value]="worker.id">{{ worker.name }}</mat-option>
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
      <button mat-stroked-button type="submit" class="full" [disabled]="form.invalid">Consultar</button>
    </form>

    @if (settlement(); as data) {
      <mat-card class="preview">
        <h2>{{ data.worker.name }}</h2>
        <p>{{ data.from }} a {{ data.to }}</p>
        <p>Tiempo bruto: <strong>{{ data.grossMinutes | duration }}</strong></p>
        <p>Descontado: <strong>{{ data.mealMinutes | duration }}</strong></p>
        <p>Horas pagadas: <strong>{{ data.netMinutes | duration }}</strong></p>
        <p>Total ganado: <strong>{{ data.earnedAmount | money }}</strong></p>
        <p>Pagado: <strong>{{ data.paidAmount | money }}</strong></p>
        <p>Pendiente: <strong>{{ data.pendingAmount | money }}</strong></p>
        @if (data.pendingShiftCount > 0) {
          <button mat-flat-button color="primary" class="full" type="button" [disabled]="paying()" (click)="pay()">
            Registrar pago de {{ data.pendingAmount | money }}
          </button>
        } @else {
          <p>No hay jornadas pendientes en este periodo.</p>
        }
      </mat-card>
    }

    <h2>Pagos anteriores</h2>
    @for (payment of payments(); track payment.id) {
      <mat-card class="item">
        <h3>{{ payment.worker.name }}</h3>
        <p>{{ payment.paymentDate }} · {{ payment.shiftCount }} jornada(s)</p>
        <strong>{{ payment.amount | money }}</strong>
      </mat-card>
    }
  `,
  styles: [
    `
      form, .preview { display: flex; flex-direction: column; }
      .preview, .item { padding: var(--space-md); margin: 12px 0; }
      .full { min-height: var(--touch); margin: 8px 0; }
      p { margin: 6px 0; color: var(--color-muted-foreground); }
      h3 { margin: 0 0 4px; }
    `,
  ],
})
export class SettlementsComponent implements OnInit {
  readonly workers = signal<Worker[]>([]);
  readonly settlement = signal<SettlementPreview | null>(null);
  readonly payments = signal<PaymentRecord[]>([]);
  readonly paying = signal(false);
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
    private readonly snack: MatSnackBar,
  ) {
    this.form = fb.nonNullable.group({
      workerId: ['', Validators.required],
      from: ['', Validators.required],
      to: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.api.getWorkers().subscribe((workers) => {
      this.workers.set(workers);
      if (workers.length === 1) {
        this.form.patchValue({ workerId: workers[0].id });
      }
    });
    this.reloadPayments();
  }

  preview(): void {
    if (this.form.invalid) {
      return;
    }
    const { workerId, from, to } = this.form.getRawValue();
    this.api.previewSettlement(workerId, from, to).subscribe({
      next: (data) => this.settlement.set(data),
      error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
    });
  }

  pay(): void {
    if (this.form.invalid) {
      return;
    }
    const current = this.settlement();
    if (current && !window.confirm(`¿Registrar el pago de ${current.pendingAmount} por ${current.pendingShiftCount} jornada(s)?`)) {
      return;
    }
    this.paying.set(true);
    const { workerId, from, to } = this.form.getRawValue();
    this.api.createPayment({ workerId, from, to }).subscribe({
      next: () => {
        this.paying.set(false);
        this.snack.open('Pago registrado', 'OK', { duration: 2500 });
        this.preview();
        this.reloadPayments();
      },
      error: (err) => {
        this.paying.set(false);
        this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 });
      },
    });
  }

  private reloadPayments(): void {
    this.api.getPayments().subscribe((payments) => this.payments.set(payments));
  }
}
