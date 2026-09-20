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
        <span class="title">Jornadas</span>
        <span class="spacer"></span>
        <a mat-button class="desktop-only" routerLink="/trabajadoras">Trabajadoras</a>
        <a mat-button class="desktop-only" routerLink="/proveedores">Proveedores</a>
        <button mat-button type="button" (click)="auth.logout()">Salir</button>
      </mat-toolbar>

      @if (offline()) {
        <div class="offline" role="status">
          <mat-icon aria-hidden="true">cloud_off</mat-icon>
          Sin conexión. Puedes ver lo cargado, pero no guardar cambios hasta que vuelva internet.
        </div>
      }

      <main id="contenido" class="content">
        <router-outlet />
      </main>

      <nav class="bottom-nav" aria-label="Principal">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          <mat-icon aria-hidden="true">home</mat-icon>
          <span>Inicio</span>
        </a>
        <a routerLink="/jornadas/nueva" routerLinkActive="active">
          <mat-icon aria-hidden="true">add_circle</mat-icon>
          <span>Registrar</span>
        </a>
        <a routerLink="/jornadas" routerLinkActive="active">
          <mat-icon aria-hidden="true">history</mat-icon>
          <span>Historial</span>
        </a>
        <a routerLink="/liquidaciones" routerLinkActive="active">
          <mat-icon aria-hidden="true">payments</mat-icon>
          <span>Liquidar</span>
        </a>
      </nav>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        background: var(--color-background);
      }
      mat-toolbar {
        position: sticky;
        top: 0;
        z-index: 20;
        background: var(--glass) !important;
        color: var(--color-foreground) !important;
        border-bottom: 1px solid var(--color-border);
        padding-top: env(safe-area-inset-top);
        min-height: 56px;
        backdrop-filter: blur(12px);
      }
      .offline {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px var(--page-pad);
        background: var(--warn-soft);
        color: var(--warn);
        font-size: 0.9rem;
        font-weight: 600;
      }
      .title {
        font-weight: 800;
        color: var(--color-primary);
        font-size: 1.15rem;
        letter-spacing: -0.02em;
      }
      .spacer {
        flex: 1;
      }
      .content {
        flex: 1;
        width: min(var(--content-max), 100%);
        margin: 0 auto;
        padding: var(--page-pad);
        padding-bottom: calc(var(--bottom-nav-space) + env(safe-area-inset-bottom));
      }
      .bottom-nav {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 4px;
        background: var(--glass);
        border-top: 1px solid var(--color-border);
        padding: 8px 6px calc(8px + env(safe-area-inset-bottom));
        z-index: 30;
        backdrop-filter: blur(12px);
        box-shadow: 0 -6px 20px rgba(63, 51, 53, 0.04);
      }
      .bottom-nav a {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        min-height: 52px;
        text-decoration: none;
        color: var(--color-muted-foreground);
        font-size: 11px;
        font-weight: 600;
        border-radius: 12px;
        padding: 4px 2px;
        transition: color 200ms ease, background-color 200ms ease;
      }
      .bottom-nav a.active {
        color: var(--color-primary);
        background: var(--color-muted);
      }
      .desktop-only {
        display: none;
      }
      @media (min-width: 768px) {
        .desktop-only {
          display: inline-flex;
        }
        .bottom-nav a {
          font-size: 12px;
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
