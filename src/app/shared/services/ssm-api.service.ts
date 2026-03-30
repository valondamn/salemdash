import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {map} from 'rxjs';

export type Project = {
  id: number;
  name?: string;
  utm_name?: string;
  [key: string]: any;
};

export type EpisodeInfo = {
  id?: number;
  project_id?: number;
  project_name?: string;
  episode_name?: string;

  youtube_views?: number;
  youtube_comments?: number;
  youtube_likes?: number;

  retention?: string;          // иногда приходит строкой
  avg_view_by_user?: string;   // тоже часто строка

  release_date?: string;
  youtube_release_date?: string;

  // остальные поля можно добавить позже
  [key: string]: any;
};

@Injectable({ providedIn: 'root' })
export class SsmApiService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getProjects() {
    return this.http.get<Project[]>(`${this.base}/ssm/get_projects`);
  }

  getProjectInfo(projectId: number) {
    return this.http.get<EpisodeInfo[]>(`${this.base}/ssm/info_byprojectid=${projectId}`);
  }
}
