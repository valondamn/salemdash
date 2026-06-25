import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, shareReplay, throwError, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  InstagramAccountApiItem,
  TikTokAccountTotalsApiItem,
  TikTokPeriodMetricApiItem,
  TikTokTotalApiResponse,
  VisitsResponse,
  YandexProjectAnalyticsApiResponse,
  YandexProjectsGroupItemApi,
  YandexTotalApiResponse,
  YoutubeChannelApiItem,
  YoutubeReleasePeriodApiResponse,
} from './ssm-models';
import {
  normalizeInstagramAccount,
  normalizeInstagramPeriodDaily,
  normalizeInstagramProjectStats,
  normalizeTikTokAccountTotals,
  normalizeTikTokPeriodMetrics,
  normalizeTikTokProjectStats,
  normalizeTikTokTotal,
  normalizeVisits,
  normalizeYandexProjectAnalytics,
  normalizeYandexDailyStats,
  normalizeYandexProjectsGroup,
  normalizeYandexTotal,
  normalizeYoutubeChannel,
  normalizeYoutubeReleasePeriod,
} from './ssm-normalizers';

@Injectable({ providedIn: 'root' })
export class AnalyticsApiService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly requestTimeoutMs = 15000;
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
      this.visits$ = this.http.get<VisitsResponse>(`${this.baseUrl}/visits`).pipe(
        timeout({ first: this.requestTimeoutMs }),
        catchError((error) => {
          this.visits$ = undefined;
          this.normalizedVisits$ = undefined;
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }

    return this.visits$;
  }

  getNormalizedVisits(force = false) {
    if (!this.normalizedVisits$ || force) {
      this.normalizedVisits$ = this.getVisits(force).pipe(
        map((response) => normalizeVisits(response)),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }

    return this.normalizedVisits$;
  }

  getYoutubeChannels(force = false) {
    if (!this.youtubeChannels$ || force) {
      this.youtubeChannels$ = this.http
        .get<YoutubeChannelApiItem[]>(`${this.baseUrl}/ssm/channels/youtube`)
        .pipe(
          timeout({ first: this.requestTimeoutMs }),
          map((items) => this.buildYoutubeChannels(items)),
          catchError((error) => {
            this.youtubeChannels$ = undefined;
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.youtubeChannels$;
  }

  getYoutubeReleaseMetrics(dateFrom?: string, dateTo?: string) {
    return this.http
      .get<YoutubeReleasePeriodApiResponse>(`${this.baseUrl}/ssm/releases_for_1_DAY`, {
        params: this.buildPeriodParams(dateFrom, dateTo),
      })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        map((response) => normalizeYoutubeReleasePeriod(response))
      );
  }

  getYoutubeProjectReleaseMetrics(projectId: number, dateFrom?: string, dateTo?: string) {
    return this.http
      .get<YoutubeReleasePeriodApiResponse>(`${this.baseUrl}/ssm/releases_for_project_${projectId}_1_DAY`, {
        params: this.buildPeriodParams(dateFrom, dateTo),
      })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        map((response) => normalizeYoutubeReleasePeriod(response))
      );
  }

  getInstagramAccounts(force = false) {
    if (!this.instagramAccounts$ || force) {
      this.instagramAccounts$ = this.http
        .get<InstagramAccountApiItem[]>(`${this.baseUrl}/ssm/salem_dune/instagram`)
        .pipe(
          timeout({ first: this.requestTimeoutMs }),
          map((items) => this.buildInstagramAccounts(items)),
          catchError((error) => {
            this.instagramAccounts$ = undefined;
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.instagramAccounts$;
  }

  getInstagramPeriodDaily(dateFrom: string, dateTo: string) {
    return this.http
      .get<InstagramAccountApiItem[]>(`${this.baseUrl}/ssm/salem_dune/instagram/period_daily`, {
        params: this.buildPeriodParams(dateFrom, dateTo),
      })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        map((items) => normalizeInstagramPeriodDaily(items))
      );
  }

  getYandexProjects(force = false) {
    if (!this.yandexProjects$ || force) {
      this.yandexProjects$ = this.http
        .get<YandexProjectsGroupItemApi[]>(`${this.baseUrl}/ssm/yandex_projects`)
        .pipe(
          timeout({ first: this.requestTimeoutMs }),
          map((items) => normalizeYandexProjectsGroup(items)),
          catchError((error) => {
            this.yandexProjects$ = undefined;
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.yandexProjects$;
  }

  getYandexTotal(force = false) {
    if (!this.yandexTotal$ || force) {
      this.yandexTotal$ = this.http
        .get<YandexTotalApiResponse>(`${this.baseUrl}/ssm/yandex_total`)
        .pipe(
          timeout({ first: this.requestTimeoutMs }),
          map((response) => normalizeYandexTotal(response)),
          catchError((error) => {
            this.yandexTotal$ = undefined;
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: true })
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
          timeout({ first: this.requestTimeoutMs }),
          map((response) => normalizeYandexProjectAnalytics(response)),
          catchError((error) => {
            this.yandexByProjectCache.delete(projectId);
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );

      this.yandexByProjectCache.set(projectId, request$);
    }

    return this.yandexByProjectCache.get(projectId)!;
  }

  getYandexProjectDaily(projectId: number, dateFrom: string, dateTo: string) {
    return this.http
      .get<any>(`${this.baseUrl}/ssm/yandex_byprojectid_daily=${projectId}`, {
        params: this.buildPeriodParams(dateFrom, dateTo),
      })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        map((response) => normalizeYandexDailyStats(response, dateFrom, dateTo, projectId))
      );
  }

  getYandexProjectsDaily(dateFrom: string, dateTo: string) {
    return this.http
      .get<any>(`${this.baseUrl}/ssm/yandex_projects_daily`, {
        params: this.buildPeriodParams(dateFrom, dateTo),
      })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        map((response) => normalizeYandexDailyStats(response, dateFrom, dateTo))
      );
  }

  getTikTokTotal(force = false) {
    if (!this.tiktokTotal$ || force) {
      this.tiktokTotal$ = this.http
        .get<TikTokTotalApiResponse>(`${this.baseUrl}/ssm/tiktok_total`)
        .pipe(
          timeout({ first: this.requestTimeoutMs }),
          map((response) => normalizeTikTokTotal(response)),
          catchError((error) => {
            this.tiktokTotal$ = undefined;
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.tiktokTotal$;
  }

  getTikTokTotalsByAccount(force = false) {
    if (!this.tiktokTotalsByAccount$ || force) {
      this.tiktokTotalsByAccount$ = this.http
        .get<TikTokAccountTotalsApiItem[]>(`${this.baseUrl}/ssm/tiktok_totals_by_account`)
        .pipe(
          timeout({ first: this.requestTimeoutMs }),
          map((items) => normalizeTikTokAccountTotals(items)),
          catchError((error) => {
            this.tiktokTotalsByAccount$ = undefined;
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.tiktokTotalsByAccount$;
  }

  getTikTokStatsByPeriod(dateFrom: string, dateTo: string) {
    return this.http
      .get<TikTokPeriodMetricApiItem[]>(`${this.baseUrl}/ssm/tiktok_accounts/stats_by_period`, {
        params: this.buildPeriodParams(dateFrom, dateTo),
      })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        map((items) => normalizeTikTokPeriodMetrics(items))
      );
  }

  getInstagramProjectStats(projectId: number, dateFrom: string, dateTo: string) {
    return this.http
      .get<any>(`${this.baseUrl}/ssm/instagram_project_stats/project_id=${projectId}`, {
        params: this.buildPeriodParams(dateFrom, dateTo),
      })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        map((response) => normalizeInstagramProjectStats(response, dateFrom, dateTo, projectId))
      );
  }

  getInstagramProjectsStats(dateFrom: string, dateTo: string) {
    return this.http
      .get<any>(`${this.baseUrl}/ssm/instagram_projects_stats`, {
        params: this.buildPeriodParams(dateFrom, dateTo),
      })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        map((response) => normalizeInstagramProjectStats(response, dateFrom, dateTo))
      );
  }

  getTikTokProjectStats(projectId: number, dateFrom: string, dateTo: string) {
    return this.http
      .get<any>(`${this.baseUrl}/ssm/tiktok_project_stats/project_id=${projectId}`, {
        params: this.buildPeriodParams(dateFrom, dateTo),
      })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        map((response) => normalizeTikTokProjectStats(response, dateFrom, dateTo, projectId))
      );
  }

  getTikTokProjectsStats(dateFrom: string, dateTo: string) {
    return this.http
      .get<any>(`${this.baseUrl}/ssm/tiktok_projects_stats`, {
        params: this.buildPeriodParams(dateFrom, dateTo),
      })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        map((response) => normalizeTikTokProjectStats(response, dateFrom, dateTo))
      );
  }

  private buildPeriodParams(dateFrom?: string, dateTo?: string) {
    let params = new HttpParams();

    if (dateFrom) {
      params = params.set('date_from', dateFrom);
    }

    if (dateTo) {
      params = params.set('date_to', dateTo);
    }

    return params;
  }

  private buildYoutubeChannels(items: YoutubeChannelApiItem[] | null | undefined) {
    return (items ?? []).map((item) => normalizeYoutubeChannel(item));
  }

  private buildInstagramAccounts(items: InstagramAccountApiItem[] | null | undefined) {
    return (items ?? []).map((item) => normalizeInstagramAccount(item));
  }
}
