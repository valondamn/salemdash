import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  InstagramAccountApiItem,
  VisitsResponse,
  YoutubeChannelApiItem,
} from './ssm-models';
import {
  normalizeInstagramAccount,
  normalizeVisits,
  normalizeYoutubeChannel,
} from './ssm-normalizers';

@Injectable({ providedIn: 'root' })
export class AnalyticsApiService {
  private readonly baseUrl = environment.apiBaseUrl;
  private visits$?: Observable<VisitsResponse>;
  private normalizedVisits$?: Observable<ReturnType<typeof normalizeVisits>>;
  private youtubeChannels$?: Observable<ReturnType<typeof this.buildYoutubeChannels>>;
  private instagramAccounts$?: Observable<ReturnType<typeof this.buildInstagramAccounts>>;

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

  private buildYoutubeChannels(items: YoutubeChannelApiItem[] | null | undefined) {
    return (items ?? []).map((item) => normalizeYoutubeChannel(item));
  }

  private buildInstagramAccounts(items: InstagramAccountApiItem[] | null | undefined) {
    return (items ?? []).map((item) => normalizeInstagramAccount(item));
  }
}
