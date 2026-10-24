import { Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <div class="shell">
      <mat-toolbar>
        <span class="brand">
          <span class="mark" aria-hidden="true">
            <mat-icon>schedule</mat-icon>
          </span>
          <span class="brand-text">
            <strong>Jornadas</strong>
            <em>Daniela</em>
          </span>
        </span>
        <span class="spacer"></span>
        <button mat-button class="logout" type="button" (click)="auth.logout()">
          <mat-icon>logout</mat-icon>
          <span>Salir</span>
        </button>
      </mat-toolbar>

      @if (offline()) {
        <div class="offline" role="status">
          <mat-icon aria-hidden="true">cloud_off</mat-icon>
          <span>Sin conexión. Puedes ver lo cargado, pero no guardar hasta que vuelva internet.</span>
        </div>
      }

      <main id="contenido" class="content">
        <router-outlet />
      </main>

      <nav class="nav" aria-label="Principal">
        <span class="rail-brand" aria-hidden="true">
          <span class="mark">
            <mat-icon>schedule</mat-icon>
          </span>
          <span class="brand-text">
            <strong>Jornadas</strong>
            <em>Daniela</em>
          </span>
        </span>

        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          <span class="ico"><mat-icon aria-hidden="true">home</mat-icon></span>
          <span class="txt">Inicio</span>
        </a>
        <a routerLink="/jornadas/nueva" routerLinkActive="active">
          <span class="ico"><mat-icon aria-hidden="true">more_time</mat-icon></span>
          <span class="txt">Registrar</span>
        </a>
        <a routerLink="/referencias" routerLinkActive="active">
          <span class="ico"><mat-icon aria-hidden="true">inventory_2</mat-icon></span>
          <span class="txt">Lotes</span>
        </a>
        <!-- Exacto: si no, /jornadas/nueva marcaría también este enlace -->
        <a routerLink="/jornadas" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          <span class="ico"><mat-icon aria-hidden="true">history</mat-icon></span>
          <span class="txt">Historial</span>
        </a>
        <a routerLink="/liquidaciones" routerLinkActive="active">
          <span class="ico"><mat-icon aria-hidden="true">payments</mat-icon></span>
          <span class="txt">Liquidar</span>
        </a>

        <span class="rail-foot">
          <a routerLink="/trabajadoras" routerLinkActive="active">
            <span class="ico"><mat-icon aria-hidden="true">group</mat-icon></span>
            <span class="txt">Trabajadoras</span>
          </a>
          <a routerLink="/proveedores" routerLinkActive="active">
            <span class="ico"><mat-icon aria-hidden="true">storefront</mat-icon></span>
            <span class="txt">Proveedores</span>
          </a>
        </span>
      </nav>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
      }

      /* ---------- Barra superior ---------- */

      mat-toolbar {
        position: sticky;
        top: 0;
        z-index: 20;
        background: var(--glass) !important;
        color: var(--color-foreground) !important;
        border-bottom: 1px solid var(--color-border);
        padding: 0 var(--page-pad);
        padding-top: env(safe-area-inset-top);
        min-height: 64px;
        backdrop-filter: blur(14px);
      }
      .brand,
      .rail-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .mark {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        flex-shrink: 0;
        border-radius: 12px;
        background: linear-gradient(145deg, var(--color-primary), var(--color-primary-strong));
        color: var(--color-on-primary);
        box-shadow: 0 6px 14px -8px var(--color-primary);
      }
      .mark mat-icon {
        width: 21px;
        height: 21px;
        font-size: 21px;
      }
      .brand-text {
        display: grid;
        line-height: 1.15;
        min-width: 0;
      }
      .brand-text strong {
        font-size: 1.05rem;
        font-weight: 800;
        letter-spacing: -0.02em;
      }
      .brand-text em {
        color: var(--color-muted-foreground);
        font-size: 0.75rem;
        font-style: normal;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .spacer {
        flex: 1;
      }
      .logout {
        display: inline-flex;
        gap: 6px;
        color: var(--color-muted-foreground);
      }
      .logout mat-icon {
        width: 19px;
        height: 19px;
        font-size: 19px;
      }

      .offline {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 11px var(--page-pad);
        background: var(--warn-soft);
        color: var(--warn);
        font-size: 0.9rem;
        font-weight: 600;
      }
      .offline mat-icon {
        width: 20px;
        height: 20px;
        font-size: 20px;
        flex-shrink: 0;
      }

      .content {
        flex: 1;
        width: min(var(--content-max), 100%);
        margin: 0 auto;
        padding: var(--space-lg) var(--page-pad);
        padding-bottom: calc(var(--bottom-nav-space) + env(safe-area-inset-bottom));
      }

      /* ---------- Navegación: barra inferior en móvil ---------- */

      .nav {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 30;
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 2px;
        background: var(--glass);
        border-top: 1px solid var(--color-border);
        padding: 6px 6px calc(6px + env(safe-area-inset-bottom));
        backdrop-filter: blur(14px);
        box-shadow: 0 -8px 24px rgba(47, 37, 40, 0.05);
      }
      .nav a {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        min-height: 54px;
        padding: 2px;
        border-radius: var(--radius-xs);
        text-decoration: none;
        color: var(--color-muted-foreground);
        font-size: 11px;
        font-weight: 700;
        transition: color var(--transition);
      }
      .nav .ico {
        display: grid;
        place-items: center;
        width: 50px;
        height: 28px;
        border-radius: var(--radius-pill);
        transition:
          background var(--transition),
          transform var(--transition);
      }
      .nav .ico mat-icon {
        width: 22px;
        height: 22px;
        font-size: 22px;
      }
      .nav a.active {
        color: var(--color-primary);
      }
      .nav a.active .ico {
        background: var(--color-muted);
      }
      .nav a:active .ico {
        transform: scale(0.92);
      }

      /* En móvil el rail no existe */
      .rail-brand,
      .rail-foot {
        display: none;
      }

      @media (max-width: 360px) {
        .nav {
          gap: 0;
          padding-left: 2px;
          padding-right: 2px;
        }
        .nav a {
          font-size: 10px;
          letter-spacing: -0.01em;
        }
        .nav .ico {
          width: 44px;
        }
      }

      /* ---------- Navegación: rail lateral en escritorio ---------- */

      @media (min-width: 1024px) {
        .shell {
          padding-left: var(--rail);
        }
        mat-toolbar .brand {
          display: none;
        }
        .nav {
          top: 0;
          right: auto;
          bottom: 0;
          width: var(--rail);
          grid-template-columns: 1fr;
          grid-auto-rows: min-content;
          align-content: start;
          gap: 4px;
          padding: 18px 14px;
          border-top: 0;
          border-right: 1px solid var(--color-border);
          box-shadow: none;
          overflow-y: auto;
        }
        .rail-brand {
          display: flex;
          padding: 4px 10px var(--space-lg);
        }
        .nav a {
          flex-direction: row;
          justify-content: flex-start;
          gap: 12px;
          min-height: 46px;
          padding: 0 12px;
          border-radius: var(--radius-pill);
          font-size: 0.95rem;
          font-weight: 600;
          transition:
            color var(--transition),
            background var(--transition);
        }
        .nav a:hover {
          background: var(--surface-2);
        }
        .nav a.active {
          background: var(--color-muted);
          font-weight: 800;
        }
        .nav .ico {
          width: 24px;
          height: 24px;
          background: none !important;
        }
        .rail-foot {
          display: grid;
          gap: 4px;
          margin-top: var(--space-lg);
          padding-top: var(--space-md);
          border-top: 1px solid var(--color-border);
        }
      }
    `,
  ],
})
export class ShellComponent {
  readonly offline = signal(typeof navigator !== 'undefined' && !navigator.onLine);

  constructor(readonly auth: AuthService) {}

  @HostListener('window:offline')
  onOffline(): void {
    this.offline.set(true);
  }

  @HostListener('window:online')
  onOnline(): void {
    this.offline.set(false);
  }
}
