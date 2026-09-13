import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { LoginComponent } from './features/login/login.component';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'trabajadoras',
        loadComponent: () =>
          import('./features/workers/workers.component').then((m) => m.WorkersComponent),
      },
      {
        path: 'jornadas/nueva',
        loadComponent: () =>
          import('./features/shifts/shift-form.component').then((m) => m.ShiftFormComponent),
      },
      {
        path: 'jornadas',
        loadComponent: () =>
          import('./features/history/history.component').then((m) => m.HistoryComponent),
      },
      {
        path: 'liquidaciones',
        loadComponent: () =>
          import('./features/settlements/settlements.component').then((m) => m.SettlementsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
