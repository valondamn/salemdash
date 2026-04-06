import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';


export type AutoReleaseAddPayload = {
  release_date: string;   // "YYYY-MM-DD"
  project_id: number;
  season: number;
  episodes_name: string;
  youtube_id: string;
};

export type CreateReleasePayload = {
  release_date: string;    // YYYY-MM-DD
  project_id: number;
  season: number;
  episodes_name: string;
  yt_id: string;
};

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

  retention?: string;
  avg_view_by_user?: string;

  release_date?: string;
  youtube_release_date?: string;

  [key: string]: any;
};

export type VisitsItem = {
  url: string;
  users: number;
  visits: number;
};

export type YoutubeItem = {
  video_id: string;
  views: number;
  likes: number;
  comments: number;
};

export type VisitsBlock = {
  project_slug: string;
  type: string; // "series" | "teaser"
  updated_at: string;

  yandex?: VisitsItem[];
  youtube?: YoutubeItem[];

  // часто у teaser есть total/details
  total?: {
    users?: number;
    visits?: number;
    views?: number;
    likes?: number;
    comments?: number;
  };

  details?: {
    yandex?: VisitsItem[];
    youtube?: YoutubeItem[];
  };

  [key: string]: any;
};

export type VisitsResponse = Record<string, VisitsBlock>;

export type UnifiedVisitsRow = {
  key: string; // series_1, series_2, teaser...
  project_slug: string;
  type: string;
  updated_at: string;

  yandex_users: number;
  yandex_visits: number;

  youtube_views: number;
  youtube_likes: number;
  youtube_comments: number;
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

  // NEW: visits endpoint (Yandex + YouTube totals)
  getVisits() {
    return this.http.get<VisitsResponse>(`${this.base}/visits`);
  }

  createRelease(payload: CreateReleasePayload) {
    return this.http.post(`${this.base}/ssm/releases`, payload);
  }

  addAutoRelease(payload: AutoReleaseAddPayload) {
    return this.http.post(
      `${this.base}/ssm/auto_release_add/insert`,
      payload,
      { responseType: 'text' } // <-- ключевой фикс
    );
  }

  // NEW: normalize /visits payload into array (easy for UI)
  normalizeVisits(resp: VisitsResponse): UnifiedVisitsRow[] {
    const toNum = (v: any) => Number(v) || 0;

    return Object.entries(resp).map(([key, b]) => {
      const yArr = b.yandex ?? b.details?.yandex ?? [];
      const ytArr = b.youtube ?? b.details?.youtube ?? [];

      const yandex_users = yArr.reduce((s, x) => s + toNum((x as any).users), 0);
      const yandex_visits = yArr.reduce((s, x) => s + toNum((x as any).visits), 0);

      // If total exists (e.g., teaser), prefer it; otherwise sum array
      const youtube_views =
        b.total?.views != null ? toNum(b.total.views) : ytArr.reduce((s, x) => s + toNum((x as any).views), 0);

      const youtube_likes =
        b.total?.likes != null ? toNum(b.total.likes) : ytArr.reduce((s, x) => s + toNum((x as any).likes), 0);

      const youtube_comments =
        b.total?.comments != null
          ? toNum(b.total.comments)
          : ytArr.reduce((s, x) => s + toNum((x as any).comments), 0);

      return {
        key,
        project_slug: b.project_slug,
        type: b.type,
        updated_at: b.updated_at,
        yandex_users,
        yandex_visits,
        youtube_views,
        youtube_likes,
        youtube_comments,
      };
    });
  }
}
