import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../../core/api.service';
import { DashboardSummary } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatButtonModule, MatCardModule, MoneyPipe],
  template: `
    <p class="eyebrow">Resumen de hoy</p>
    <h1>Inicio</h1>
    <a mat-flat-button color="primary" class="cta" routerLink="/jornadas/nueva">Registrar jornada</a>

    @if (summary(); as data) {
      <section class="totals">
        <article>
          <span>Pendiente</span>
          <strong>{{ data.totalPending | money }}</strong>
        </article>
        <article>
          <span>Pagado</span>
          <strong>{{ data.totalPaid | money }}</strong>
        </article>
      </section>

      <h2>Trabajadoras activas</h2>
      @for (worker of data.workers; track worker.id) {
        <a class="worker-link" [routerLink]="['/jornadas', worker.id]">
          <mat-card class="worker">
            <div>
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
        <a mat-stroked-button routerLink="/jornadas">Historial</a>
        <a mat-stroked-button routerLink="/liquidaciones">Liquidaciones</a>
      </div>
    } @else {
      <p class="empty">Cargando resumen…</p>
    }
  `,
  styles: [
    `
      .eyebrow {
        margin: 0 0 4px;
        color: var(--color-primary);
        font-size: 0.85rem;
        font-weight: 600;
      }
      .cta {
        width: 100%;
        min-height: 52px;
        margin-bottom: var(--space-md);
      }
      .totals {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .totals article {
        background: var(--color-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        padding: var(--space-md);
      }
      .totals span,
      .worker p,
      .empty {
        color: var(--color-muted-foreground);
        font-size: 0.9rem;
      }
      .totals strong,
      .worker strong {
        display: block;
        font-size: 1.25rem;
        margin-top: 4px;
        color: var(--color-foreground);
      }
      .worker {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-md);
        margin-bottom: 10px;
      }
      .worker-link {
        text-decoration: none;
        color: inherit;
        display: block;
      }
      .worker h3,
      .worker p {
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
