import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
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
  season?: number;
  youtube_id?: string;
  youtube_channel?: string;

  youtube_views?: number;
  youtube_comments?: number;
  youtube_likes?: number;

  retention?: string;
  avg_view_by_user?: string;

  release_date?: string;
  youtube_release_date?: string;

  [key: string]: any;
};

type ProjectInfoApiItem = {
  ID?: number;
  ProjectID?: number;
  ProjectName?: string;
  EpisodesName?: string;
  YouTubeViews?: number;
  YouTubeCommentsCount?: number;
  YouTubeLikesCount?: number;
  AudienceRetention?: string;
  AverageViewsByUser?: string;
  ReleaseDate?: string;
  YouTubeReleaseDate?: string;
  Season?: number;
  YouTubeID?: string;
  id?: number;
  project_id?: number;
  project_name?: string;
  episode_name?: string;
  season?: number;
  youtube_id?: string;
  youtube_channel?: string;
  youtube_views?: number;
  youtube_comments?: number;
  youtube_likes?: number;
  retention?: string;
  avg_view_by_user?: string;
  release_date?: string;
  youtube_release_date?: string;
  [key: string]: any;
};

type ProjectInfoApiResponse = {
  count?: number;
  items?: ProjectInfoApiItem[];
  errors?: unknown;
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

export type YoutubeChannelApiItem = {
  id: number;
  name: string;
  subs_count?: number | string;
  link?: string;
  partner?: number | string;
  likes_count?: number | string;
  comments_count?: number | string;
  views_count?: number | string;
  quarter_likes_count?: number | string;
  quarter_comments_count?: number | string;
  quarter_views_count?: number | string;
  [key: string]: any;
};

export type YoutubeChannel = {
  id: number;
  name: string;
  link: string;
  partner: number;
  subs_count: number;
  likes_count: number;
  comments_count: number;
  views_count: number;
  quarter_likes_count: number;
  quarter_comments_count: number;
  quarter_views_count: number;
};

@Injectable({ providedIn: 'root' })
export class SsmApiService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getProjects() {
    return this.http.get<Project[]>(`${this.base}/ssm/get_projects`);
  }

  getProjectInfo(projectId: number) {
    return this.http
      .get<EpisodeInfo[] | ProjectInfoApiResponse>(`${this.base}/ssm/info_byprojectid=${projectId}`)
      .pipe(map((resp) => this.normalizeProjectInfo(resp)));
  }

  // NEW: visits endpoint (Yandex + YouTube totals)
  getVisits() {
    return this.http.get<VisitsResponse>(`${this.base}/visits`);
  }

  getYoutubeChannels() {
    return this.http
      .get<YoutubeChannelApiItem[]>(`${this.base}/ssm/channels/youtube`)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeYoutubeChannel(item))));
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

  private normalizeProjectInfo(resp: EpisodeInfo[] | ProjectInfoApiResponse): EpisodeInfo[] {
    if (Array.isArray(resp)) {
      return resp;
    }

    const items = Array.isArray(resp?.items) ? resp.items : [];
    return items.map((item) => this.normalizeProjectInfoItem(item));
  }

  private normalizeProjectInfoItem(item: ProjectInfoApiItem): EpisodeInfo {
    return {
      ...item,
      id: this.pickNumber(item.ID, item.id),
      project_id: this.pickNumber(item.ProjectID, item.project_id),
      project_name: this.pickString(item.ProjectName, item.project_name),
      episode_name: this.pickString(item.EpisodesName, item.episode_name),
      season: this.pickNumber(item.Season, item.season),
      youtube_id: this.pickString(item.YouTubeID, item.youtube_id),
      youtube_channel: this.pickString(item.youtube_channel),
      youtube_views: this.pickNumber(item.YouTubeViews, item.youtube_views),
      youtube_comments: this.pickNumber(item.YouTubeCommentsCount, item.youtube_comments),
      youtube_likes: this.pickNumber(item.YouTubeLikesCount, item.youtube_likes),
      retention: this.pickString(item.AudienceRetention, item.retention),
      avg_view_by_user: this.pickString(item.AverageViewsByUser, item.avg_view_by_user),
      release_date: this.pickString(item.ReleaseDate, item.release_date),
      youtube_release_date: this.pickString(item.YouTubeReleaseDate, item.youtube_release_date),
    };
  }

  private pickNumber(...values: any[]): number | undefined {
    for (const value of values) {
      if (value == null || value === '') continue;
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
    }

    return undefined;
  }

  private pickString(...values: any[]): string | undefined {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value;
      if (typeof value === 'number') return String(value);
    }

    return undefined;
  }

  private normalizeYoutubeChannel(item: YoutubeChannelApiItem): YoutubeChannel {
    return {
      id: Number(item.id) || 0,
      name: this.pickString(item.name) ?? 'Unnamed channel',
      link: this.pickString(item.link) ?? '',
      partner: this.pickNumber(item.partner) ?? 0,
      subs_count: this.pickNumber(item.subs_count) ?? 0,
      likes_count: this.pickNumber(item.likes_count) ?? 0,
      comments_count: this.pickNumber(item.comments_count) ?? 0,
      views_count: this.pickNumber(item.views_count) ?? 0,
      quarter_likes_count: this.pickNumber(item.quarter_likes_count) ?? 0,
      quarter_comments_count: this.pickNumber(item.quarter_comments_count) ?? 0,
      quarter_views_count: this.pickNumber(item.quarter_views_count) ?? 0,
    };
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
