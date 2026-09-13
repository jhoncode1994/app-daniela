import { Component } from '@angular/core';
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
        <a mat-button routerLink="/trabajadoras">Trabajadoras</a>
        <button mat-button type="button" (click)="auth.logout()">Salir</button>
      </mat-toolbar>

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
        <a routerLink="/jornadas" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
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
        background: var(--color-card) !important;
        color: var(--color-foreground) !important;
        border-bottom: 1px solid var(--color-border);
        padding-top: env(safe-area-inset-top);
      }
      .title {
        font-weight: 700;
        color: var(--color-primary);
      }
      .spacer {
        flex: 1;
      }
      .content {
        flex: 1;
        width: min(720px, 100%);
        margin: 0 auto;
        padding: var(--space-md) var(--space-md) 104px;
        box-sizing: border-box;
      }
      .bottom-nav {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        background: var(--color-card);
        border-top: 1px solid var(--color-border);
        padding: 8px 4px calc(8px + env(safe-area-inset-bottom));
        z-index: 10;
      }
      .bottom-nav a {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        min-height: 48px;
        text-decoration: none;
        color: var(--color-muted-foreground);
        font-size: 12px;
        font-weight: 500;
        border-radius: 12px;
        transition: color 200ms ease, background-color 200ms ease;
      }
      .bottom-nav a.active {
        color: var(--color-primary);
        background: var(--color-muted);
      }
    `,
  ],
})
export class ShellComponent {
  constructor(readonly auth: AuthService) {}
}
