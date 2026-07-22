import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../shared/services/auth';
import { resolveApiErrorMessage } from '../../shared/utils/http-error';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPageComponent {
  loading = false;
  error: string | null = null;
  showPassword = false;

  form = new FormGroup({
    login: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  constructor(private auth: AuthService, private router: Router) {}

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const login = this.form.value.login ?? '';
    const password = this.form.value.password ?? '';

    try {
      await this.auth.login(login, password);
      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (e: any) {
      this.error = this.resolveLoginError(e);
    } finally {
      this.loading = false;
    }
  }

  private resolveLoginError(e: any): string {
    // On the login form specifically, a 401/403 almost always means the
    // credentials were wrong, not an expired session — override the shared
    // helper's generic "session expired" copy for that case.
    if (e instanceof HttpErrorResponse && (e.status === 401 || e.status === 403) && !e.error?.message) {
      return 'Неверный логин или пароль.';
    }

    return resolveApiErrorMessage(e, 'Ошибка входа');
  }
}
