import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AddUserResponse,
  AddUserPayload,
  CurrentUserResponse,
  LoginPayload,
  LoginResponse,
  RoleListResponse,
  SystemUser,
} from './ssm-models';
import {
  extractAuthToken,
  normalizeAuthUser,
  normalizeRoleOption,
  normalizeSystemUser,
} from './ssm-normalizers';

@Injectable({ providedIn: 'root' })
export class SsmApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/ssm`;
  private readonly requestTimeoutMs = 15000;

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginPayload) {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload).pipe(
      timeout({ first: this.requestTimeoutMs }),
      map((response) => ({
        token: extractAuthToken(response),
        user: response?.user ? normalizeAuthUser(response.user) : null,
        raw: response,
      }))
    );
  }

  me() {
    return this.http.get<CurrentUserResponse>(`${this.baseUrl}/me`).pipe(
      timeout({ first: this.requestTimeoutMs }),
      map((response) => normalizeAuthUser(response?.user))
    );
  }

  getRoles() {
    return this.http.get<RoleListResponse>(`${this.baseUrl}/get_roles`).pipe(
      timeout({ first: this.requestTimeoutMs }),
      map((response) => (response?.roles ?? []).map((role) => normalizeRoleOption(role)))
    );
  }

  getUsers() {
    return this.http.get<SystemUser[]>(`${this.baseUrl}/get_users`).pipe(
      timeout({ first: this.requestTimeoutMs }),
      map((response) => (response ?? []).map((user) => normalizeSystemUser(user)))
    );
  }
  addUser(payload: AddUserPayload) {
    return this.http
      .post<AddUserResponse>(`${this.baseUrl}/add_user`, payload)
      .pipe(timeout({ first: this.requestTimeoutMs }));
  }

  deleteUser(userId: number) {
    return this.http.delete(`${this.baseUrl}/delete_user=${userId}`).pipe(timeout({ first: this.requestTimeoutMs }));
  }
}

export * from './ssm-models';
export * from './ssm-normalizers';
export * from './projects-api.service';
export * from './analytics-api.service';
export * from './releases-api.service';
