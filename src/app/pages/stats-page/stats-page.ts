import { ChangeDetectorRef, Component, NgZone, OnInit, ViewEncapsulation } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Project, EpisodeInfo, InstagramAccount, YandexProjectAnalytics, TikTokTotal, TikTokAccountTotals, ProjectPlatformStats, ProjectMetricRow } from '../../shared/services/ssm-models';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { AnalyticsApiService } from '../../shared/services/analytics-api.service';
import {
  CompareMetricRow,
  MetricFormat,
  MetricTone,
  MetricWinner,
  Mode,
  Source,
} from './stats.models';
import { YoutubeSingleStatsComponent } from './youtube-single-stats/youtube-single-stats';
import { YoutubeCompareStatsComponent } from './youtube-compare-stats/youtube-compare-stats';

@Component({
  selector: 'app-stats-page',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    FormsModule,
    YoutubeSingleStatsComponent,
    YoutubeCompareStatsComponent,
  ],
  templateUrl: './stats-page.html',
  styleUrl: './stats-page.scss',
  encapsulation: ViewEncapsulation.None,
})
export class StatsPageComponent implements OnInit {
  private readonly projectLoadTimeoutMs = 15000;
  private readonly infoLoadTimeoutMs = 15000;
  private projectLoadTimer: number | null = null;
  private infoLoadTimer: number | null = null;

  activeSource: Source = 'youtube';
  mode: Mode = 'single';

  projects: Project[] = [];
  selectedProjectId = '';

  episodes: EpisodeInfo[] = [];

  projectAId = '';
  projectBId = '';
  episodesA: EpisodeInfo[] = [];
  episodesB: EpisodeInfo[] = [];

  projectStatsId = 'all';
  projectStatsAId = '';
  projectStatsBId = '';
  dateFrom = '';
  dateTo = '';
  appliedDateFrom = '';
  appliedDateTo = '';
  projectStats: ProjectPlatformStats | null = null;
  projectStatsA: ProjectPlatformStats | null = null;
  projectStatsB: ProjectPlatformStats | null = null;

  kpiA = { views: 0, likes: 0, comments: 0, avgViews: 0, engagement: 0, episodes: 0 };
  kpiB = { views: 0, likes: 0, comments: 0, avgViews: 0, engagement: 0, episodes: 0 };

  yandexProjectId = '';
  yandexProjectAId = '';
  yandexProjectBId = '';
  yandexSingle: YandexProjectAnalytics | null = null;
  yandexProjectA: YandexProjectAnalytics | null = null;
  yandexProjectB: YandexProjectAnalytics | null = null;

  instagramAccounts: InstagramAccount[] = [];
  selectedInstagramId = '';
  instagramAId = '';
  instagramBId = '';

  tiktokTotal: TikTokTotal | null = null;
  tiktokAccounts: TikTokAccountTotals[] = [];
  tiktokSingleId = '';
  tiktokCompareAId = '';
  tiktokCompareBId = '';
  loadingTiktok = false;

  loadingProjects = false;
  loadingInstagram = false;
  loadingInfo = false;
  error: string | null = null;

  constructor(
    private projectsApi: ProjectsApiService,
    private analyticsApi: AnalyticsApiService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setDefaultPeriod();
    this.loadProjects();
  }

  get hasYoutubeSingleData() {
    return this.episodes.length > 0;
  }

  get hasYoutubeCompareData() {
    return this.episodesA.length > 0 || this.episodesB.length > 0;
  }

  get hasYandexData() {
    return this.mode === 'single' ? !!this.projectStats : !!this.projectStatsA || !!this.projectStatsB;
  }

  get hasInstagramData() {
    return this.mode === 'single' ? !!this.projectStats : !!this.projectStatsA || !!this.projectStatsB;
  }

  get hasTikTokData() {
    return this.mode === 'single' ? !!this.projectStats : !!this.projectStatsA || !!this.projectStatsB;
  }

  get hasTikTokCompareData() {
    return !!this.projectStatsA || !!this.projectStatsB;
  }

  get isProjectPlatformSource() {
    return this.activeSource === 'yandex' || this.activeSource === 'instagram' || this.activeSource === 'tiktok';
  }

  get periodLabel() {
    return `${this.appliedDateFrom} - ${this.appliedDateTo}`;
  }

  get projectStatsRows() {
    return this.projectStats?.rows ?? [];
  }

  get projectStatsLabels() {
    return this.projectStats?.labels ?? { primary: 'Метрика 1', secondary: 'Метрика 2', tertiary: 'Метрика 3', quaternary: 'Метрика 4' };
  }

