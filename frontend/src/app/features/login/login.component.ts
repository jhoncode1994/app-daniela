import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';
import { httpErrorMessage } from '../../core/http-error';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="wrap">
      <mat-card class="page-enter">
        <span class="mark" aria-hidden="true">
          <mat-icon>schedule</mat-icon>
        </span>
        <p class="eyebrow">Bienvenida</p>
        <h1>Control de jornadas</h1>
        <p class="lead">Entra para registrar horas y pagos del taller.</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Usuario</mat-label>
            <input matInput formControlName="username" autocomplete="username" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Contraseña</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="current-password" />
          </mat-form-field>
          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <button mat-flat-button color="primary" class="full" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .wrap {
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
      }
      mat-card {
        width: min(430px, 100%);
        padding: clamp(24px, 6vw, 34px);
        box-shadow: var(--shadow-lg) !important;
      }
      .mark {
        display: grid;
        place-items: center;
        width: 54px;
        height: 54px;
        margin-bottom: var(--space-md);
        border-radius: 18px;
        background: linear-gradient(145deg, var(--color-primary), var(--color-primary-strong));
        color: var(--color-on-primary);
        box-shadow: 0 12px 24px -12px var(--color-primary);
      }
      .mark mat-icon {
        width: 28px;
        height: 28px;
        font-size: 28px;
      }
      h1 {
        margin: 0 0 8px;
      }
      .lead {
        margin: 0 0 var(--space-lg);
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .full {
        width: 100%;
        min-height: 54px;
        margin-top: var(--space-sm);
      }
      .error {
        margin: 0 0 8px;
        padding: 10px 12px;
        border-radius: var(--radius-sm);
        background: var(--color-destructive-soft);
        color: var(--color-destructive);
        font-weight: 600;
      }
    `,
  ],
})
export class LoginComponent {
  readonly loading = signal(false);
  readonly error = signal('');
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {
    this.form = fb.nonNullable.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo iniciar sesión'));
      },
    });
  }
}
