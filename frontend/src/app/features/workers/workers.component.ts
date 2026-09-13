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
import { Worker } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

@Component({
  selector: 'app-workers',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MoneyPipe,
  ],
  template: `
    <h1>Trabajadoras</h1>
    <mat-card class="form-card">
      <h2>{{ editingId() ? 'Editar' : 'Nueva trabajadora' }}</h2>
      <form [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Valor de la hora</mat-label>
          <input matInput type="number" formControlName="hourlyRate" />
        </mat-form-field>
        <mat-slide-toggle formControlName="active">Activa</mat-slide-toggle>
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

    @for (worker of workers(); track worker.id) {
      <mat-card class="item">
        <div>
          <h3>{{ worker.name }}</h3>
          <p>
            {{ worker.hourlyRate | money }} / hora ·
            {{ worker.active ? 'Activa' : 'Inactiva' }}
          </p>
        </div>
        <div class="row">
          <button mat-button type="button" (click)="edit(worker)">Editar</button>
          <button mat-button type="button" (click)="toggle(worker)">
            {{ worker.active ? 'Desactivar' : 'Activar' }}
          </button>
        </div>
      </mat-card>
    }
  `,
  styles: [
    `
      .form-card, .item { padding: var(--space-md); margin-bottom: 12px; }
      form { display: flex; flex-direction: column; gap: var(--space-sm); }
      .item { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
      h2 { margin: 0 0 12px; }
      h3, p { margin: 0; }
      p { color: var(--color-muted-foreground); }
      .row { display: flex; gap: var(--space-sm); }
      button { min-height: 44px; }
    `,
  ],
})
export class WorkersComponent implements OnInit {
  readonly workers = signal<Worker[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly form;

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
    private readonly snack: MatSnackBar,
  ) {
    this.form = fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      hourlyRate: [6000, [Validators.required, Validators.min(1)]],
      active: [true],
    });
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.getWorkers().subscribe((workers) => this.workers.set(workers));
  }

  edit(worker: Worker): void {
    this.editingId.set(worker.id);
    this.form.setValue({
      name: worker.name,
      hourlyRate: worker.hourlyRate,
      active: worker.active,
    });
  }

  cancel(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', hourlyRate: 6000, active: true });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    const request = this.editingId()
      ? this.api.updateWorker(this.editingId()!, value)
      : this.api.createWorker(value);
    request.subscribe({
      next: () => {
        this.snack.open('Trabajadora guardada', 'OK', { duration: 2500 });
        this.cancel();
        this.reload();
      },
      error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
    });
  }

  toggle(worker: Worker): void {
    this.api.updateWorker(worker.id, { active: !worker.active }).subscribe({
      next: () => this.reload(),
      error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
    });
  }
}