  get projectStatsCompareRows(): CompareMetricRow[] {
    const a = this.projectStatsA;
    const b = this.projectStatsB;
    const labels = a?.labels ?? b?.labels ?? this.projectStatsLabels;

    return [
      this.buildCompareMetric('primary', labels.primary, a?.totals.primary || 0, b?.totals.primary || 0, 'number'),
      this.buildCompareMetric('secondary', labels.secondary, a?.totals.secondary || 0, b?.totals.secondary || 0, 'number'),
      this.buildCompareMetric('tertiary', labels.tertiary, a?.totals.tertiary || 0, b?.totals.tertiary || 0, 'number'),
      this.buildCompareMetric('quaternary', labels.quaternary, a?.totals.quaternary || 0, b?.totals.quaternary || 0, 'number'),
    ];
  }

  get tiktokCompareAccountA(): TikTokAccountTotals | null {
    return this.tiktokAccounts.find(a => String(a.account_id) === String(this.tiktokCompareAId)) ?? null;
  }

  get tiktokCompareAccountB(): TikTokAccountTotals | null {
    return this.tiktokAccounts.find(a => String(a.account_id) === String(this.tiktokCompareBId)) ?? null;
  }

  get tiktokCompareRows(): CompareMetricRow[] {
    const a = this.tiktokCompareAccountA;
    const b = this.tiktokCompareAccountB;
    return [
      this.buildCompareMetric('followers', 'Подписчики', a?.followers || 0, b?.followers || 0, 'number'),
      this.buildCompareMetric('total_views', 'Просмотры', a?.total_views || 0, b?.total_views || 0, 'number'),
      this.buildCompareMetric('total_likes', 'Лайки', a?.total_likes || 0, b?.total_likes || 0, 'number'),
      this.buildCompareMetric('total_shares', 'Шеры', a?.total_shares || 0, b?.total_shares || 0, 'number'),
      this.buildCompareMetric('total_comments', 'Комментарии', a?.total_comments || 0, b?.total_comments || 0, 'number'),
      this.buildCompareMetric('total_videos', 'Видео', a?.total_videos || 0, b?.total_videos || 0, 'number'),
    ];
  }

  get isLoadingWithoutVisibleData() {
    if (!this.currentLoading) return false;

    if (this.activeSource === 'youtube') {
      return this.mode === 'single' ? !this.hasYoutubeSingleData : !this.hasYoutubeCompareData;
    }

    if (this.activeSource === 'yandex') {
      return !this.hasYandexData;
    }

    if (this.activeSource === 'tiktok') {
      return this.mode === 'compare' ? !this.hasTikTokCompareData : !this.hasTikTokData;
    }

    return !this.hasInstagramData;
  }

  get currentLoading() {
    if (this.isProjectPlatformSource) return this.loadingInfo;
    return this.loadingInfo;
  }

  setSource(source: Source) {
    this.activeSource = source;

    if (this.mode === 'compare') {
      if (source === 'youtube') {
        this.loadCompareYouTube();
      } else if (this.isProjectPlatformSource) {
        this.loadCompareProjectPlatformStats();
      }
      return;
    }

    if (source === 'youtube') {
      this.loadProjectInfo();
    } else if (this.isProjectPlatformSource) {
      this.loadProjectPlatformStats();
    }
  }

  setMode(mode: Mode) {
    this.mode = mode;

    if (mode === 'compare') {
      if (this.activeSource === 'youtube') {
        if (!this.projectAId && this.projects.length) this.projectAId = String(this.projects[0].id);
        if (!this.projectBId && this.projects.length > 1) this.projectBId = String(this.projects[1].id);
        if (!this.projectBId && this.projects.length) this.projectBId = String(this.projects[0].id);
        this.loadCompareYouTube();
      } else if (this.isProjectPlatformSource) {
        this.ensureProjectStatsCompareDefaults();
        this.loadCompareProjectPlatformStats();
      }
      return;
    }

    if (this.activeSource === 'youtube') {
      this.loadProjectInfo();
    } else if (this.isProjectPlatformSource) {
      this.loadProjectPlatformStats();
    }
  }

  onRefresh() {
    if (!this.projects.length && (this.activeSource === 'youtube' || this.activeSource === 'yandex')) {
      this.loadProjects(true);
      return;
    }

    if (this.activeSource === 'youtube') {
      if (this.mode === 'single') this.loadProjectInfo(true);
      else this.loadCompareYouTube(true);
      return;
    }

    if (this.isProjectPlatformSource) {
      if (this.mode === 'single') this.loadProjectPlatformStats(true);
      else this.loadCompareProjectPlatformStats(true);
      return;
    }
  }

