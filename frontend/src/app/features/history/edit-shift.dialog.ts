import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { WorkShift } from '../../core/models';

export interface ShiftEditResult {
  workDate: string;
  startTime: string;
  endTime?: string;
  mealBreakMinutes?: number;
}

@Component({
  selector: 'app-edit-shift-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Corregir registro</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <p class="who">{{ shift.worker.name }} · {{ shift.provider.name }}</p>
        <mat-form-field appearance="outline">
          <mat-label>Fecha</mat-label>
          <input matInput type="date" formControlName="workDate" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Hora de ingreso</mat-label>
          <input matInput type="time" formControlName="startTime" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Hora de salida</mat-label>
          <input matInput type="time" formControlName="endTime" />
          @if (!shift.endTime) {
            <mat-hint>Déjala vacía si sigue en curso</mat-hint>
          }
        </mat-form-field>
        @if (shift.endTime) {
          <mat-form-field appearance="outline">
            <mat-label>Alimentación (minutos)</mat-label>
            <input matInput type="number" min="0" formControlName="mealBreakMinutes" />
          </mat-form-field>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Guardar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .who {
        margin: 0 0 12px;
        color: var(--color-muted-foreground);
      }
      mat-dialog-content {
        display: flex;
        flex-direction: column;
        padding-top: 4px !important;
      }
    `,
  ],
})
export class EditShiftDialogComponent {
  readonly shift = inject<WorkShift>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<EditShiftDialogComponent, ShiftEditResult>>(MatDialogRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    workDate: [this.shift.workDate, Validators.required],
    startTime: [this.shift.startTime, Validators.required],
    endTime: [this.shift.endTime ?? '', this.shift.endTime ? Validators.required : []],
    mealBreakMinutes: [this.shift.mealBreakMinutes, [Validators.required, Validators.min(0)]],
  });

  save(): void {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    this.ref.close({
      workDate: value.workDate,
      startTime: value.startTime,
      ...(value.endTime
        ? { endTime: value.endTime, mealBreakMinutes: Number(value.mealBreakMinutes) }
        : {}),
    });
  }
}
