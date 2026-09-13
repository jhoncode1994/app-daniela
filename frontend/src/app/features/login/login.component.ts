import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth.service';
import { httpErrorMessage } from '../../core/http-error';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="wrap">
      <mat-card>
        <p class="eyebrow">Bienvenida</p>
        <h1>Control de jornadas</h1>
        <p class="lead">Entra para registrar horas y pagos.</p>
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
        background: var(--color-background);
      }
      mat-card {
        width: min(420px, 100%);
        padding: clamp(16px, 4vw, 24px);
      }
      .eyebrow {
        margin: 0 0 6px;
        color: var(--color-primary);
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0 0 8px;
      }
      .lead {
        margin: 0 0 20px;
        color: var(--color-muted-foreground);
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .full {
        width: 100%;
        min-height: var(--touch);
        margin-top: 8px;
      }
      .error {
        color: var(--color-destructive);
        margin: 0 0 8px;
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
