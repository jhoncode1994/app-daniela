import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { httpErrorMessage } from '../../core/http-error';
import { Lot, Provider } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type ProviderGroup = {
  providerId: string;
  providerName: string;
  lots: Lot[];
  openCount: number;
};

@Component({
  selector: 'app-lots',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MoneyPipe,
  ],
  template: `
    <div class="page-enter">
      <p class="eyebrow">Taller</p>
      <h1>Referencias</h1>
      <p class="hint">
        Cuando llega un lote, regístralo aquí dentro de su proveedor. Al registrar horas podrás
        elegir esta referencia; cuando el lote salga del taller, dale de baja.
      </p>

      <mat-card class="form-card">
        <h2>{{ editing() ? 'Editar referencia' : 'Nueva referencia' }}</h2>
        <form [formGroup]="form" (ngSubmit)="save()">
          <mat-form-field appearance="outline">
            <mat-label>Proveedor</mat-label>
            <mat-select formControlName="providerId">
              @for (provider of providers(); track provider.id) {
                <mat-option [value]="provider.id">{{ provider.name }}</mat-option>
              }
            </mat-select>
            @if (editing()) {
              <mat-hint>El proveedor de una referencia no se cambia.</mat-hint>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Referencia del lote</mat-label>
            <input matInput formControlName="reference" placeholder="Ej. REF-1042" />
          </mat-form-field>

          <div class="pair">
            <mat-form-field appearance="outline">
              <mat-label>Unidades</mat-label>
              <input matInput type="number" min="0" step="1" formControlName="units" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Valor por unidad</mat-label>
              <input matInput type="number" min="0" step="1" formControlName="unitPrice" />
            </mat-form-field>
          </div>

          <div class="computed" aria-live="polite">
            <span>Valor de la referencia</span>
            <strong>{{ formValue() | money }}</strong>
            <em>{{ form.value.units || 0 }} × {{ (form.value.unitPrice || 0) | money }}</em>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Observaciones</mat-label>
            <textarea matInput rows="3" formControlName="notes"></textarea>
            <mat-hint>Opcional: color, talla, lo que necesites recordar.</mat-hint>
          </mat-form-field>

          <div class="row">
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
              {{ editing() ? 'Guardar cambios' : 'Registrar referencia' }}
            </button>
            @if (editing()) {
              <button mat-button type="button" (click)="cancel()">Cancelar</button>
            }
          </div>
        </form>
      </mat-card>

      @if (providers().length === 0) {
        <mat-card class="empty-state">
          <mat-icon aria-hidden="true">store</mat-icon>
          <p>Primero crea un proveedor y vuelve aquí a registrar sus referencias.</p>
          <a mat-flat-button color="primary" routerLink="/proveedores">Crear proveedor</a>
        </mat-card>
      }

      <div class="segmented" role="group" aria-label="Filtro de referencias">
        <button type="button" [class.on]="filter() === 'open'" (click)="filter.set('open')">
          En el taller ({{ openTotal() }})
        </button>
        <button type="button" [class.on]="filter() === 'closed'" (click)="filter.set('closed')">
          Dadas de baja ({{ closedTotal() }})
        </button>
        <button type="button" [class.on]="filter() === 'all'" (click)="filter.set('all')">Todas</button>
      </div>

      @for (group of groups(); track group.providerId) {
        <section class="group">
          <header>
            <h2>{{ group.providerName }}</h2>
            <span>{{ group.lots.length }} referencia(s)</span>
          </header>

          @for (lot of group.lots; track lot.id) {
            <mat-card class="item" [class.closed]="lot.closed">
              <div class="head">
                <div class="ref">
                  <span class="pill" [class.is-off]="lot.closed" [class.is-success]="!lot.closed">
                    {{ lot.closed ? 'Dada de baja' : 'En el taller' }}
                  </span>
                  <h3>{{ lot.reference }}</h3>
                </div>
                <a mat-button [routerLink]="['/jornadas']" [queryParams]="{ lotId: lot.id }">
                  Ver horas
                </a>
              </div>

              <div class="money">
                <div>
                  <span>Valor de la referencia</span>
                  <strong>{{ lot.value | money }}</strong>
                  <em>{{ lot.units }} × {{ lot.unitPrice | money }}</em>
                </div>
                <div>
                  <span>Mano de obra</span>
                  <strong>{{ lot.laborTotal | money }}</strong>
                  <em>
                    pagado {{ lot.laborPaid | money }}
                    @if (lot.laborPending > 0) {
                      · por pagar {{ lot.laborPending | money }}
                    }
                  </em>
                </div>
                <div class="profit" [class.negative]="lot.profit < 0">
                  <span>Ganancia</span>
                  <strong>{{ lot.profit | money }}</strong>
                  <em>
                    @if (lot.laborPending > 0) {
                      falta liquidar {{ lot.pendingShifts }} jornada(s)
                    } @else if (lot.value === 0) {
                      falta el valor del lote
                    } @else {
                      todo liquidado
                    }
                  </em>
                </div>
              </div>

              @if (lot.notes) {
                <p class="notes">{{ lot.notes }}</p>
              }

              <div class="row">
                <button mat-button type="button" (click)="edit(lot)">Editar</button>
                <button mat-button type="button" (click)="toggleClosed(lot)">
                  {{ lot.closed ? 'Reactivar' : 'Dar de baja' }}
                </button>
                <button mat-button color="warn" type="button" (click)="remove(lot)">Eliminar</button>
              </div>
            </mat-card>
          }
        </section>
      } @empty {
        @if (providers().length > 0) {
          <mat-card class="empty-state">
            <mat-icon aria-hidden="true">inventory_2</mat-icon>
            <p>No hay referencias que mostrar con este filtro.</p>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [
    `
      .form-card,
      .item,
      .empty {
        padding: var(--space-md);
        margin-bottom: 12px;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
      }
      h2 {
        margin: 0 0 12px;
      }
      h3 {
        margin: 0;
        font-size: 1.15rem;
      }
      .segmented {
        margin: var(--space-lg) 0 var(--space-md);
      }
      .group {
        margin-bottom: var(--space-lg);
      }
      .group > header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin: 0 4px 10px;
      }
      .group > header h2 {
        margin: 0;
        font-size: 1rem;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: var(--color-muted-foreground);
      }
      .group > header span {
        color: var(--color-muted-foreground);
        font-size: 0.85rem;
      }
      .item {
        border: 1px solid var(--color-border);
      }
      .item.closed {
        opacity: 0.75;
      }
      .head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .ref {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .pill {
        align-self: flex-start;
      }
      .pair {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-sm);
      }
      @media (max-width: 360px) {
        .pair {
          grid-template-columns: 1fr;
        }
      }
      .computed {
        display: grid;
        gap: 2px;
        padding: 12px 14px;
        border: 1px solid var(--color-primary-line);
        border-radius: var(--radius-sm);
        background: linear-gradient(180deg, var(--tint) 0%, var(--color-card) 100%);
      }
      .computed span {
        color: var(--color-muted-foreground);
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .computed strong {
        font-size: 1.35rem;
        color: var(--color-primary);
      }
      .computed em {
        color: var(--color-muted-foreground);
        font-size: 0.85rem;
        font-style: normal;
      }
      .money {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 10px;
        margin-top: 12px;
      }
      .money > div {
        display: grid;
        gap: 2px;
        padding: 10px 12px;
        border-radius: var(--radius-sm);
        background: var(--color-background-soft);
        border: 1px solid var(--color-border);
      }
      .money span {
        color: var(--color-muted-foreground);
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .money strong {
        font-size: 1.1rem;
      }
      .money em {
        color: var(--color-muted-foreground);
        font-size: 0.78rem;
        font-style: normal;
      }
      .money .profit {
        border-color: var(--color-success-line);
        background: var(--tint-success);
      }
      .money .profit strong {
        color: var(--color-success);
      }
      .money .profit.negative {
        border-color: var(--color-primary-line);
        background: var(--tint);
      }
      .money .profit.negative strong {
        color: var(--color-destructive);
      }
      .notes {
        margin: 10px 0 0;
        color: var(--color-muted-foreground);
        white-space: pre-line;
      }
      .row {
        display: flex;
        gap: var(--space-sm);
        flex-wrap: wrap;
        margin-top: 10px;
      }
      .row button {
        min-height: var(--touch);
      }
    `,
  ],
})
export class LotsComponent implements OnInit {
  readonly providers = signal<Provider[]>([]);
  readonly lots = signal<Lot[]>([]);
  readonly editing = signal<Lot | null>(null);
  readonly saving = signal(false);
  readonly filter = signal<'open' | 'closed' | 'all'>('open');
  readonly formValue = signal(0);
  readonly form;

  readonly openTotal = computed(() => this.lots().filter((lot) => !lot.closed).length);
  readonly closedTotal = computed(() => this.lots().filter((lot) => lot.closed).length);

  readonly groups = computed<ProviderGroup[]>(() => {
    const mode = this.filter();
    const visible = this.lots().filter((lot) =>
      mode === 'all' ? true : mode === 'closed' ? lot.closed : !lot.closed,
    );

    const groups = new Map<string, ProviderGroup>();
    for (const lot of visible) {
      let group = groups.get(lot.providerId);
      if (!group) {
        group = {
          providerId: lot.providerId,
          providerName: lot.provider.name,
          lots: [],
          openCount: 0,
        };
        groups.set(lot.providerId, group);
      }
      group.lots.push(lot);
      if (!lot.closed) {
        group.openCount += 1;
      }
    }
    return [...groups.values()].sort((a, b) => a.providerName.localeCompare(b.providerName));
  });

  constructor(
    fb: FormBuilder,
    private readonly api: ApiService,
    private readonly snack: MatSnackBar,
  ) {
    this.form = fb.nonNullable.group({
      providerId: ['', [Validators.required]],
      reference: ['', [Validators.required, Validators.minLength(1)]],
      units: [0, [Validators.required, Validators.min(0)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      notes: [''],
    });
    this.form.valueChanges.subscribe((value) =>
      this.formValue.set(Math.round(Number(value.units ?? 0) * Number(value.unitPrice ?? 0))),
    );
  }

  ngOnInit(): void {
    this.api.getProviders().subscribe((providers) => {
      const active = providers.filter((provider) => provider.active);
      this.providers.set(active);
      if (active.length === 1) {
        this.form.patchValue({ providerId: active[0].id });
      }
    });
    this.reload();
  }

  reload(): void {
    this.api.getLots().subscribe((lots) => this.lots.set(lots));
  }

  edit(lot: Lot): void {
    this.editing.set(lot);
    this.form.setValue({
      providerId: lot.providerId,
      reference: lot.reference,
      units: lot.units,
      unitPrice: lot.unitPrice,
      notes: lot.notes ?? '',
    });
    this.form.controls.providerId.disable();
  }

  cancel(): void {
    this.editing.set(null);
    this.form.controls.providerId.enable();
    this.form.reset({ providerId: '', reference: '', units: 0, unitPrice: 0, notes: '' });
    if (this.providers().length === 1) {
      this.form.patchValue({ providerId: this.providers()[0].id });
    }
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    const { providerId, reference, units, unitPrice, notes } = this.form.getRawValue();
    const current = this.editing();
    this.saving.set(true);
    const request = current
      ? this.api.updateLot(current.id, { reference, units, unitPrice, notes })
      : this.api.createLot({ providerId, reference, units, unitPrice, notes });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Referencia guardada', 'OK', { duration: 2500 });
        this.cancel();
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 });
      },
    });
  }

  toggleClosed(lot: Lot): void {
    if (!lot.closed) {
      const ok = window.confirm(
        `¿Dar de baja la referencia ${lot.reference}? Dejará de aparecer al registrar horas, pero sigue en el historial y en las liquidaciones.`,
      );
      if (!ok) {
        return;
      }
    }
    this.api.updateLot(lot.id, { closed: !lot.closed }).subscribe({
      next: () => {
        this.snack.open(lot.closed ? 'Referencia reactivada' : 'Referencia dada de baja', 'OK', {
          duration: 2500,
        });
        this.reload();
      },
      error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
    });
  }

  remove(lot: Lot): void {
    const ok = window.confirm(
      `¿Eliminar la referencia ${lot.reference}? Solo se puede si no tiene horas registradas.`,
    );
    if (!ok) {
      return;
    }
    this.api.deleteLot(lot.id).subscribe({
      next: () => {
        if (this.editing()?.id === lot.id) {
          this.cancel();
        }
        this.snack.open('Referencia eliminada', 'OK', { duration: 2500 });
        this.reload();
      },
      error: (err) => this.snack.open(httpErrorMessage(err), 'OK', { duration: 4000 }),
    });
  }
}
