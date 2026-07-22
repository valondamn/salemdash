import { ChangeDetectorRef, Component, NgZone, OnInit, ViewEncapsulation } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import {
  Project,
  EpisodeInfo,
  InstagramAccount,
  YandexProjectAnalytics,
  ProjectPlatformStats,
  ProjectMetricRow,
  YoutubeReleaseMetric,
  YoutubeReleasePeriod,
} from '../../shared/services/ssm-models';
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
    NgSelectComponent,
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
  youtubeCompareKind: 'periods' | 'episodes' = 'periods';
  youtubeCompareAFrom = '';
  youtubeCompareATo = '';
  youtubeCompareBFrom = '';
  youtubeCompareBTo = '';
  youtubeEpisodeAKey = '';
  youtubeEpisodeBKey = '';
  youtubeEpisodeOptionsA: EpisodeInfo[] = [];
  youtubeEpisodeOptionsB: EpisodeInfo[] = [];
  youtubePeriodA: YoutubeReleasePeriod | null = null;
  youtubePeriodB: YoutubeReleasePeriod | null = null;
  youtubeComparisonReady = false;
  loadingYoutubeEpisodesA = false;
  loadingYoutubeEpisodesB = false;
  /**
   * By default the YouTube "single project" view shows the full episode catalog.
   * Episodes are release-dated, not daily metrics, so most series don't release
   * anything within "this month" — filtering by the default period out of the box
   * used to leave the view empty for almost every project. The period filter only
   * kicks in once the user explicitly applies a date range.
   */
  youtubePeriodFilterActive = false;

  /**
   * Period-scoped totals for the single-project YouTube view, sourced from the
   * daily releases_for_project feed (real per-day deltas) instead of each
   * episode's lifetime YouTubeViews/Likes/Comments. Null means "no period data
   * for this range" (either no period applied yet, or the range predates the
   * daily-metrics retention window, roughly 2026-03-14) — in that case the
   * single-stats component falls back to lifetime per-episode totals.
   */
  youtubeSinglePeriodTotals: { views: number; likes: number; comments: number } | null = null;

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
    if (!this.youtubeComparisonReady) return false;

    // For period comparisons the request can succeed with zero rows on both
    // sides (e.g. a date range with no tracked daily metrics yet). Treat that
    // as "no data" rather than rendering an all-zero chart that looks broken.
    if (this.youtubeCompareKind === 'periods') {
      return this.youtubePeriodDailyA.length > 0 || this.youtubePeriodDailyB.length > 0;
    }

    return true;
  }

  get youtubeEpisodeChoicesA() {
    return this.youtubeEpisodeOptionsA.map((episode) => this.toEpisodeChoice(episode));
  }

  get youtubeEpisodeChoicesB() {
    return this.youtubeEpisodeOptionsB.map((episode) => this.toEpisodeChoice(episode));
  }

  get youtubeCompareCanRun() {
    if (!this.projectAId || !this.projectBId || this.loadingInfo) return false;

    if (this.youtubeCompareKind === 'episodes') {
      return Boolean(
        this.youtubeEpisodeAKey &&
        this.youtubeEpisodeBKey &&
        !this.loadingYoutubeEpisodesA &&
        !this.loadingYoutubeEpisodesB
      );
    }

    return Boolean(
      this.youtubeCompareAFrom &&
      this.youtubeCompareATo &&
      this.youtubeCompareBFrom &&
      this.youtubeCompareBTo &&
      this.youtubeCompareAFrom <= this.youtubeCompareATo &&
      this.youtubeCompareBFrom <= this.youtubeCompareBTo
    );
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
        this.invalidateYoutubeComparison();
        if (this.youtubeCompareKind === 'episodes') this.prepareYoutubeEpisodeOptions();
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
        this.invalidateYoutubeComparison();
        if (this.youtubeCompareKind === 'episodes') this.prepareYoutubeEpisodeOptions();
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
      else this.runYoutubeComparison(true);
      return;
    }

    if (this.isProjectPlatformSource) {
      if (this.mode === 'single') this.loadProjectPlatformStats(true);
      else this.loadCompareProjectPlatformStats(true);
      return;
    }
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
          if (this.mode === 'compare') {
            this.invalidateYoutubeComparison();
            if (this.youtubeCompareKind === 'episodes') this.prepareYoutubeEpisodeOptions(force);
          } else {
            this.loadProjectInfo(force);
          }
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

    // Only ask for period-scoped daily totals once the user has actually applied
    // a date range — otherwise there's no meaningful "period" to scope them to.
    const wantsPeriodTotals = this.youtubePeriodFilterActive && !!this.appliedDateFrom && !!this.appliedDateTo;

    forkJoin({
      episodes: this.projectsApi.getProjectInfo(id, force),
      period: wantsPeriodTotals
        ? this.analyticsApi
            .getYoutubeProjectReleaseMetrics(id, this.appliedDateFrom, this.appliedDateTo)
            .pipe(catchError(() => of(null)))
        : of(null),
    }).subscribe({
      next: ({ episodes: allEpisodes, period }) => {
        this.clearInfoLoadTimer();
        this.episodes = this.filterByPeriod(allEpisodes);
        this.youtubeSinglePeriodTotals = this.buildSinglePeriodTotals(period);
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

  private buildSinglePeriodTotals(period: YoutubeReleasePeriod | null) {
    if (!period || !period.items.length) return null;

    const kpi = this.computeYoutubePeriodKpi(period.items);
    return { views: kpi.views, likes: kpi.likes, comments: kpi.comments };
  }

  onCompareProjectsChange() {
    this.invalidateYoutubeComparison();

    if (this.youtubeCompareKind === 'episodes') {
      this.prepareYoutubeEpisodeOptions();
    }
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
      if (this.mode === 'single') {
        this.youtubePeriodFilterActive = true;
        this.loadProjectInfo(true);
      } else {
        this.runYoutubeComparison(true);
      }
      return;
    }

    if (!this.isProjectPlatformSource) return;

    if (this.mode === 'single') this.loadProjectPlatformStats(true);
    else this.loadCompareProjectPlatformStats(true);
  }

  setYoutubeCompareKind(kind: 'periods' | 'episodes') {
    if (this.youtubeCompareKind === kind) return;

    this.youtubeCompareKind = kind;
    this.invalidateYoutubeComparison();

    if (kind === 'episodes') {
      this.prepareYoutubeEpisodeOptions();
    }
  }

  runYoutubeComparison(force = false) {
    this.error = null;

    if (!this.projectAId || !this.projectBId) {
      this.error = 'Выберите обе стороны сравнения.';
      return;
    }

    if (this.youtubeCompareKind === 'episodes') {
      if (force) {
        this.prepareYoutubeEpisodeOptions(true, true);
      } else {
        this.runYoutubeEpisodeComparison();
      }
      return;
    }

    if (!this.validateYoutubeComparePeriods()) return;

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
      this.analyticsApi.getYoutubeProjectReleaseMetrics(aId, this.youtubeCompareAFrom, this.youtubeCompareATo),
      this.analyticsApi.getYoutubeProjectReleaseMetrics(bId, this.youtubeCompareBFrom, this.youtubeCompareBTo),
    ]).subscribe({
      next: ([periodA, periodB]) => {
        this.clearInfoLoadTimer();
        this.youtubePeriodA = periodA;
        this.youtubePeriodB = periodB;
        this.episodesA = [];
        this.episodesB = [];
        this.kpiA = this.computeYoutubePeriodKpi(periodA.items);
        this.kpiB = this.computeYoutubePeriodKpi(periodB.items);
        this.youtubeComparisonReady = true;
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

  copyYoutubeProjectAToB() {
    if (!this.projectAId) return;

    this.projectBId = this.projectAId;
    this.youtubeEpisodeBKey = '';

    // "Тот же проект" is meant to compare two different periods of one project.
    // If both sides start out with the same default period, the first comparison
    // would show 0% difference everywhere and look broken. Auto-shift side B to
    // the period immediately preceding side A's so there's a meaningful diff
    // right away; the user can still adjust either date afterwards.
    if (this.youtubeCompareKind === 'periods') {
      this.shiftYoutubeCompareBToPrecedingPeriod();
    }

    this.invalidateYoutubeComparison();

    if (this.youtubeCompareKind === 'episodes') {
      this.prepareYoutubeEpisodeOptions();
    }
  }

  swapYoutubeCompareSides() {
    [this.projectAId, this.projectBId] = [this.projectBId, this.projectAId];
    [this.youtubeCompareAFrom, this.youtubeCompareBFrom] = [this.youtubeCompareBFrom, this.youtubeCompareAFrom];
    [this.youtubeCompareATo, this.youtubeCompareBTo] = [this.youtubeCompareBTo, this.youtubeCompareATo];
    [this.youtubeEpisodeAKey, this.youtubeEpisodeBKey] = [this.youtubeEpisodeBKey, this.youtubeEpisodeAKey];
    [this.youtubeEpisodeOptionsA, this.youtubeEpisodeOptionsB] = [this.youtubeEpisodeOptionsB, this.youtubeEpisodeOptionsA];

    if (this.youtubeComparisonReady) {
      [this.youtubePeriodA, this.youtubePeriodB] = [this.youtubePeriodB, this.youtubePeriodA];
      [this.episodesA, this.episodesB] = [this.episodesB, this.episodesA];
      [this.kpiA, this.kpiB] = [this.kpiB, this.kpiA];
    }
  }

  invalidateYoutubeComparison() {
    this.youtubeComparisonReady = false;
    this.error = null;
  }

  private prepareYoutubeEpisodeOptions(force = false, compareAfterLoad = false) {
    const aId = Number(this.projectAId);
    const bId = Number(this.projectBId);
    if (!aId || !bId) return;

    this.loadingYoutubeEpisodesA = true;
    this.loadingYoutubeEpisodesB = true;
    this.error = null;

    forkJoin([
      this.projectsApi.getProjectInfo(aId, force),
      this.projectsApi.getProjectInfo(bId, force),
    ]).subscribe({
      next: ([episodesA, episodesB]) => {
        this.youtubeEpisodeOptionsA = this.sortEpisodeOptions(episodesA);
        this.youtubeEpisodeOptionsB = this.sortEpisodeOptions(episodesB);
        this.youtubeEpisodeAKey = this.ensureEpisodeKey(this.youtubeEpisodeOptionsA, this.youtubeEpisodeAKey);
        this.youtubeEpisodeBKey = this.ensureEpisodeKey(this.youtubeEpisodeOptionsB, this.youtubeEpisodeBKey);
        this.loadingYoutubeEpisodesA = false;
        this.loadingYoutubeEpisodesB = false;

        if (compareAfterLoad) this.runYoutubeEpisodeComparison();
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.loadingYoutubeEpisodesA = false;
        this.loadingYoutubeEpisodesB = false;
        this.error = e?.message ?? 'Не удалось загрузить список роликов';
        this.cdr.detectChanges();
      },
    });
  }

  private runYoutubeEpisodeComparison() {
    const episodeA = this.findEpisodeByKey(this.youtubeEpisodeOptionsA, this.youtubeEpisodeAKey);
    const episodeB = this.findEpisodeByKey(this.youtubeEpisodeOptionsB, this.youtubeEpisodeBKey);

    if (!episodeA || !episodeB) {
      this.error = 'Выберите ролик для каждой стороны сравнения.';
      return;
    }

    this.youtubePeriodA = null;
    this.youtubePeriodB = null;
    this.episodesA = [episodeA];
    this.episodesB = [episodeB];
    this.kpiA = this.computeKpi(this.episodesA);
    this.kpiB = this.computeKpi(this.episodesB);
    this.youtubeComparisonReady = true;
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
    const rows = [
      this.buildCompareMetric('views', 'Просмотры', this.kpiA.views, this.kpiB.views, 'number'),
      this.buildCompareMetric('likes', 'Лайки', this.kpiA.likes, this.kpiB.likes, 'number'),
      this.buildCompareMetric('comments', 'Комментарии', this.kpiA.comments, this.kpiB.comments, 'number'),
      this.buildCompareMetric('engagement', 'Вовлечённость', this.kpiA.engagement, this.kpiB.engagement, 'percent'),
    ];

    if (this.youtubeCompareKind === 'periods') {
      rows.push(
        this.buildCompareMetric('avgViews', 'Просмотры в среднем / день', this.kpiA.avgViews, this.kpiB.avgViews, 'number'),
        this.buildCompareMetric('episodes', 'Дней с данными', this.kpiA.episodes, this.kpiB.episodes, 'number')
      );
    }

    return rows;
  }

  get youtubeSelectedEpisodeA() {
    return this.findEpisodeByKey(this.youtubeEpisodeOptionsA, this.youtubeEpisodeAKey);
  }

  get youtubeSelectedEpisodeB() {
    return this.findEpisodeByKey(this.youtubeEpisodeOptionsB, this.youtubeEpisodeBKey);
  }

  get youtubeComparePrimaryLabel() {
    return this.youtubeCompareKind === 'episodes'
      ? this.episodeTitle(this.youtubeSelectedEpisodeA)
      : this.getProjectNameById(this.projectAId);
  }

  get youtubeCompareSecondaryLabel() {
    return this.youtubeCompareKind === 'episodes'
      ? this.episodeTitle(this.youtubeSelectedEpisodeB)
      : this.getProjectNameById(this.projectBId);
  }

  get youtubeCompareContextA() {
    if (this.youtubeCompareKind === 'episodes') {
      return `${this.getProjectNameById(this.projectAId)} · ${this.formatDisplayDate(this.pickEpisodeDate(this.youtubeSelectedEpisodeA))}`;
    }

    return `${this.formatDisplayDate(this.youtubeCompareAFrom)} – ${this.formatDisplayDate(this.youtubeCompareATo)}`;
  }

  get youtubeCompareContextB() {
    if (this.youtubeCompareKind === 'episodes') {
      return `${this.getProjectNameById(this.projectBId)} · ${this.formatDisplayDate(this.pickEpisodeDate(this.youtubeSelectedEpisodeB))}`;
    }

    return `${this.formatDisplayDate(this.youtubeCompareBFrom)} – ${this.formatDisplayDate(this.youtubeCompareBTo)}`;
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
    if (this.youtubeCompareKind === 'episodes') return ['Ролик'];

    const length = Math.max(this.youtubePeriodDailyA.length, this.youtubePeriodDailyB.length);
    return Array.from({ length }, (_, index) => `День ${index + 1}`);
  }

  get youtubeCompareDateLabelsA() {
    return this.youtubePeriodDailyA.map((row) => this.formatDisplayDate(row.metric_date));
  }

  get youtubeCompareDateLabelsB() {
    return this.youtubePeriodDailyB.map((row) => this.formatDisplayDate(row.metric_date));
  }

  get youtubePeriodDailyA() {
    return this.aggregateYoutubePeriodByDate(this.youtubePeriodA?.items ?? []);
  }

  get youtubePeriodDailyB() {
    return this.aggregateYoutubePeriodByDate(this.youtubePeriodB?.items ?? []);
  }

  get youtubeViewSeriesA(): Array<number | null> {
    if (this.youtubeCompareKind === 'episodes') return [this.kpiA.views];
    return this.padYoutubePeriodSeries(this.youtubePeriodDailyA.map((row) => row.views));
  }

  get youtubeViewSeriesB(): Array<number | null> {
    if (this.youtubeCompareKind === 'episodes') return [this.kpiB.views];
    return this.padYoutubePeriodSeries(this.youtubePeriodDailyB.map((row) => row.views));
  }

  get youtubeEngagementSeriesA(): Array<number | null> {
    if (this.youtubeCompareKind === 'episodes') return [this.kpiA.engagement];
    return this.padYoutubePeriodSeries(this.youtubePeriodDailyA.map((row) => this.youtubeMetricEngagement(row)));
  }

  get youtubeEngagementSeriesB(): Array<number | null> {
    if (this.youtubeCompareKind === 'episodes') return [this.kpiB.engagement];
    return this.padYoutubePeriodSeries(this.youtubePeriodDailyB.map((row) => this.youtubeMetricEngagement(row)));
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
      if (this.mode === 'compare') {
        return this.youtubeCompareKind === 'periods'
          ? 'Сравнение проектов за независимые периоды.'
          : 'Сравнение конкретных роликов.';
      }
      return 'Выбор по проекту.';
    }
    return this.mode === 'compare' ? 'Сравнение двух проектов за период.' : 'Выбор проекта и периода.';
  }

  getLoadingMessage() {
    if (this.loadingProjects) return 'Загружаем список проектов.';
    if (this.activeSource === 'youtube') {
      if (this.mode === 'compare') {
        return this.youtubeCompareKind === 'periods'
          ? 'Считаем показатели двух периодов.'
          : 'Загружаем данные выбранных роликов.';
      }
      return 'Загружаем проект.';
    }
    if (this.activeSource === 'yandex') {
      return this.mode === 'compare' ? 'Обновляем два проекта по Яндексу.' : 'Обновляем Яндекс по проекту.';
    }
    if (this.activeSource === 'tiktok') return 'Обновляем TikTok по проекту.';
    return 'Обновляем Instagram по проекту.';
  }

  getEmptyStateTitle() {
    if (this.activeSource === 'youtube') {
      if (this.mode === 'compare') {
        return this.youtubeComparisonReady
          ? 'За выбранный период нет данных'
          : 'Пока нет данных для сравнения YouTube';
      }
      return 'По этому проекту нет YouTube-данных';
    }
    if (this.activeSource === 'yandex') return 'По проекту нет данных Яндекс Метрики';
    if (this.activeSource === 'tiktok') return 'По проекту нет TikTok-данных';
    return 'По проекту нет Instagram-данных';
  }

  getEmptyStateCopy() {
    if (this.activeSource === 'youtube') {
      if (this.mode === 'compare') {
        return this.youtubeComparisonReady
          ? 'Ежедневная YouTube-статистика обычно доступна за последние несколько месяцев. Попробуйте более свежий период или другой проект.'
          : 'Выберите два проекта или обновите данные.';
      }
      return 'Попробуйте другой проект.';
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
      return this.youtubeComparePrimaryLabel;
    }

    if (this.activeSource === 'yandex') {
      return this.getProjectNameById(this.projectStatsAId);
    }

    return this.getProjectNameById(this.projectStatsAId);
  }

  getCompareSecondaryLabel() {
    if (this.activeSource === 'youtube') {
      return this.youtubeCompareSecondaryLabel;
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
    this.youtubeCompareAFrom = this.dateFrom;
    this.youtubeCompareATo = this.dateTo;
    this.youtubeCompareBFrom = this.dateFrom;
    this.youtubeCompareBTo = this.dateTo;
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

  private validateYoutubeComparePeriods() {
    if (
      !this.youtubeCompareAFrom ||
      !this.youtubeCompareATo ||
      !this.youtubeCompareBFrom ||
      !this.youtubeCompareBTo
    ) {
      this.error = 'Укажите начало и конец периода для обеих сторон.';
      return false;
    }

    if (this.youtubeCompareAFrom > this.youtubeCompareATo) {
      this.error = 'В периоде A дата начала позже даты окончания.';
      return false;
    }

    if (this.youtubeCompareBFrom > this.youtubeCompareBTo) {
      this.error = 'В периоде B дата начала позже даты окончания.';
      return false;
    }

    return true;
  }

  private toEpisodeChoice(episode: EpisodeInfo) {
    const date = this.pickEpisodeDate(episode);
    const details = [episode.season ? `сезон ${episode.season}` : '', date ? this.formatDisplayDate(date) : '']
      .filter(Boolean)
      .join(' · ');

    return {
      value: this.episodeCompareKey(episode),
      label: details ? `${this.episodeTitle(episode)} — ${details}` : this.episodeTitle(episode),
    };
  }

  private episodeCompareKey(episode: EpisodeInfo) {
    if (episode.youtube_id) return `youtube:${episode.youtube_id}`;
    if (episode.id != null) return `id:${episode.id}`;
    return `episode:${episode.episode_name ?? ''}:${this.pickEpisodeDate(episode)}`;
  }

  private findEpisodeByKey(episodes: EpisodeInfo[], key: string) {
    return episodes.find((episode) => this.episodeCompareKey(episode) === key) ?? null;
  }

  private ensureEpisodeKey(episodes: EpisodeInfo[], currentKey: string) {
    if (currentKey && this.findEpisodeByKey(episodes, currentKey)) return currentKey;
    return episodes.length ? this.episodeCompareKey(episodes[0]) : '';
  }

  private sortEpisodeOptions(episodes: EpisodeInfo[]) {
    return [...episodes].sort((a, b) => this.pickEpisodeDate(b).localeCompare(this.pickEpisodeDate(a)));
  }

  private episodeTitle(episode: EpisodeInfo | null) {
    return episode?.episode_name || episode?.youtube_id || 'Ролик не выбран';
  }

  private shiftYoutubeCompareBToPrecedingPeriod() {
    const from = this.youtubeCompareAFrom;
    const to = this.youtubeCompareATo;
    if (!from || !to) return;

    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return;

    const dayMs = 24 * 60 * 60 * 1000;
    const spanMs = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - dayMs);
    const prevFrom = new Date(prevTo.getTime() - spanMs);

    this.youtubeCompareBFrom = this.toIsoDate(prevFrom);
    this.youtubeCompareBTo = this.toIsoDate(prevTo);
  }

  private toIsoDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private formatDisplayDate(value: string) {
    if (!value) return 'дата не указана';
    const [year, month, day] = value.slice(0, 10).split('-');
    return year && month && day ? `${day}.${month}.${year}` : value;
  }

  private aggregateYoutubePeriodByDate(items: YoutubeReleaseMetric[]): YoutubeReleaseMetric[] {
    const rows = new Map<string, YoutubeReleaseMetric>();

    for (const item of items) {
      const date = item.metric_date.slice(0, 10);
      if (!date) continue;

      const current = rows.get(date) ?? {
        project_name: item.project_name,
        episode_name: '',
        youtube_id: '',
        channel_name: item.channel_name,
        metric_date: date,
        views: 0,
        likes: 0,
        comments: 0,
        subscribers_gained: 0,
        subscribers_lost: 0,
        subscribers_net: 0,
      };

      current.views += item.views;
      current.likes += item.likes;
      current.comments += item.comments;
      current.subscribers_gained += item.subscribers_gained;
      current.subscribers_lost += item.subscribers_lost;
      current.subscribers_net += item.subscribers_net;
      rows.set(date, current);
    }

    return [...rows.values()].sort((a, b) => a.metric_date.localeCompare(b.metric_date));
  }

  private computeYoutubePeriodKpi(items: YoutubeReleaseMetric[]) {
    const daily = this.aggregateYoutubePeriodByDate(items);
    // The upstream YouTube analytics feed reports day-level *deltas*, which can
    // occasionally go negative (e.g. more unlikes than likes on a given day).
    // That's a legitimate data point per day, but a negative "Лайки" total for
    // the whole period reads as broken, so the aggregated totals are clamped
    // to zero for display purposes.
    const views = Math.max(0, daily.reduce((sum, row) => sum + row.views, 0));
    const likes = Math.max(0, daily.reduce((sum, row) => sum + row.likes, 0));
    const comments = Math.max(0, daily.reduce((sum, row) => sum + row.comments, 0));
    const engagement = views ? ((likes + comments) / views) * 100 : 0;

    return {
      views,
      likes,
      comments,
      avgViews: daily.length ? Math.round(views / daily.length) : 0,
      engagement,
      episodes: daily.length,
    };
  }

  private youtubeMetricEngagement(row: YoutubeReleaseMetric) {
    return row.views ? ((row.likes + row.comments) / row.views) * 100 : 0;
  }

  private padYoutubePeriodSeries(values: number[]): Array<number | null> {
    const length = Math.max(this.youtubePeriodDailyA.length, this.youtubePeriodDailyB.length);
    return Array.from({ length }, (_, index) => values[index] ?? null);
  }

  private filterByPeriod(episodes: EpisodeInfo[]): EpisodeInfo[] {
    if (!this.youtubePeriodFilterActive) return episodes;

    // Period here means "show stats for episodes that already exist as of
    // the selected date", not "only episodes released inside the range".
    // Otherwise older episodes that are still racking up views during the
    // period get excluded just because they premiered before it started —
    // which was confusing (e.g. a project with all episodes released in
    // 2023 showed "no data" for a 2025-2026 period even though those
    // episodes were still live and had real stats). Only the upper bound
    // ("по") matters: an episode counts if it was already released by then.
    const to = this.appliedDateTo;
    if (!to) return episodes;

    return episodes.filter((ep) => {
      const date = (ep.youtube_release_date || ep.release_date || '').slice(0, 10);
      if (!date) return true;
      return date <= to;
    });
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

  private pickEpisodeDate(episode: EpisodeInfo | null) {
    return (episode?.youtube_release_date || episode?.release_date || '').slice(0, 10);
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
