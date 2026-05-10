import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { AutoReleaseAddPayload, CreateReleasePayload } from './ssm-models';

@Injectable({ providedIn: 'root' })
export class ReleasesApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  createRelease(payload: CreateReleasePayload) {
    return this.http.post(`${this.baseUrl}/ssm/releases`, payload);
  }

  updateAutoRelease(payload: AutoReleaseAddPayload) {
    return this.http.post(`${this.baseUrl}/ssm/auto_release_add/update`, payload, {
      responseType: 'text',
    });
  }
}