  loadTikTok(force = false) {
    this.loadingTiktok = true;
    if (this.activeSource === 'tiktok') this.error = null;

    forkJoin([
      this.analyticsApi.getTikTokTotal(force),
      this.analyticsApi.getTikTokTotalsByAccount(force),
    ])
      .pipe(finalize(() => { this.loadingTiktok = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: ([total, accounts]) => {
          this.tiktokTotal = total;
          this.tiktokAccounts = [...(accounts ?? [])].sort((a, b) => b.followers - a.followers);
          if (!this.tiktokSingleId && this.tiktokAccounts.length) {
            this.tiktokSingleId = String(this.tiktokAccounts[0].account_id);
          }
          if (!this.tiktokCompareAId && this.tiktokAccounts.length) {
            this.tiktokCompareAId = String(this.tiktokAccounts[0].account_id);
          }
          if (!this.tiktokCompareBId && this.tiktokAccounts.length > 1) {
            this.tiktokCompareBId = String(this.tiktokAccounts[1].account_id);
          }
          this.cdr.detectChanges();
        },
        error: (e: any) => {
          if (this.activeSource === 'tiktok') {
            this.error = e?.message ?? 'Не удалось загрузить TikTok данные';
          }
        },
      });
  }

  loadProjects(force = false) {
    this.loadingProjects = true;
    this.error = null;
    this.startProjectLoadTimer();

    this.projectsApi.getProjects(force).pipe(finalize(() => this.finishProjectsLoading())).subscribe({
      next: (list) => {
        this.clearProjectLoadTimer();
        this.error = null;
        this.projects = list ?? [];

        if (this.projects.length && !this.selectedProjectId) {
          this.selectedProjectId = String(this.projects[0].id);
        }

        if (!this.projectStatsId) this.projectStatsId = 'all';
        if (this.projects.length && !this.projectStatsAId) this.projectStatsAId = String(this.projects[0].id);
        if (this.projects.length > 1 && !this.projectStatsBId) this.projectStatsBId = String(this.projects[1].id);
        if (!this.projectStatsBId && this.projects.length) this.projectStatsBId = String(this.projects[0].id);

        if (this.projects.length && !this.yandexProjectId) this.yandexProjectId = String(this.projects[0].id);
        if (this.projects.length && !this.yandexProjectAId) this.yandexProjectAId = String(this.projects[0].id);
        if (this.projects.length > 1 && !this.yandexProjectBId) this.yandexProjectBId = String(this.projects[1].id);
        if (!this.yandexProjectBId && this.projects.length) this.yandexProjectBId = String(this.projects[0].id);

        if (this.projects.length && !this.projectAId) this.projectAId = String(this.projects[0].id);
        if (this.projects.length > 1 && !this.projectBId) this.projectBId = String(this.projects[1].id);
        if (!this.projectBId && this.projects.length) this.projectBId = String(this.projects[0].id);

        if (this.activeSource === 'youtube') {
          this.loadProjectInfo(force);
        } else if (this.isProjectPlatformSource) {
          this.loadProjectPlatformStats(force);
        }
      },
      error: (e: any) => {
        this.clearProjectLoadTimer();
        this.error = e?.message ?? 'Не удалось загрузить проекты';
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
    });
  }

  onProjectChange() {
    this.loadProjectInfo();
  }

  loadProjectInfo(force = false) {
    let id = Number(this.selectedProjectId);
    if (!id && this.projects.length) {
      id = Number(this.projects[0].id);
      this.selectedProjectId = String(id);
    }
    if (!id) {
      this.loadingInfo = false;
      return;
    }

    this.loadingInfo = true;
    this.error = null;
    this.startInfoLoadTimer('Данные проекта загружаются дольше обычного. Попробуйте обновить ещё раз.');

    this.projectsApi.getProjectInfo(id, force).subscribe({
      next: (allEpisodes) => {
        this.clearInfoLoadTimer();
        this.episodes = this.filterByPeriod(allEpisodes);
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.clearInfoLoadTimer();
        this.error = e?.message ?? 'Не удалось загрузить данные проекта';
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
    });
  }

  onCompareProjectsChange() {
    this.loadCompareYouTube();
  }

  onProjectStatsChange() {
    this.loadProjectPlatformStats();
  }

  onCompareProjectStatsChange() {
    this.loadCompareProjectPlatformStats();
  }

  applyPeriod() {
    this.error = null;

    if (!this.dateFrom || !this.dateTo) {
      this.error = 'Выберите начало и конец периода.';
      return;
    }

    if (this.dateFrom > this.dateTo) {
      this.error = 'Дата начала не может быть позже даты окончания.';
      return;
    }

    this.appliedDateFrom = this.dateFrom;
    this.appliedDateTo = this.dateTo;

    if (this.activeSource === 'youtube') {
      if (this.mode === 'single') this.loadProjectInfo(true);
      else this.loadCompareYouTube(true);
      return;
    }

    if (!this.isProjectPlatformSource) return;

    if (this.mode === 'single') this.loadProjectPlatformStats(true);
    else this.loadCompareProjectPlatformStats(true);
  }

  loadCompareYouTube(force = false) {
    const aId = Number(this.projectAId);
    const bId = Number(this.projectBId);
    if (!aId || !bId) {
      this.loadingInfo = false;
      return;
    }

    this.loadingInfo = true;
    this.error = null;
    this.startInfoLoadTimer('Сравнение проектов загружается дольше обычного. Попробуйте обновить ещё раз.');

    forkJoin([
      this.projectsApi.getProjectInfo(aId, force),
      this.projectsApi.getProjectInfo(bId, force),
    ]).subscribe({
      next: ([allA, allB]) => {
        this.clearInfoLoadTimer();
        this.episodesA = this.filterByPeriod(allA);
        this.episodesB = this.filterByPeriod(allB);
        this.kpiA = this.computeKpi(this.episodesA);
        this.kpiB = this.computeKpi(this.episodesB);
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.clearInfoLoadTimer();
        this.error = e?.message ?? 'Не удалось загрузить сравнение проектов';
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadInstagramAccounts(force = false) {
    this.loadingInstagram = true;
    if (this.activeSource === 'instagram') {
      this.error = null;
    }

    this.analyticsApi.getInstagramAccounts(force).pipe(finalize(() => (this.loadingInstagram = false))).subscribe({
      next: (items) => {
        this.instagramAccounts = [...(items ?? [])].sort((a, b) => b.followers - a.followers);
        this.ensureInstagramDefaults();
      },
      error: (e: any) => {
        if (this.activeSource === 'instagram') {
          this.error = e?.message ?? 'Не удалось загрузить данные Instagram';
        }
      },
    });
  }

  loadProjectPlatformStats(force = false) {
    const projectId = this.projectStatsId === 'all' ? null : Number(this.projectStatsId);
    if (projectId !== null && !projectId) {
      this.loadingInfo = false;
      return;
    }

    this.loadingInfo = true;
    this.error = null;
    this.startInfoLoadTimer('Проектная статистика загружается дольше обычного. Попробуйте обновить ещё раз.');

    this.getProjectPlatformRequest(projectId)
      .pipe(finalize(() => { this.loadingInfo = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (stats) => {
          this.clearInfoLoadTimer();
          this.projectStats = stats;
          this.projectStatsA = null;
          this.projectStatsB = null;
          this.cdr.detectChanges();
        },
        error: (e: any) => {
          this.clearInfoLoadTimer();
          this.error = e?.message ?? 'Не удалось загрузить проектную статистику';
        },
      });
  }

  loadCompareProjectPlatformStats(force = false) {
    const aId = Number(this.projectStatsAId);
    const bId = Number(this.projectStatsBId);

    if (!aId || !bId) {
      this.loadingInfo = false;
      return;
    }

    this.loadingInfo = true;
    this.error = null;
    this.startInfoLoadTimer('Сравнение проектной статистики загружается дольше обычного. Попробуйте обновить ещё раз.');

    forkJoin([
      this.getProjectPlatformRequest(aId),
      this.getProjectPlatformRequest(bId),
    ])
      .pipe(finalize(() => { this.loadingInfo = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: ([a, b]) => {
          this.clearInfoLoadTimer();
          this.projectStats = null;
          this.projectStatsA = a;
          this.projectStatsB = b;
          this.cdr.detectChanges();
        },
        error: (e: any) => {
          this.clearInfoLoadTimer();
          this.error = e?.message ?? 'Не удалось загрузить сравнение проектной статистики';
        },
      });
  }

  onYandexProjectChange() {
    this.loadYandexSingle();
  }

  onCompareYandexProjectsChange() {
    this.loadCompareYandex();
  }

  loadYandexSingle(force = false) {
    let id = Number(this.yandexProjectId);
    if (!id && this.projects.length) {
      id = Number(this.projects[0].id);
      this.yandexProjectId = String(id);
    }
    if (!id) {
      this.loadingInfo = false;
      return;
    }

    this.loadingInfo = true;
    this.error = null;
    this.startInfoLoadTimer('Yandex по projectId загружается дольше обычного. Попробуйте обновить ещё раз.');

    this.analyticsApi.getYandexByProjectId(id, force).subscribe({
      next: (data) => {
        this.clearInfoLoadTimer();
        this.yandexSingle = data;
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.clearInfoLoadTimer();
        this.error = e?.message ?? 'Не удалось загрузить Yandex по проекту';
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadCompareYandex(force = false) {
    const aId = Number(this.yandexProjectAId);
    const bId = Number(this.yandexProjectBId);
    if (!aId || !bId) {
      this.loadingInfo = false;
      return;
    }

    this.loadingInfo = true;
    this.error = null;
    this.startInfoLoadTimer('Сравнение Yandex загружается дольше обычного. Попробуйте обновить ещё раз.');

    forkJoin([
      this.analyticsApi.getYandexByProjectId(aId, force),
      this.analyticsApi.getYandexByProjectId(bId, force),
    ]).subscribe({
      next: ([a, b]) => {
        this.clearInfoLoadTimer();
        this.yandexProjectA = a;
        this.yandexProjectB = b;
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.clearInfoLoadTimer();
        this.error = e?.message ?? 'Не удалось загрузить сравнение Yandex';
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
    });
  }

  get selectedInstagramAccount(): InstagramAccount | null {
    return this.findInstagramAccount(this.selectedInstagramId);
  }

  get instagramAccountA(): InstagramAccount | null {
    return this.findInstagramAccount(this.instagramAId);
  }

  get instagramAccountB(): InstagramAccount | null {
    return this.findInstagramAccount(this.instagramBId);
  }

  get youtubeCompareRows(): CompareMetricRow[] {
    return [
      this.buildCompareMetric('views', 'Просмотры', this.kpiA.views, this.kpiB.views, 'number'),
      this.buildCompareMetric('likes', 'Лайки', this.kpiA.likes, this.kpiB.likes, 'number'),
      this.buildCompareMetric('comments', 'Комментарии', this.kpiA.comments, this.kpiB.comments, 'number'),
      this.buildCompareMetric('engagement', 'Вовлечённость', this.kpiA.engagement, this.kpiB.engagement, 'percent'),
      this.buildCompareMetric('avgViews', 'Средний просмотр / эпизод', this.kpiA.avgViews, this.kpiB.avgViews, 'number'),
      this.buildCompareMetric('episodes', 'Эпизоды', this.kpiA.episodes, this.kpiB.episodes, 'number'),
    ];
  }

  get yandexCompareRows(): CompareMetricRow[] {
    const a = this.yandexProjectA;
    const b = this.yandexProjectB;

    return [
      this.buildCompareMetric('totalCount', 'Total', a?.total_count || 0, b?.total_count || 0, 'number'),
      this.buildCompareMetric('totalKzCount', 'KZ Total', a?.total_kz_count || 0, b?.total_kz_count || 0, 'number'),
      this.buildCompareMetric('urlCount', 'URL', a?.url_count || 0, b?.url_count || 0, 'number'),
      this.buildCompareMetric(
        'avgPerUrl',
        'Total / URL',
        a?.url_count ? a.total_count / a.url_count : 0,
        b?.url_count ? b.total_count / b.url_count : 0,
        'decimal'
      ),
    ];
  }

  get instagramCompareRows(): CompareMetricRow[] {
    const a = this.instagramAccountA;
    const b = this.instagramAccountB;

    return [
      this.buildCompareMetric('followers', 'Подписчики', a?.followers || 0, b?.followers || 0, 'number'),
      this.buildCompareMetric('posts', 'Посты', a?.posts || 0, b?.posts || 0, 'number'),
      this.buildCompareMetric('viewsTotal', 'Просмотры', a?.views_total || 0, b?.views_total || 0, 'number'),
      this.buildCompareMetric('likesTotal', 'Лайки', a?.likes_total || 0, b?.likes_total || 0, 'number'),
      this.buildCompareMetric('commentsTotal', 'Комментарии', a?.comments_total || 0, b?.comments_total || 0, 'number'),
      this.buildCompareMetric('savedTotal', 'Сохранения', a?.saved_total || 0, b?.saved_total || 0, 'number'),
      this.buildCompareMetric('viewsDay', 'Просмотры за день', a?.views_day || 0, b?.views_day || 0, 'number'),
      this.buildCompareMetric('likesDay', 'Лайки за день', a?.likes_day || 0, b?.likes_day || 0, 'number'),
      this.buildCompareMetric('commentsDay', 'Комментарии за день', a?.comments_day || 0, b?.comments_day || 0, 'number'),
      this.buildCompareMetric('savedDay', 'Сохранения за день', a?.saved_day || 0, b?.saved_day || 0, 'number'),
    ];
  }

  get youtubeCompareLabels(): string[] {
    const labels = this.youtubeDateLabels(this.episodesA, this.episodesB);
    return labels.length ? labels : this.buildIndexedLabels(Math.max(this.episodesA.length, this.episodesB.length));
  }

  get youtubeViewSeriesA(): Array<number | null> {
    return this.youtubeSeriesForLabels(this.episodesA, (episode) => Number(episode.youtube_views) || 0);
  }

  get youtubeViewSeriesB(): Array<number | null> {
    return this.youtubeSeriesForLabels(this.episodesB, (episode) => Number(episode.youtube_views) || 0);
  }

  get youtubeEngagementSeriesA(): Array<number | null> {
    return this.youtubeEngagementSeriesForLabels(this.episodesA);
  }

  get youtubeEngagementSeriesB(): Array<number | null> {
    return this.youtubeEngagementSeriesForLabels(this.episodesB);
  }

  get yandexCompareLabels(): string[] {
    const a = this.sortYandexItems(this.yandexProjectA?.items ?? []);
    const b = this.sortYandexItems(this.yandexProjectB?.items ?? []);
    const length = Math.max(a.length, b.length, 1);
    return Array.from({ length }, (_, index) => `#${index + 1}`);
  }

  get yandexTotalSeriesA(): Array<number | null> {
    return this.sortYandexItems(this.yandexProjectA?.items ?? []).map((item) => item.count);
  }

  get yandexTotalSeriesB(): Array<number | null> {
    return this.sortYandexItems(this.yandexProjectB?.items ?? []).map((item) => item.count);
  }

  get yandexKzSeriesA(): Array<number | null> {
    return this.sortYandexItems(this.yandexProjectA?.items ?? []).map((item) => item.kz_count);
  }

  get yandexKzSeriesB(): Array<number | null> {
    return this.sortYandexItems(this.yandexProjectB?.items ?? []).map((item) => item.kz_count);
  }

  get instagramPerPostLabels(): string[] {
    return ['Просмотры / пост', 'Лайки / пост', 'Комментарии / пост', 'Сохранения / пост'];
  }

  get instagramPerPostSeriesA(): Array<number | null> {
    return this.instagramPerPostSeries(this.instagramAccountA);
  }

  get instagramPerPostSeriesB(): Array<number | null> {
    return this.instagramPerPostSeries(this.instagramAccountB);
  }

  getSourceDescription() {
    if (this.activeSource === 'youtube') return 'Эпизоды, охват и вовлечённость.';
    if (this.activeSource === 'yandex') return 'Проектная Яндекс Метрика за выбранный период.';
    if (this.activeSource === 'tiktok') return 'Проектная TikTok-статистика за выбранный период.';
    return 'Проектная Instagram-статистика за выбранный период.';
  }

  getSelectionHint() {
    if (this.activeSource === 'youtube') {
      return this.mode === 'compare' ? 'Сравнение двух проектов.' : 'Выбор по проекту.';
    }
    return this.mode === 'compare' ? 'Сравнение двух проектов за период.' : 'Выбор проекта и периода.';
  }

  getLoadingMessage() {
    if (this.loadingProjects) return 'Загружаем список проектов.';
    if (this.activeSource === 'youtube') {
      return this.mode === 'compare' ? 'Загружаем два проекта.' : 'Загружаем проект.';
    }
    if (this.activeSource === 'yandex') {
      return this.mode === 'compare' ? 'Обновляем два проекта по Яндексу.' : 'Обновляем Яндекс по проекту.';
    }
    if (this.activeSource === 'tiktok') return 'Обновляем TikTok по проекту.';
    return 'Обновляем Instagram по проекту.';
  }

  getEmptyStateTitle() {
    if (this.activeSource === 'youtube') {
      return this.mode === 'compare' ? 'Пока нет данных для сравнения YouTube' : 'По этому проекту нет YouTube-данных';
    }
    if (this.activeSource === 'yandex') return 'По проекту нет данных Яндекс Метрики';
    if (this.activeSource === 'tiktok') return 'По проекту нет TikTok-данных';
    return 'По проекту нет Instagram-данных';
  }

  getEmptyStateCopy() {
    if (this.activeSource === 'youtube') {
      return this.mode === 'compare'
        ? 'Выберите два проекта или обновите данные.'
        : 'Попробуйте другой проект.';
    }
    if (this.isProjectPlatformSource) return 'Проверьте проект и выбранный период.';
    return 'Данные появятся после ответа API.';
  }

  getSingleHeadline() {
    if (this.activeSource === 'youtube') {
      return `${this.getProjectNameById(this.selectedProjectId)} — обзор`;
    }

    return `${this.getProjectNameById(this.projectStatsId)} — обзор`;
  }

  getComparePrimaryLabel() {
    if (this.activeSource === 'youtube') {
      return this.getProjectNameById(this.projectAId);
    }

    if (this.activeSource === 'yandex') {
      return this.getProjectNameById(this.projectStatsAId);
    }

    return this.getProjectNameById(this.projectStatsAId);
  }

  getCompareSecondaryLabel() {
    if (this.activeSource === 'youtube') {
      return this.getProjectNameById(this.projectBId);
    }

    if (this.activeSource === 'yandex') {
      return this.getProjectNameById(this.projectStatsBId);
    }

    return this.getProjectNameById(this.projectStatsBId);
  }

  getCompareSummary(rows: CompareMetricRow[], labelA: string, labelB: string) {
    const winsA = this.countWins(rows, 'a');
    const winsB = this.countWins(rows, 'b');

    if (winsA === winsB) {
      return `${labelA} и ${labelB} идут почти на равных по ключевым метрикам.`;
    }

    if (winsA > winsB) {
      return `${labelA} лидирует в ${winsA} из ${rows.length} ключевых метрик.`;
    }

    return `${labelB} лидирует в ${winsB} из ${rows.length} ключевых метрик.`;
  }

  getTikTokComparePrimaryLabel() {
    return this.tiktokCompareAccountA?.channel_name || 'Аккаунт A';
  }

  getTikTokCompareSecondaryLabel() {
    return this.tiktokCompareAccountB?.channel_name || 'Аккаунт B';
  }

  fmt(value: number) {
    return Intl.NumberFormat('ru-RU').format(value || 0);
  }

  fmtCompact(value: number) {
    return Intl.NumberFormat('ru-RU', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value || 0);
  }

  metricDateLabel(row: ProjectMetricRow) {
    return row.metric_date || '—';
  }

  projectStatRowTitle(row: ProjectMetricRow) {
    if (this.activeSource === 'yandex') return row.label || row.url || 'Источник';
    return row.label || row.metric_date || 'Строка';
  }

  getProjectNameById(id: string) {
    if (id === 'all') return 'Все проекты';

    const projectId = Number(id);
    const project = this.projects.find((item) => Number(item.id) === projectId);
    return project?.name || project?.utm_name || `Проект ${id}`;
  }

  getInstagramLabelById(id: string) {
    const account = this.findInstagramAccount(id);
    return account?.page_name || (account?.username ? `@${account.username}` : 'Instagram аккаунт');
  }

  private countWins(rows: CompareMetricRow[], winner: MetricWinner) {
    return rows.filter((row) => row.winner === winner).length;
  }

  private setDefaultPeriod() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    this.dateFrom = `${yyyy}-${mm}-01`;
    this.dateTo = `${yyyy}-${mm}-${dd}`;
    this.appliedDateFrom = this.dateFrom;
    this.appliedDateTo = this.dateTo;
  }

  private ensureProjectStatsCompareDefaults() {
    if (!this.projectStatsAId && this.projects.length) {
      this.projectStatsAId = String(this.projects[0].id);
    }

    if (!this.projectStatsBId && this.projects.length > 1) {
      this.projectStatsBId = String(this.projects[1].id);
    }

    if (!this.projectStatsBId && this.projects.length) {
      this.projectStatsBId = String(this.projects[0].id);
    }
  }

  private getProjectPlatformRequest(projectId: number | null) {
    if (this.activeSource === 'yandex') {
      if (projectId === null) {
        return this.analyticsApi.getYandexProjectsDaily(this.appliedDateFrom, this.appliedDateTo);
      }

      return this.analyticsApi.getYandexProjectDaily(projectId, this.appliedDateFrom, this.appliedDateTo);
    }

    if (this.activeSource === 'instagram') {
      if (projectId === null) {
        return this.analyticsApi.getInstagramProjectsStats(this.appliedDateFrom, this.appliedDateTo);
      }

      return this.analyticsApi.getInstagramProjectStats(projectId, this.appliedDateFrom, this.appliedDateTo);
    }

    if (projectId === null) {
      return this.analyticsApi.getTikTokProjectsStats(this.appliedDateFrom, this.appliedDateTo);
    }

    return this.analyticsApi.getTikTokProjectStats(projectId, this.appliedDateFrom, this.appliedDateTo);
  }

  private startProjectLoadTimer() {
    this.clearProjectLoadTimer();
    this.projectLoadTimer = window.setTimeout(() => {
      if (!this.loadingProjects) return;

      this.zone.run(() => {
        this.loadingProjects = false;
        this.loadingInfo = false;
        this.error = 'Список проектов загружается дольше обычного. Попробуйте обновить данные ещё раз.';
        this.cdr.detectChanges();
      });
    }, this.projectLoadTimeoutMs);
  }

  private clearProjectLoadTimer() {
    if (!this.projectLoadTimer) return;

    window.clearTimeout(this.projectLoadTimer);
    this.projectLoadTimer = null;
  }

  private startInfoLoadTimer(message: string) {
    this.clearInfoLoadTimer();
    this.infoLoadTimer = window.setTimeout(() => {
      if (!this.loadingInfo) return;

      this.zone.run(() => {
        this.loadingInfo = false;
        this.error = message;
        this.cdr.detectChanges();
      });
    }, this.infoLoadTimeoutMs);
  }

  private clearInfoLoadTimer() {
    if (!this.infoLoadTimer) return;

    window.clearTimeout(this.infoLoadTimer);
    this.infoLoadTimer = null;
  }

  private finishProjectsLoading() {
    this.zone.run(() => {
      this.loadingProjects = false;
      this.cdr.detectChanges();
    });
  }

  private ensureInstagramDefaults() {
    if (!this.selectedInstagramId && this.instagramAccounts.length) {
      this.selectedInstagramId = this.instagramAccounts[0].id;
    }

    if (!this.instagramAId && this.instagramAccounts.length) {
      this.instagramAId = this.instagramAccounts[0].id;
    }

    if (!this.instagramBId && this.instagramAccounts.length > 1) {
      this.instagramBId = this.instagramAccounts[1].id;
    }

    if (!this.instagramBId && this.instagramAccounts.length) {
      this.instagramBId = this.instagramAccounts[0].id;
    }
  }

  private findInstagramAccount(id: string) {
    return this.instagramAccounts.find((account) => account.id === id) ?? null;
  }

  private filterByPeriod(episodes: EpisodeInfo[]): EpisodeInfo[] {
    const from = this.appliedDateFrom;
    const to = this.appliedDateTo;
    if (!from && !to) return episodes;

    const filtered = episodes.filter((ep) => {
      const date = (ep.youtube_release_date || ep.release_date || '').slice(0, 10);
      if (!date) return true;
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });

    // Если за период нет видео — показываем все (чтобы проект не был пустым)
    return filtered.length > 0 ? filtered : episodes;
  }

  private computeKpi(episodes: EpisodeInfo[]) {
    const views = episodes.reduce((sum, episode) => sum + (Number(episode.youtube_views) || 0), 0);
    const likes = episodes.reduce((sum, episode) => sum + (Number(episode.youtube_likes) || 0), 0);
    const comments = episodes.reduce((sum, episode) => sum + (Number(episode.youtube_comments) || 0), 0);
    const avgViews = episodes.length ? Math.round(views / episodes.length) : 0;
    const engagement = views ? ((likes + comments) / views) * 100 : 0;

    return { views, likes, comments, avgViews, engagement, episodes: episodes.length };
  }

  private buildCompareMetric(
    key: string,
    label: string,
    a: number,
    b: number,
    format: MetricFormat
  ): CompareMetricRow {
    const winner: MetricWinner = a === b ? 'tie' : a > b ? 'a' : 'b';
    const tone: MetricTone = winner === 'tie' ? 'neutral' : winner === 'a' ? 'positive' : 'negative';
    const delta = b === 0 ? (a === 0 ? 0 : null) : ((a - b) / b) * 100;

    return { key, label, a, b, format, delta, tone, winner };
  }

  private buildIndexedLabels(length: number) {
    return Array.from({ length }, (_, index) => `#${index + 1}`);
  }

  private sortYandexItems(items: YandexProjectAnalytics['items']) {
    return [...items]
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }

  private sortEpisodes(episodes: EpisodeInfo[]) {
    return [...episodes].sort((a, b) => this.pickEpisodeDate(a).localeCompare(this.pickEpisodeDate(b)));
  }

  private pickEpisodeDate(episode: EpisodeInfo) {
    return (episode.youtube_release_date || episode.release_date || '').slice(0, 10);
  }

  private youtubeDateLabels(...episodeGroups: EpisodeInfo[][]): string[] {
    const labels = new Set<string>();

    episodeGroups
      .flat()
      .forEach((episode) => {
        const date = this.pickEpisodeDate(episode);
        if (date) labels.add(date);
      });

    return [...labels].sort((a, b) => a.localeCompare(b));
  }

  private youtubeSeriesForLabels(
    episodes: EpisodeInfo[],
    selector: (episode: EpisodeInfo) => number
  ): Array<number | null> {
    return this.youtubeCompareLabels.map((label) => {
      const value = episodes
        .filter((episode) => this.pickEpisodeDate(episode) === label)
        .reduce((sum, episode) => sum + selector(episode), 0);

      return value || 0;
    });
  }

  private youtubeEngagementSeriesForLabels(episodes: EpisodeInfo[]): Array<number | null> {
    return this.youtubeCompareLabels.map((label) => {
      const rows = episodes.filter((episode) => this.pickEpisodeDate(episode) === label);
      const views = rows.reduce((sum, episode) => sum + (Number(episode.youtube_views) || 0), 0);
      const likes = rows.reduce((sum, episode) => sum + (Number(episode.youtube_likes) || 0), 0);
      const comments = rows.reduce((sum, episode) => sum + (Number(episode.youtube_comments) || 0), 0);

      return views ? ((likes + comments) / views) * 100 : 0;
    });
  }

  private episodeEngagement(episode: EpisodeInfo) {
    const views = Number(episode.youtube_views) || 0;
    const likes = Number(episode.youtube_likes) || 0;
    const comments = Number(episode.youtube_comments) || 0;
    return views ? ((likes + comments) / views) * 100 : 0;
  }

  private instagramPerPostSeries(account: InstagramAccount | null): Array<number | null> {
    if (!account) return [0, 0, 0, 0];

    const posts = account.posts || 0;
    const avg = (value: number) => (posts > 0 ? value / posts : 0);

    return [
      avg(account.views_total),
      avg(account.likes_total),
      avg(account.comments_total),
      avg(account.saved_total),
    ];
  }
}
