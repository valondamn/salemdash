import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, shareReplay, tap, throwError, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  EpisodeInfo,
  Project,
  ProjectAccountOption,
  ProjectInfoApiResponse,
  ProjectUpsertPayload,
} from './ssm-models';
import { normalizeAccountOption, normalizeProject, normalizeProjectInfo } from './ssm-normalizers';

@Injectable({ providedIn: 'root' })
export class ProjectsApiService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly requestTimeoutMs = 15000;
  private projects$?: Observable<Project[]>;
  private readonly projectInfoCache = new Map<number, Observable<EpisodeInfo[]>>();
  private youtubeChannelList$?: Observable<ProjectAccountOption[]>;
  private instagramAccountList$?: Observable<ProjectAccountOption[]>;
  private tiktokAccountList$?: Observable<ProjectAccountOption[]>;

  constructor(private readonly http: HttpClient) {}

  getProjects(force = false) {
    if (!this.projects$ || force) {
      this.projects$ = this.http
        .get<Project[]>(`${this.baseUrl}/ssm/get_projects`)
        .pipe(
          timeout({ first: this.requestTimeoutMs }),
          map((items) => (items ?? []).map((item) => normalizeProject(item))),
          catchError((error) => {
            this.projects$ = undefined;
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.projects$;
  }

  getProjectInfo(projectId: number, force = false) {
    const cached = this.projectInfoCache.get(projectId);
    if (!cached || force) {
      const request$ = this.http
        .get<EpisodeInfo[] | ProjectInfoApiResponse>(`${this.baseUrl}/ssm/info_byprojectid=${projectId}`)
        .pipe(
          timeout({ first: this.requestTimeoutMs }),
          map((response) => normalizeProjectInfo(response)),
          catchError((error) => {
            this.projectInfoCache.delete(projectId);
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );

      this.projectInfoCache.set(projectId, request$);
    }

    return this.projectInfoCache.get(projectId)!;
  }

  getYoutubeChannelList(force = false) {
    if (!this.youtubeChannelList$ || force) {
      this.youtubeChannelList$ = this.http
        .get<any[]>(`${this.baseUrl}/ssm/get_youtube_channel_list`)
        .pipe(
          timeout({ first: this.requestTimeoutMs }),
          map((items) => (items ?? []).map((item) => normalizeAccountOption(item))),
          catchError((error) => {
            this.youtubeChannelList$ = undefined;
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.youtubeChannelList$;
  }

  getInstagramAccountList(force = false) {
    if (!this.instagramAccountList$ || force) {
      this.instagramAccountList$ = this.http
        .get<any[]>(`${this.baseUrl}/ssm/get_instagram_accounts`)
        .pipe(
          timeout({ first: this.requestTimeoutMs }),
          map((items) => (items ?? []).map((item) => normalizeAccountOption(item))),
          catchError((error) => {
            this.instagramAccountList$ = undefined;
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.instagramAccountList$;
  }

  getTikTokAccountList(force = false) {
    if (!this.tiktokAccountList$ || force) {
      this.tiktokAccountList$ = this.http
        .get<any[]>(`${this.baseUrl}/ssm/get_tiktok_accounts`)
        .pipe(
          timeout({ first: this.requestTimeoutMs }),
          map((items) => (items ?? []).map((item) => normalizeAccountOption(item))),
          catchError((error) => {
            this.tiktokAccountList$ = undefined;
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.tiktokAccountList$;
  }

  addProject(payload: ProjectUpsertPayload) {
    return this.http.post(`${this.baseUrl}/ssm/add_project`, payload).pipe(
      tap(() => {
        this.projects$ = undefined;
      })
    );
  }

  updateProject(projectId: number, payload: ProjectUpsertPayload) {
    return this.http.put(`${this.baseUrl}/ssm/update_project=${projectId}`, payload).pipe(
      tap(() => {
        this.projects$ = undefined;
      })
    );
  }
}
