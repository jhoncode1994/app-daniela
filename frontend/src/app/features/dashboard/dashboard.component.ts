import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';
import { DashboardSummary } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, MoneyPipe],
  template: `
    <div class="page-enter">
      <p class="eyebrow">Resumen</p>
      <h1>Inicio</h1>
      <p class="lead">Registra horas rápido y revisa lo pendiente de pago.</p>

      <a mat-flat-button color="primary" class="cta" routerLink="/jornadas/nueva">
        <mat-icon>add_circle</mat-icon>
        Registrar jornada
      </a>

      @if (summary(); as data) {
        <section class="totals">
          <article class="stat pending">
            <span>Pendiente</span>
            <strong>{{ data.totalPending | money }}</strong>
          </article>
          <article class="stat paid">
            <span>Pagado</span>
            <strong>{{ data.totalPaid | money }}</strong>
          </article>
        </section>

        <h2>Trabajadoras activas</h2>
        @for (worker of data.workers; track worker.id) {
          <a class="worker-link" [routerLink]="['/jornadas', worker.id]">
            <mat-card class="worker">
              <div class="avatar" aria-hidden="true">{{ worker.name.charAt(0) }}</div>
              <div class="meta">
                <h3>{{ worker.name }}</h3>
                <p>{{ worker.pendingShifts }} registro(s) pendiente(s)</p>
              </div>
              <strong>{{ worker.pendingAmount | money }}</strong>
            </mat-card>
          </a>
        } @empty {
          <p class="empty">No hay trabajadoras activas. Agrégalas en Trabajadoras.</p>
        }

        <div class="actions">
          <a mat-stroked-button routerLink="/trabajadoras">Trabajadoras</a>
          <a mat-stroked-button routerLink="/proveedores">Proveedores</a>
          <a mat-stroked-button routerLink="/jornadas">Historial</a>
          <a mat-stroked-button routerLink="/liquidaciones">Liquidaciones</a>
        </div>
      } @else {
        <p class="empty">Cargando resumen…</p>
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
      .lead {
        margin: -4px 0 18px;
        color: var(--color-muted-foreground);
      }
      .cta {
        width: 100%;
        min-height: 54px;
        margin-bottom: var(--space-lg);
        display: inline-flex;
        gap: 8px;
      }
      .totals {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .stat {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        padding: 16px;
        box-shadow: var(--shadow-sm);
      }
      .stat.pending {
        border-color: rgba(165, 107, 116, 0.28);
        background: linear-gradient(180deg, #fff8f7 0%, #ffffff 100%);
      }
      .stat.paid {
        border-color: rgba(61, 107, 79, 0.2);
        background: linear-gradient(180deg, #f4faf6 0%, #ffffff 100%);
      }
      .stat span,
      .worker p,
      .empty {
        color: var(--color-muted-foreground);
        font-size: 0.9rem;
      }
      .stat strong,
      .worker strong {
        display: block;
        font-size: 1.2rem;
        margin-top: 6px;
        color: var(--color-foreground);
      }
      .worker-link {
        text-decoration: none;
        color: inherit;
        display: block;
        margin-bottom: 10px;
      }
      .worker {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 12px;
        align-items: center;
        padding: 14px 16px;
      }
      .avatar {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--color-muted);
        color: var(--color-primary);
        font-weight: 700;
      }
      .meta h3,
      .meta p {
        margin: 0;
      }
      .actions {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        margin-top: 20px;
      }
      .actions a {
        min-height: var(--touch);
        width: 100%;
      }
      @media (min-width: 480px) {
        .actions {
          grid-template-columns: 1fr 1fr 1fr;
        }
      }
      @media (max-width: 360px) {
        .totals {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  readonly summary = signal<DashboardSummary | null>(null);

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.getDashboard().subscribe((data) => this.summary.set(data));
  }
}
