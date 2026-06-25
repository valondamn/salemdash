import { Component, OnInit, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ThemeService } from '../../shared/services/theme';
import { AuthService } from '../../shared/services/auth';
import { AddUserPayload, RoleOption, SystemUser } from '../../shared/services/ssm-models';
import { extractCreatedUserId, SsmApiService } from '../../shared/services/ssm-api.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [ReactiveFormsModule, NgFor],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly ssmApi = inject(SsmApiService);
  private readonly toastr = inject(ToastrService);

  roles: RoleOption[] = [];
  users: SystemUser[] = [];
  loadingUsers = false;
  savingUser = false;
  deletingUserId: number | null = null;
  usersError: string | null = null;

  readonly userForm = new FormGroup({
    login: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    role: new FormControl('user', [Validators.required]),
  });

  constructor(public theme: ThemeService) {}

  async ngOnInit() {
    await this.auth.restoreSession();

    if (this.canManageUsers) {
      await this.loadAdminData();
    }
  }

  get current() {
    return this.theme.getTheme();
  }

  get currentUser() {
    return this.auth.user();
  }

  get canManageUsers() {
    return this.auth.hasRole('super_user');
  }

  set(theme: 'dark' | 'light') {
    this.theme.setTheme(theme);
  }

  async createUser() {
    if (!this.canManageUsers) return;

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.savingUser = true;
    this.usersError = null;

    const payload: AddUserPayload = {
      login: this.userForm.controls.login.value?.trim() ?? '',
      password: this.userForm.controls.password.value ?? '',
      role: this.userForm.controls.role.value ?? 'user',
    };

    try {
      const response = await firstValueFrom(this.ssmApi.addUser(payload));
      const createdUserId = extractCreatedUserId(response);
      this.toastr.success(
        createdUserId ? `Пользователь создан, ID: ${createdUserId}` : 'Пользователь создан',
        'Готово'
      );
      this.userForm.reset({ login: '', password: '', role: this.roles[0]?.code ?? 'user' });
      await this.reloadUsers();
    } catch (error) {
      this.usersError = this.resolveApiError(error, 'Не удалось создать пользователя');
    } finally {
      this.savingUser = false;
    }
  }

  async deactivateUser(user: SystemUser) {
    if (!this.canManageUsers || !user.is_active || user.id === this.currentUser?.user_id) return;
    if (!window.confirm(`Деактивировать пользователя ${user.login}?`)) return;

    this.deletingUserId = user.id;
    this.usersError = null;

    try {
      await firstValueFrom(this.ssmApi.deleteUser(user.id));
      this.toastr.success(`Пользователь ${user.login} деактивирован`, 'Готово');
      await this.reloadUsers();
    } catch (error) {
      this.usersError = this.resolveApiError(error, 'Не удалось деактивировать пользователя');
    } finally {
      this.deletingUserId = null;
    }
  }

  trackByUserId(_: number, user: SystemUser) {
    return user.id;
  }

  private async loadAdminData() {
    this.loadingUsers = true;
    this.usersError = null;

    try {
      const [roles, users] = await Promise.all([
        firstValueFrom(this.ssmApi.getRoles()),
        firstValueFrom(this.ssmApi.getUsers()),
      ]);

      this.roles = roles;
      this.users = users;
      this.userForm.patchValue({ role: roles[0]?.code ?? 'user' });
    } catch (error) {
      this.usersError = this.resolveApiError(error, 'Не удалось загрузить пользователей и роли');
    } finally {
      this.loadingUsers = false;
    }
  }

  private async reloadUsers() {
    this.users = await firstValueFrom(this.ssmApi.getUsers());
  }

  private resolveApiError(error: unknown, fallback: string) {
    const status = (error as { status?: number })?.status;
    const message = (error as { error?: { message?: string; detail?: string } })?.error?.message
      ?? (error as { error?: { message?: string; detail?: string } })?.error?.detail;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    switch (status) {
      case 401:
        return 'Сессия истекла. Войдите заново.';
      case 403:
        return 'Недостаточно прав для выполнения действия.';
      case 404:
        return 'Объект не найден.';
      case 409:
        return 'Конфликт данных. Проверьте логин пользователя.';
      default:
        return fallback;
    }
  }
}
