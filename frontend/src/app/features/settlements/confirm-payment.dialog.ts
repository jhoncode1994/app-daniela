import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DurationPipe } from '../../shared/duration.pipe';
import { MoneyPipe } from '../../shared/money.pipe';

export interface ConfirmPaymentData {
  worker: string;
  provider: string;
  from: string;
  to: string;
  shiftCount: number;
  netMinutes: number;
  amount: number;
}

@Component({
  selector: 'app-confirm-payment-dialog',
  imports: [MatDialogModule, MatButtonModule, DurationPipe, MoneyPipe],
  template: `
    <h2 mat-dialog-title>Confirmar pago</h2>
    <mat-dialog-content>
      <dl>
        <dt>Trabajadora</dt>
        <dd>{{ data.worker }}</dd>
        <dt>Proveedor</dt>
        <dd>{{ data.provider }}</dd>
        <dt>Periodo</dt>
        <dd>{{ data.from }} a {{ data.to }}</dd>
        <dt>Jornadas</dt>
        <dd>{{ data.shiftCount }} · {{ data.netMinutes | duration }}</dd>
      </dl>
      <p class="total">
        <span>Total a pagar</span>
        <strong>{{ data.amount | money }}</strong>
      </p>
      <p class="note">
        Solo se paga lo de {{ data.provider }}. Al confirmar se descarga el comprobante en PDF.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">Cancelar</button>
      <button mat-flat-button color="primary" type="button" [mat-dialog-close]="true" cdkFocusInitial>
        Confirmar pago
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px 16px;
        margin: 0 0 12px;
      }
      dt {
        color: var(--color-muted-foreground);
      }
      dd {
        margin: 0;
        font-weight: 600;
        text-align: right;
      }
      .total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 0 0 8px;
        padding: 12px;
        border-radius: var(--radius-sm);
        background: var(--color-muted);
      }
      .total strong {
        color: var(--color-primary);
        font-size: 1.3rem;
      }
      .note {
        margin: 0;
        color: var(--color-muted-foreground);
        font-size: 0.9rem;
      }
    `,
  ],
})
export class ConfirmPaymentDialogComponent {
  readonly data = inject<ConfirmPaymentData>(MAT_DIALOG_DATA);
}
