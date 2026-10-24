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
      <p class="lead">Registra horas rápido y liquida lo pendiente de cada trabajadora.</p>

      <a mat-flat-button color="primary" class="cta" routerLink="/jornadas/nueva">
        <mat-icon>more_time</mat-icon>
        Registrar jornada
      </a>

      @if (summary(); as data) {
        <section class="totals">
          <article class="stat pending">
            <span class="label">Por pagar</span>
            <strong>{{ data.totalPending | money }}</strong>
            <em>a todas las trabajadoras</em>
          </article>
          <article class="stat paid">
            <span class="label">Ya pagado</span>
            <strong>{{ data.totalPaid | money }}</strong>
            <em>histórico del taller</em>
          </article>
        </section>

        <h2>Trabajadoras activas</h2>
        <div class="workers">
        @for (worker of data.workers; track worker.id) {
          <mat-card class="worker">
            <a class="worker-main" [routerLink]="['/jornadas', worker.id]">
              <div class="avatar" aria-hidden="true">{{ worker.name.charAt(0) }}</div>
              <div class="meta">
                <h3>{{ worker.name }}</h3>
                <p>
                  @if (worker.pendingShifts > 0) {
                    {{ worker.pendingShifts }} jornada(s) sin pagar
                  } @else {
                    Al día, sin pendientes
                  }
                </p>
              </div>
              <strong [class.zero]="worker.pendingAmount === 0">{{ worker.pendingAmount | money }}</strong>
            </a>

            @if (worker.breakdown.length > 0) {
              <div class="debt inset">
                <p class="label">Se le debe por referencia</p>
                @for (provider of worker.breakdown; track provider.providerId) {
                  <div class="debt-provider">
                    <div class="debt-head">
                      <span>{{ provider.providerName }}</span>
                      <strong>{{ provider.pendingAmount | money }}</strong>
                    </div>
                    @for (lot of provider.lots; track lot.lotId ?? 'none') {
                      @if (lot.lotId) {
                        <a
                          class="debt-lot"
                          [routerLink]="['/liquidaciones']"
                          [queryParams]="{
                            workerId: worker.id,
                            providerId: provider.providerId,
                            lotId: lot.lotId,
                          }"
                        >
                          <span class="ref">
                            {{ lot.reference }}
                            @if (lot.closed) {
                              <em>dada de baja</em>
                            }
                          </span>
                          <span class="amount">
                            {{ lot.pendingAmount | money }}
                            <mat-icon aria-hidden="true">chevron_right</mat-icon>
                          </span>
                        </a>
                      } @else {
                        <div class="debt-lot">
                          <span class="ref">
                            {{ lot.reference }}
                            <em>asígnala en el historial</em>
                          </span>
                          <span class="amount">{{ lot.pendingAmount | money }}</span>
                        </div>
                      }
                    }
                  </div>
                }
              </div>
            }

            <div class="worker-actions">
              <a mat-stroked-button [routerLink]="['/jornadas/nueva']" [queryParams]="{ workerId: worker.id }">
                <mat-icon>add</mat-icon>
                Registrar
              </a>
              @if (worker.pendingAmount > 0) {
                <a
                  mat-flat-button
                  color="primary"
                  [routerLink]="['/liquidaciones']"
                  [queryParams]="{ workerId: worker.id }"
                >
                  <mat-icon>payments</mat-icon>
                  Liquidar
                </a>
              }
            </div>
          </mat-card>
        } @empty {
          <mat-card class="empty-state">
            <mat-icon aria-hidden="true">group_add</mat-icon>
            <p>Todavía no hay trabajadoras activas.</p>
            <a mat-flat-button color="primary" routerLink="/trabajadoras">Agregar trabajadora</a>
          </mat-card>
        }
        </div>

        <h2>Administrar</h2>
        <nav class="manage" aria-label="Administrar">
          <a routerLink="/referencias">
            <mat-icon aria-hidden="true">inventory_2</mat-icon>
            <span>Referencias</span>
            <mat-icon class="go" aria-hidden="true">chevron_right</mat-icon>
          </a>
          <a routerLink="/trabajadoras">
            <mat-icon aria-hidden="true">group</mat-icon>
            <span>Trabajadoras</span>
            <mat-icon class="go" aria-hidden="true">chevron_right</mat-icon>
          </a>
          <a routerLink="/proveedores">
            <mat-icon aria-hidden="true">storefront</mat-icon>
            <span>Proveedores</span>
            <mat-icon class="go" aria-hidden="true">chevron_right</mat-icon>
          </a>
        </nav>
      } @else {
        <section class="totals" aria-busy="true" aria-label="Cargando resumen">
          <span class="skeleton" style="height: 84px"></span>
          <span class="skeleton" style="height: 84px"></span>
        </section>
        <span class="skeleton" style="height: 120px; margin-top: 24px"></span>
        <span class="skeleton" style="height: 120px; margin-top: 10px"></span>
      }
    </div>
  `,
  styles: [
    `
      .cta {
        width: 100%;
        min-height: 56px;
        margin-bottom: var(--space-lg);
        display: inline-flex;
        gap: 8px;
        font-size: 1rem !important;
      }
      .totals {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .stat {
        display: grid;
        gap: 2px;
        padding: 16px 18px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        background: var(--color-card);
        box-shadow: var(--shadow-sm);
      }
      .stat em {
        color: var(--color-muted-foreground);
        font-size: 0.76rem;
        font-style: normal;
      }
      .stat.pending {
        border-color: var(--color-primary-line);
        background: linear-gradient(170deg, var(--tint) 0%, var(--color-card) 70%);
      }
      .stat.pending strong {
        color: var(--color-primary);
      }
      .stat.paid {
        border-color: var(--color-success-line);
        background: linear-gradient(170deg, var(--tint-success) 0%, var(--color-card) 70%);
      }
      .stat.paid strong {
        color: var(--color-success);
      }
      .worker p {
        color: var(--color-muted-foreground);
        font-size: 0.88rem;
      }
      .stat strong,
      .worker strong {
        display: block;
        font-size: 1.35rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--color-foreground);
      }
      .worker {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 12px;
        padding: 16px;
      }
      .worker-main {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 12px;
        align-items: center;
        text-decoration: none;
        color: inherit;
        min-height: var(--touch);
      }
      .worker-main strong {
        color: var(--color-primary);
      }
      .worker-main strong.zero {
        color: var(--color-muted-foreground);
      }
      .debt .label {
        margin: 0 0 8px;
      }
      .debt-provider + .debt-provider {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px dashed var(--color-border);
      }
      .debt-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
      }
      .debt-head span {
        font-weight: 600;
      }
      .debt-head strong {
        display: inline;
        margin: 0;
        font-size: 0.95rem;
        color: var(--color-muted-foreground);
      }
      .debt-lot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-height: 40px;
        padding: 4px 0;
        color: inherit;
        text-decoration: none;
      }
      .debt-lot .ref {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .debt-lot .ref em {
        margin-left: 6px;
        color: var(--color-muted-foreground);
        font-size: 0.8rem;
        font-style: normal;
      }
      .debt-lot .amount {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        color: var(--color-primary);
        font-weight: 700;
        white-space: nowrap;
      }
      .debt-lot .amount mat-icon {
        width: 18px;
        height: 18px;
        font-size: 18px;
      }
      .worker-actions {
        display: flex;
        gap: 8px;
      }
      .worker-actions a {
        flex: 1;
        min-height: var(--touch);
        display: inline-flex;
        gap: 4px;
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
      }
      .meta h3,
      .meta p {
        margin: 0;
      }
      @media (min-width: 720px) {
        .workers {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          align-items: start;
        }
        .worker {
          margin-bottom: 0;
        }
      }
      .manage {
        display: grid;
        gap: 2px;
        padding: 6px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        background: var(--color-card);
        box-shadow: var(--shadow-xs);
      }
      .manage a {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: var(--touch);
        padding: 0 10px;
        border-radius: var(--radius-sm);
        color: inherit;
        text-decoration: none;
        font-weight: 600;
        transition: background var(--transition);
      }
      .manage a:hover {
        background: var(--surface-2);
      }
      .manage a span {
        flex: 1;
      }
      .manage a mat-icon {
        width: 21px;
        height: 21px;
        font-size: 21px;
        color: var(--color-primary);
      }
      .manage a .go {
        color: var(--color-muted-foreground);
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
