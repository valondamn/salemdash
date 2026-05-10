import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';
import { EpisodeInfo, Project, ProjectInfoApiResponse } from './ssm-models';
import { normalizeProjectInfo } from './ssm-normalizers';

@Injectable({ providedIn: 'root' })
export class ProjectsApiService {
  private readonly baseUrl = environment.apiBaseUrl;
  private projects$?: Observable<Project[]>;
  private readonly projectInfoCache = new Map<number, Observable<EpisodeInfo[]>>();

  constructor(private readonly http: HttpClient) {}

  getProjects(force = false) {
    if (!this.projects$ || force) {
      this.projects$ = this.http
        .get<Project[]>(`${this.baseUrl}/ssm/get_projects`)
        .pipe(shareReplay(1));
    }

    return this.projects$;
  }

  getProjectInfo(projectId: number, force = false) {
    const cached = this.projectInfoCache.get(projectId);
    if (!cached || force) {
      const request$ = this.http
        .get<EpisodeInfo[] | ProjectInfoApiResponse>(`${this.baseUrl}/ssm/info_byprojectid=${projectId}`)
        .pipe(
          map((response) => normalizeProjectInfo(response)),
          shareReplay(1)
        );

      this.projectInfoCache.set(projectId, request$);
    }

    return this.projectInfoCache.get(projectId)!;
  }
}
