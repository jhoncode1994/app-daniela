import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

const TOKEN_KEY = 'jornadas_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenState = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly token = this.tokenState.asReadonly();
  readonly isLoggedIn = computed(() => !!this.tokenState());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  login(username: string, password: string) {
    return this.http
      .post<{ accessToken: string; username: string }>('/api/auth/login', { username, password })
      .pipe(
        tap((response) => {
          localStorage.setItem(TOKEN_KEY, response.accessToken);
          this.tokenState.set(response.accessToken);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.tokenState.set(null);
    void this.router.navigate(['/login']);
  }
}
