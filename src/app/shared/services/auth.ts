import { Injectable } from '@angular/core';

const TOKEN_KEY = 'salem_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  login(email: string, password: string): Promise<void> {
    // пока мок. потом подключим API
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email.trim() && password.trim().length >= 6) {
          localStorage.setItem(TOKEN_KEY, 'mock-token-' + Date.now());
          resolve();
        } else {
          reject(new Error('Неверный логин или пароль'));
        }
      }, 700);
    });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}
