import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { httpErrorMessage } from '../../core/http-error';
import { Provider } from '../../core/models';

@Component({
  selector: 'app-providers',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page-enter">
      <p class="eyebrow">Destinos</p>
      <h1>Proveedores</h1>
      <p class="hint">Nómbralos como quieras (ej. Alma Rosa, Bizcocho) y asígnalos al registrar tiempo.</p>

      <mat-card class="form-card">
        <h2>{{ editingId() ? 'Editar' : 'Nuevo proveedor' }}</h2>
        <form [formGroup]="form" (ngSubmit)="save()">
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-slide-toggle formControlName="active">Activo</mat-slide-toggle>
          <div class="row">
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
              Guardar
            </button>
            @if (editingId()) {
              <button mat-button type="button" (click)="cancel()">Cancelar</button>
            }
          </div>
        </form>
      </mat-card>

      @for (provider of providers(); track provider.id) {
        <mat-card class="item">
          <div class="identity">
            <div class="avatar" aria-hidden="true">{{ provider.name.charAt(0) }}</div>
            <div>
              <h3>{{ provider.name }}</h3>
              <p>
                <span [class.off]="!provider.active">{{ provider.active ? 'Activo' : 'Inactivo' }}</span>
              </p>
            </div>
          </div>
          <div class="row">
            <button mat-button type="button" (click)="edit(provider)">Editar</button>
            <button mat-button type="button" (click)="toggle(provider)">
              {{ provider.active ? 'Desactivar' : 'Activar' }}
            </button>
            <button mat-button color="warn" type="button" (click)="remove(provider)">Eliminar</button>
          </div>
        </mat-card>
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
      .hint {
        margin: -4px 0 18px;
        color: var(--color-muted-foreground);
      }
      .form-card,
      .item {
        padding: var(--space-md);
        margin-bottom: 12px;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
      }
      .item {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }
      .identity {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .avatar {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: var(--color-muted);
        color: var(--color-primary);
        font-weight: 700;
        flex-shrink: 0;
      }
      h2 {
        margin: 0 0 12px;
      }
      h3,
      p {
        margin: 0;
      }
      p {
        color: var(--color-muted-foreground);
      }
      .off {
        color: var(--color-destructive);
      }
      .row {
        display: flex;
        gap: var(--space-sm);
        flex-wrap: wrap;
      }
      button {
        min-height: var(--touch);
      }
    `,
  ],
})
export class ProvidersComponent implements OnInit {
  readonly providers = signal<Provider[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
    private readonly snack: MatSnackBar,
  ) {
    this.form = fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      active: [true],
    });
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.getProviders().subscribe((providers) => this.providers.set(providers));
  }

  edit(provider: Provider): void {
    this.editingId.set(provider.id);
    this.form.setValue({
      name: provider.name,
      active: provider.active,
    });
  }

  cancel(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', active: true });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    const request = this.editingId()
      ? this.api.updateProvider(this.editingId()!, value)
      : this.api.createProvider(value);
    request.subscribe({
      next: () => {
        this.snack.open('Proveedor guardado', 'OK', { duration: 2500 });
        this.cancel();
        this.reload();
      },
      error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
    });
  }

  toggle(provider: Provider): void {
    this.api.updateProvider(provider.id, { active: !provider.active }).subscribe({
      next: () => this.reload(),
      error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
    });
  }

  remove(provider: Provider): void {
    const ok = window.confirm(
      `¿Eliminar el proveedor ${provider.name}? Solo se puede si no tiene jornadas.`,
    );
    if (!ok) {
      return;
    }
    this.api.deleteProvider(provider.id).subscribe({
      next: () => {
        if (this.editingId() === provider.id) {
          this.cancel();
        }
        this.snack.open('Proveedor eliminado', 'OK', { duration: 2500 });
        this.reload();
      },
      error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
    });
  }
}
