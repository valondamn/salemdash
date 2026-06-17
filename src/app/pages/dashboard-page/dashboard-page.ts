import { ChangeDetectionStrategy, Component, OnInit, signal, computed } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CountUpDirective } from '../../shared/directives/count-up.directive';
import { forkJoin } from 'rxjs';
import {
  TikTokAccountTotals,
  TikTokTotal,
  Project,
  EpisodeInfo,
  YoutubeChannel,
  YandexProjectsGroupItem,
  YandexTotal,
  InstagramAccount,
  TikTokPeriodMetric,
  YoutubeReleaseMetric,
} from '../../shared/services/ssm-models';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { AnalyticsApiService } from '../../shared/services/analytics-api.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, CountUpDirective],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent implements OnInit {
  projects = signal<Project[]>([]);
  selectedProjectId: string = '';

  loadingProjects = signal(false);
  loadingInfo = signal(false);
  error = signal<string | null>(null);
  periodError = signal<string | null>(null);

  dateFrom = '';
  dateTo = '';
  appliedDateFrom = '';
  appliedDateTo = '';

  episodes = signal<EpisodeInfo[]>([]);
  totalViews = 0;
  totalLikes = 0;
  totalComments = 0;

  loadingChannels = signal(false);
  channelsError = signal<string | null>(null);
  channels = signal<YoutubeChannel[]>([]);
  topChannels = signal<YoutubeChannel[]>([]);
  totalChannelSubscribers = 0;
  totalChannelViews = 0;
  totalChannelLikes = 0;
  totalChannelComments = 0;

  loadingInstagram = signal(false);
  instagramError = signal<string | null>(null);
  instagramAccounts = signal<InstagramAccount[]>([]);
  topInstagramAccounts = signal<InstagramAccount[]>([]);
  totalInstagramFollowers = 0;
  totalInstagramPosts = 0;
  totalInstagramViews = 0;
  totalInstagramLikes = 0;
  totalInstagramComments = 0;
  totalInstagramSaves = 0;

  loadingYandex = signal(false);
  yandexError = signal<string | null>(null);
  yandexProjects = signal<YandexProjectsGroupItem[]>([]);
  yandexTotal: YandexTotal = { total_count: 0, total_kz_count: 0, url_count: 0 };

  activePlatform = signal<'youtube' | 'instagram' | 'yandex' | 'tiktok'>('youtube');

  loadingTikTok = signal(false);
  tiktokError = signal<string | null>(null);
  tiktokAccounts = signal<TikTokAccountTotals[]>([]);
  tiktokTotal: TikTokTotal = {
    accounts_count: 0,
    total_comments: 0,
    total_followers: 0,
    total_likes: 0,
    total_profile_likes: 0,
    total_shares: 0,
    total_videos: 0,
    total_views: 0,
  };

  constructor(
    private projectsApi: ProjectsApiService,
    private analyticsApi: AnalyticsApiService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadYoutubeChannels();
    this.loadInstagramAccounts();
    this.loadYandexTotals();
    this.loadTikTokTotals();
  }

  setPlatform(p: 'youtube' | 'instagram' | 'yandex' | 'tiktok') {
    this.activePlatform.set(p);
  }

  get activeError(): string | null {
    if (this.periodError()) return this.periodError();

    switch (this.activePlatform()) {
      case 'youtube': return this.error() || this.channelsError();
      case 'instagram': return this.instagramError();
      case 'yandex': return this.yandexError();
      case 'tiktok': return this.tiktokError();
    }
  }

  get activeLoading(): boolean {
    switch (this.activePlatform()) {
      case 'youtube': return this.loadingProjects() || this.loadingInfo() || this.loadingChannels();
      case 'instagram': return this.loadingInstagram();
      case 'yandex': return this.loadingYandex();
      case 'tiktok': return this.loadingTikTok();
    }
  }

  get selectedProjectLabel() {
    const projectId = Number(this.selectedProjectId);
    const project = this.projects().find((item) => Number(item.id) === projectId);
    return project?.name || project?.utm_name || 'проект не выбран';
  }

  get hasEpisodes() {
    return this.episodes().length > 0;
  }

  get periodActive() {
    return Boolean(this.appliedDateFrom && this.appliedDateTo);
  }

  get periodLabel() {
    return this.periodActive ? `${this.appliedDateFrom} - ${this.appliedDateTo}` : 'за всё время';
  }

  get projectPanelTitle() {
    return this.periodActive ? 'Динамика проекта' : 'Эпизоды';
  }

  get projectCountHint() {
    return this.periodActive ? 'дней в периоде' : 'в проекте';
  }

  get youtubeTotalsHint() {
    return this.periodActive ? 'за период' : 'по всем';
  }

  get instagramTotalsHint() {
    return this.periodActive ? 'за период' : 'суммарно';
  }

  get tiktokTotalsHint() {
    return this.periodActive ? 'прирост за период' : 'суммарно';
  }

  get youtubeSubscribersLabel() {
    return this.periodActive ? 'Подписчики +/-' : 'Подписчики';
  }

  get youtubeLastColumnLabel() {
    return this.periodActive ? 'Новые подписчики' : 'За квартал';
  }

  loadProjects(force = false) {
    this.loadingProjects.set(true);
    this.error.set(null);

    this.projectsApi.getProjects(force).subscribe({
      next: (list) => {
        this.projects.set(list ?? []);

        const projects = this.projects();
        if (projects.length && !this.selectedProjectId) {
          this.selectedProjectId = String(projects[0].id);
        }

        this.loadingProjects.set(false);

        this.loadProjectInfo(force);
      },
      error: (e: any) => {
        this.error.set(e?.message ?? 'Не удалось загрузить проекты');
        this.loadingProjects.set(false);
      },
    });
  }

  onProjectChange() {
    this.loadProjectInfo();
  }

  refreshProjectInfo() {
    this.loadProjectInfo(true);
  }

  applyPeriod() {
    this.periodError.set(null);

    if (!this.dateFrom || !this.dateTo) {
      this.periodError.set('Выберите две даты: начало и конец периода.');
      return;
    }

    if (this.dateFrom > this.dateTo) {
      this.periodError.set('Дата начала не может быть позже даты окончания.');
      return;
    }

    this.appliedDateFrom = this.dateFrom;
    this.appliedDateTo = this.dateTo;
    this.reloadPeriodAwareData(true);
  }

  resetPeriod() {
    const wasActive = this.periodActive;
    this.dateFrom = '';
    this.dateTo = '';
    this.appliedDateFrom = '';
    this.appliedDateTo = '';
    this.periodError.set(null);

    if (wasActive) {
      this.reloadPeriodAwareData(true);
    }
  }

  loadProjectInfo(force = false) {
    let id = Number(this.selectedProjectId);

    const projects = this.projects();
    if (!id && projects.length) {
      id = Number(projects[0].id);
      this.selectedProjectId = String(id);
    }

    if (!id) return;

    this.loadingInfo.set(true);
    this.error.set(null);

    if (this.periodActive) {
      this.analyticsApi.getYoutubeProjectReleaseMetrics(id, this.appliedDateFrom, this.appliedDateTo).subscribe({
        next: (response) => {
          this.setProjectRows(this.projectPeriodRowsToEpisodes(response.items));
          this.loadingInfo.set(false);
        },
        error: (e: any) => {
          this.error.set(e?.message ?? 'Не удалось загрузить данные проекта за период');
          this.loadingInfo.set(false);
        },
      });
      return;
    }

    this.projectsApi.getProjectInfo(id, force).subscribe({
      next: (rows) => {
        this.setProjectRows(rows ?? []);
        this.loadingInfo.set(false);
      },
      error: (e: any) => {
        this.error.set(e?.message ?? 'Не удалось загрузить данные проекта');
        this.loadingInfo.set(false);
      },
    });
  }

  fmt(n: number) {
    return Intl.NumberFormat('ru-RU').format(n);
  }

  channelUrl(link: string) {
    return link ? `https://www.youtube.com/channel/${link}` : '#';
  }

  instagramUrl(username: string) {
    return username ? `https://www.instagram.com/${username}/` : '#';
  }

  tiktokUrl(url: string) {
    return url || '#';
  }

  avgPerUrl(total: number, count: number) {
    if (!count) return 0;
    return Math.round(total / count);
  }

  toNum(v: any): number {
    return Number(v) || 0;
  }

  private loadYoutubeChannels(force = false) {
    this.loadingChannels.set(true);
    this.channelsError.set(null);

    if (this.periodActive) {
      this.analyticsApi.getYoutubeReleaseMetrics(this.appliedDateFrom, this.appliedDateTo).subscribe({
        next: (response) => {
          this.setYoutubeChannels(this.aggregateYoutubeChannels(response.items), true);
          this.loadingChannels.set(false);
        },
        error: (e: any) => {
          this.channelsError.set(e?.message ?? 'Не удалось загрузить YouTube за период');
          this.loadingChannels.set(false);
        },
      });
      return;
    }

    this.analyticsApi.getYoutubeChannels(force).subscribe({
      next: (items) => {
        this.setYoutubeChannels(items ?? [], false);
        this.loadingChannels.set(false);
      },
      error: (e: any) => {
        this.channelsError.set(e?.message ?? 'Не удалось загрузить данные по каналам');
        this.loadingChannels.set(false);
      },
    });
  }

  private loadInstagramAccounts(force = false) {
    this.loadingInstagram.set(true);
    this.instagramError.set(null);

    if (this.periodActive) {
      this.analyticsApi.getInstagramPeriodDaily(this.appliedDateFrom, this.appliedDateTo).subscribe({
        next: (items) => {
          this.setInstagramAccounts(this.aggregateInstagramAccounts(items ?? []), true);
          this.loadingInstagram.set(false);
        },
        error: (e: any) => {
          this.instagramError.set(e?.message ?? 'Не удалось загрузить Instagram за период');
          this.loadingInstagram.set(false);
        },
      });
      return;
    }

    this.analyticsApi.getInstagramAccounts(force).subscribe({
      next: (items) => {
        this.setInstagramAccounts(items ?? [], false);
        this.loadingInstagram.set(false);
      },
      error: (e: any) => {
        this.instagramError.set(e?.message ?? 'Не удалось загрузить данные по Instagram');
        this.loadingInstagram.set(false);
      },
    });
  }

  private loadYandexTotals(force = false) {
    this.loadingYandex.set(true);
    this.yandexError.set(null);

    forkJoin({
      total: this.analyticsApi.getYandexTotal(force),
      projects: this.analyticsApi.getYandexProjects(force),
    }).subscribe({
      next: ({ total, projects }) => {
        this.yandexTotal = total;
        this.yandexProjects.set([...(projects ?? [])]
          .sort((a, b) => b.total_count - a.total_count)
          .slice(0, 10));
        this.loadingYandex.set(false);
      },
      error: (e: any) => {
        this.yandexError.set(e?.message ?? 'Не удалось загрузить данные Yandex');
        this.loadingYandex.set(false);
      },
    });
  }

  private loadTikTokTotals(force = false) {
    this.loadingTikTok.set(true);
    this.tiktokError.set(null);

    if (this.periodActive) {
      this.analyticsApi.getTikTokStatsByPeriod(this.appliedDateFrom, this.appliedDateTo).subscribe({
        next: (items) => {
          this.setTikTokPeriodAccounts(items ?? []);
          this.loadingTikTok.set(false);
        },
        error: (e: any) => {
          this.tiktokError.set(e?.message ?? 'Не удалось загрузить TikTok за период');
          this.loadingTikTok.set(false);
        },
      });
      return;
    }

    forkJoin({
      total: this.analyticsApi.getTikTokTotal(force),
      accounts: this.analyticsApi.getTikTokTotalsByAccount(force),
    }).subscribe({
      next: ({ total, accounts }) => {
        this.tiktokTotal = total;
        const items = [...(accounts ?? [])].sort((a, b) => b.total_views - a.total_views);
        this.tiktokAccounts.set(items ?? []);
        this.loadingTikTok.set(false);
      },
      error: (e: any) => {
        this.tiktokError.set(e?.message ?? 'Не удалось загрузить данные TikTok');
        this.loadingTikTok.set(false);
      },
    });
  }

  private reloadPeriodAwareData(force = false) {
    this.loadProjectInfo(force);
    this.loadYoutubeChannels(force);
    this.loadInstagramAccounts(force);
    this.loadTikTokTotals(force);
  }

  private setProjectRows(rows: EpisodeInfo[]) {
    this.episodes.set(rows);
    const episodes = this.episodes();

    this.totalViews = episodes.reduce((s, x) => s + (Number(x.youtube_views) || 0), 0);
    this.totalLikes = episodes.reduce((s, x) => s + (Number(x.youtube_likes) || 0), 0);
    this.totalComments = episodes.reduce((s, x) => s + (Number(x.youtube_comments) || 0), 0);
  }

  private projectPeriodRowsToEpisodes(rows: YoutubeReleaseMetric[]): EpisodeInfo[] {
    return rows.map((row, index) => ({
      id: index + 1,
      project_name: row.project_name,
      episode_name: row.metric_date || row.project_name || 'День',
      youtube_views: row.views,
      youtube_likes: row.likes,
      youtube_comments: row.comments,
      release_date: row.metric_date,
      youtube_release_date: row.metric_date,
    }));
  }

  private setYoutubeChannels(items: YoutubeChannel[], periodMode: boolean) {
    this.channels.set(items);
    const channels = this.channels();
    this.totalChannelSubscribers = channels.reduce((sum, channel) => sum + channel.subs_count, 0);
    this.totalChannelViews = channels.reduce((sum, channel) => sum + channel.views_count, 0);
    this.totalChannelLikes = channels.reduce((sum, channel) => sum + channel.likes_count, 0);
    this.totalChannelComments = channels.reduce((sum, channel) => sum + channel.comments_count, 0);
    this.topChannels.set([...channels]
      .sort((a, b) => b.views_count - a.views_count)
      .slice(0, periodMode ? 12 : 8));
  }

  private aggregateYoutubeChannels(rows: YoutubeReleaseMetric[]): YoutubeChannel[] {
    const groups = new Map<string, YoutubeChannel>();

    rows.forEach((row) => {
      const key = row.channel_name || 'YouTube';
      const current = groups.get(key) ?? {
        id: groups.size + 1,
        name: key,
        link: '',
        partner: 0,
        subs_count: 0,
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
        quarter_likes_count: 0,
        quarter_comments_count: 0,
        quarter_views_count: 0,
      };

      current.subs_count += row.subscribers_net;
      current.likes_count += row.likes;
      current.comments_count += row.comments;
      current.views_count += row.views;
      current.quarter_likes_count += row.subscribers_lost;
      current.quarter_comments_count += row.subscribers_net;
      current.quarter_views_count += row.subscribers_gained;
      groups.set(key, current);
    });

    return Array.from(groups.values());
  }

  private setInstagramAccounts(items: InstagramAccount[], periodMode: boolean) {
    this.instagramAccounts.set(items);
    const instagramAccounts = this.instagramAccounts();
    this.totalInstagramFollowers = instagramAccounts.reduce((sum, account) => sum + account.followers, 0);
    this.totalInstagramPosts = instagramAccounts.reduce((sum, account) => sum + account.posts, 0);
    this.totalInstagramViews = instagramAccounts.reduce((sum, account) => sum + account.views_total, 0);
    this.totalInstagramLikes = instagramAccounts.reduce((sum, account) => sum + account.likes_total, 0);
    this.totalInstagramComments = instagramAccounts.reduce((sum, account) => sum + account.comments_total, 0);
    this.totalInstagramSaves = instagramAccounts.reduce((sum, account) => sum + account.saved_total, 0);
    this.topInstagramAccounts.set([...instagramAccounts]
      .sort((a, b) => periodMode ? b.views_total - a.views_total : b.followers - a.followers)
      .slice(0, 8));
  }

  private aggregateInstagramAccounts(rows: InstagramAccount[]): InstagramAccount[] {
    const groups = new Map<string, InstagramAccount>();

    rows.forEach((row) => {
      const key = row.id || row.username || row.page_name;
      const current = groups.get(key) ?? {
        ...row,
        likes_day: 0,
        likes_total: 0,
        comments_day: 0,
        comments_total: 0,
        saved_day: 0,
        saved_total: 0,
        views_day: 0,
        views_total: 0,
      };

      current.likes_day += row.likes_day;
      current.likes_total += row.likes_day;
      current.comments_day += row.comments_day;
      current.comments_total += row.comments_day;
      current.saved_day += row.saved_day;
      current.saved_total += row.saved_day;
      current.views_day += row.views_day;
      current.views_total += row.views_day;

      if (!current.metric_date || row.metric_date >= current.metric_date) {
        current.metric_date = row.metric_date;
        current.followers = row.followers;
        current.posts = row.posts;
      }

      groups.set(key, current);
    });

    return Array.from(groups.values());
  }

  private setTikTokPeriodAccounts(rows: TikTokPeriodMetric[]) {
    const accounts = this.aggregateTikTokAccounts(rows);
    this.tiktokAccounts.set(accounts.sort((a, b) => b.total_views - a.total_views));
    this.tiktokTotal = {
      accounts_count: accounts.length,
      total_comments: accounts.reduce((sum, item) => sum + item.total_comments, 0),
      total_followers: accounts.reduce((sum, item) => sum + item.followers, 0),
      total_likes: accounts.reduce((sum, item) => sum + item.total_likes, 0),
      total_profile_likes: accounts.reduce((sum, item) => sum + item.profile_likes, 0),
      total_shares: accounts.reduce((sum, item) => sum + item.total_shares, 0),
      total_videos: accounts.reduce((sum, item) => sum + item.total_videos, 0),
      total_views: accounts.reduce((sum, item) => sum + item.total_views, 0),
    };
  }

  private aggregateTikTokAccounts(rows: TikTokPeriodMetric[]): TikTokAccountTotals[] {
    const groups = new Map<number | string, TikTokAccountTotals>();

    rows.forEach((row) => {
      const key = row.account_id || row.channel_name;
      const current = groups.get(key) ?? {
        account_id: row.account_id,
        channel_name: row.channel_name,
        channel_url: row.channel_url,
        followers: row.followers,
        profile_likes: row.profile_likes,
        total_comments: 0,
        total_likes: 0,
        total_shares: 0,
        total_videos: row.total_videos,
        total_views: 0,
        updated_at: row.stat_date || row.collected_at,
      };

      current.total_comments += row.comments_growth;
      current.total_likes += row.likes_growth;
      current.total_shares += row.shares_growth;
      current.total_views += row.views_growth;

      if (!current.updated_at || row.stat_date >= current.updated_at) {
        current.updated_at = row.stat_date || row.collected_at;
        current.followers = row.followers;
        current.profile_likes = row.profile_likes;
        current.total_videos = row.total_videos;
      }

      groups.set(key, current);
    });

    return Array.from(groups.values());
  }
}
