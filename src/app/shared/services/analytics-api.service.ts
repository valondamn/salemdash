import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  InstagramAccountApiItem,
  TikTokAccountTotalsApiItem,
  TikTokTotalApiResponse,
  VisitsResponse,
  YandexProjectAnalyticsApiResponse,
  YandexProjectsGroupItemApi,
  YandexTotalApiResponse,
  YoutubeChannelApiItem,
} from './ssm-models';
import {
  normalizeInstagramAccount,
  normalizeTikTokAccountTotals,
  normalizeTikTokTotal,
  normalizeVisits,
  normalizeYandexProjectAnalytics,
  normalizeYandexProjectsGroup,
  normalizeYandexTotal,
  normalizeYoutubeChannel,
} from './ssm-normalizers';

@Injectable({ providedIn: 'root' })
export class AnalyticsApiService {
  private readonly baseUrl = environment.apiBaseUrl;
  private visits$?: Observable<VisitsResponse>;
  private normalizedVisits$?: Observable<ReturnType<typeof normalizeVisits>>;
  private youtubeChannels$?: Observable<ReturnType<typeof this.buildYoutubeChannels>>;
  private instagramAccounts$?: Observable<ReturnType<typeof this.buildInstagramAccounts>>;
  private yandexProjects$?: Observable<ReturnType<typeof normalizeYandexProjectsGroup>>;
  private yandexTotal$?: Observable<ReturnType<typeof normalizeYandexTotal>>;
  private readonly yandexByProjectCache = new Map<number, Observable<ReturnType<typeof normalizeYandexProjectAnalytics>>>();
  private tiktokTotal$?: Observable<ReturnType<typeof normalizeTikTokTotal>>;
  private tiktokTotalsByAccount$?: Observable<ReturnType<typeof normalizeTikTokAccountTotals>>;

  constructor(private readonly http: HttpClient) {}

  getVisits(force = false) {
    if (!this.visits$ || force) {
      this.visits$ = this.http.get<VisitsResponse>(`${this.baseUrl}/visits`).pipe(shareReplay(1));
    }

    return this.visits$;
  }

  getNormalizedVisits(force = false) {
    if (!this.normalizedVisits$ || force) {
      this.normalizedVisits$ = this.getVisits(force).pipe(
        map((response) => normalizeVisits(response)),
        shareReplay(1)
      );
    }

    return this.normalizedVisits$;
  }

  getYoutubeChannels(force = false) {
    if (!this.youtubeChannels$ || force) {
      this.youtubeChannels$ = this.http
        .get<YoutubeChannelApiItem[]>(`${this.baseUrl}/ssm/channels/youtube`)
        .pipe(
          map((items) => this.buildYoutubeChannels(items)),
          shareReplay(1)
        );
    }

    return this.youtubeChannels$;
  }

  getInstagramAccounts(force = false) {
    if (!this.instagramAccounts$ || force) {
      this.instagramAccounts$ = this.http
        .get<InstagramAccountApiItem[]>(`${this.baseUrl}/ssm/salem_dune/instagram`)
        .pipe(
          map((items) => this.buildInstagramAccounts(items)),
          shareReplay(1)
        );
    }

    return this.instagramAccounts$;
  }

  getYandexProjects(force = false) {
    if (!this.yandexProjects$ || force) {
      this.yandexProjects$ = this.http
        .get<YandexProjectsGroupItemApi[]>(`${this.baseUrl}/ssm/yandex_projects`)
        .pipe(
          map((items) => normalizeYandexProjectsGroup(items)),
          shareReplay(1)
        );
    }

    return this.yandexProjects$;
  }

  getYandexTotal(force = false) {
    if (!this.yandexTotal$ || force) {
      this.yandexTotal$ = this.http
        .get<YandexTotalApiResponse>(`${this.baseUrl}/ssm/yandex_total`)
        .pipe(
          map((response) => normalizeYandexTotal(response)),
          shareReplay(1)
        );
    }

    return this.yandexTotal$;
  }

  getYandexByProjectId(projectId: number, force = false) {
    const cached = this.yandexByProjectCache.get(projectId);
    if (!cached || force) {
      const request$ = this.http
        .get<YandexProjectAnalyticsApiResponse>(`${this.baseUrl}/ssm/yandex_byprojectid=${projectId}`)
        .pipe(
          map((response) => normalizeYandexProjectAnalytics(response)),
          shareReplay(1)
        );

      this.yandexByProjectCache.set(projectId, request$);
    }

    return this.yandexByProjectCache.get(projectId)!;
  }

  getTikTokTotal(force = false) {
    if (!this.tiktokTotal$ || force) {
      this.tiktokTotal$ = this.http
        .get<TikTokTotalApiResponse>(`${this.baseUrl}/ssm/tiktok_total`)
        .pipe(
          map((response) => normalizeTikTokTotal(response)),
          shareReplay(1)
        );
    }

    return this.tiktokTotal$;
  }

  getTikTokTotalsByAccount(force = false) {
    if (!this.tiktokTotalsByAccount$ || force) {
      this.tiktokTotalsByAccount$ = this.http
        .get<TikTokAccountTotalsApiItem[]>(`${this.baseUrl}/ssm/tiktok_totals_by_account`)
        .pipe(
          map((items) => normalizeTikTokAccountTotals(items)),
          shareReplay(1)
        );
    }

    return this.tiktokTotalsByAccount$;
  }

  private buildYoutubeChannels(items: YoutubeChannelApiItem[] | null | undefined) {
    return (items ?? []).map((item) => normalizeYoutubeChannel(item));
  }

  private buildInstagramAccounts(items: InstagramAccountApiItem[] | null | undefined) {
    return (items ?? []).map((item) => normalizeInstagramAccount(item));
  }
}
