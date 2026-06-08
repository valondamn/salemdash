import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthUser } from './ssm-models';
import { SsmApiService } from './ssm-api.service';

const TOKEN_KEY = 'salem_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSignal = signal<AuthUser | null>(null);
  readonly user = this.currentUserSignal.asReadonly();
  private restorePromise: Promise<boolean> | null = null;

  constructor(private readonly ssmApi: SsmApiService) {}

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get currentUser(): AuthUser | null {
    return this.currentUserSignal();
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  hasRole(...roles: string[]): boolean {
    const role = this.currentUserSignal()?.role;
    return !!role && roles.includes(role);
  }

  async login(login: string, password: string): Promise<void> {
    const response = await firstValueFrom(this.ssmApi.login({ login, password }));

    if (!response.token) {
      throw new Error('Сервер не вернул токен авторизации');
    }

    localStorage.setItem(TOKEN_KEY, response.token);
    this.currentUserSignal.set(response.user);

    if (!response.user) {
      const isRestored = await this.restoreSession(true);
      if (!isRestored) {
        throw new Error('Не удалось получить данные пользователя');
      }
    }
  }

  async restoreSession(force = false): Promise<boolean> {
    if (!this.token) {
      this.currentUserSignal.set(null);
      this.restorePromise = null;
      return false;
    }

    if (!force && this.currentUserSignal()) {
      return true;
    }

    if (!force && this.restorePromise) {
      return this.restorePromise;
    }

    this.restorePromise = firstValueFrom(this.ssmApi.me())
      .then((user) => {
        this.currentUserSignal.set(user);
        return true;
      })
      .catch(() => {
        this.logout();
        return false;
      })
      .finally(() => {
        this.restorePromise = null;
      });

    return this.restorePromise;
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUserSignal.set(null);
    this.restorePromise = null;
  }
}
