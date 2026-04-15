import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  SsmApiService,
  Project,
  EpisodeInfo,
  UnifiedVisitsRow,
} from '../../shared/services/ssm-api.service';

import { EpisodesChartComponent } from '../../shared/ui/episodes-chart/episodes-chart';
import { EngagementChartComponent } from '../../shared/ui/engagement-chart/engagement-chart';
import { YandexVisitsChartComponent } from '../../shared/ui/yandex-visits-chart/yandex-visits-chart';
import { ComparisonLineChartComponent } from '../../shared/ui/comparison-line-chart/comparison-line-chart';

type Mode = 'single' | 'compare';
type Source = 'youtube' | 'yandex';
type MetricFormat = 'number' | 'percent' | 'decimal';
type MetricTone = 'positive' | 'negative' | 'neutral';
type MetricWinner = 'a' | 'b' | 'tie';

type CompareMetricRow = {
  key: string;
  label: string;
  a: number;
  b: number;
  format: MetricFormat;
  delta: number | null;
  tone: MetricTone;
  winner: MetricWinner;
};

@Component({
  selector: 'app-stats-page',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    FormsModule,
    EpisodesChartComponent,
    EngagementChartComponent,
    YandexVisitsChartComponent,
    ComparisonLineChartComponent,
  ],
  templateUrl: './stats-page.html',
  styleUrl: './stats-page.scss',
})
export class StatsPageComponent implements OnInit {
  activeSource: Source = 'youtube';
  mode: Mode = 'single';

  projects: Project[] = [];
  selectedProjectId = '';

  episodes: EpisodeInfo[] = [];
  totalViews = 0;
  totalLikes = 0;
  totalComments = 0;
  avgViews = 0;
  engagementRate = 0;
  topEpisodes: EpisodeInfo[] = [];

  projectAId = '';
  projectBId = '';
  episodesA: EpisodeInfo[] = [];
  episodesB: EpisodeInfo[] = [];

  kpiA = { views: 0, likes: 0, comments: 0, avgViews: 0, engagement: 0, episodes: 0 };
  kpiB = { views: 0, likes: 0, comments: 0, avgViews: 0, engagement: 0, episodes: 0 };

  visitsRows: UnifiedVisitsRow[] = [];
  projectSlugs: string[] = [];

  selectedSlug = '';
  yandexUsers = 0;
  yandexVisits = 0;
  yandexVisitsPerUser = 0;

  slugA = '';
  slugB = '';
  yandexA = { users: 0, visits: 0, visitsPerUser: 0 };
  yandexB = { users: 0, visits: 0, visitsPerUser: 0 };

  loadingInfo = false;
  error: string | null = null;

  constructor(private api: SsmApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadVisits();
  }

  setSource(source: Source) {
    this.activeSource = source;

    if (this.mode === 'compare') {
      if (source === 'youtube') {
        this.loadCompareYouTube();
      } else {
        this.recalcCompareYandex();
      }
      return;
    }

    if (source === 'youtube') {
      this.loadProjectInfo();
    } else {
      this.recalcYandex();
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
      } else {
        if (!this.slugA && this.projectSlugs.length) this.slugA = this.projectSlugs[0];
        if (!this.slugB && this.projectSlugs.length > 1) this.slugB = this.projectSlugs[1];
        if (!this.slugB && this.projectSlugs.length) this.slugB = this.projectSlugs[0];
        this.recalcCompareYandex();
      }
      return;
    }

    if (this.activeSource === 'youtube') {
      this.loadProjectInfo();
    } else {
      this.recalcYandex();
    }
  }

  onRefresh() {
    if (this.activeSource === 'youtube') {
      if (this.mode === 'single') this.loadProjectInfo();
      else this.loadCompareYouTube();
    } else {
      if (this.mode === 'single') this.recalcYandex();
      else this.recalcCompareYandex();
    }
  }

  loadProjects() {
    this.error = null;

    this.api.getProjects().subscribe({
      next: (list) => {
        this.projects = list ?? [];

        if (this.projects.length && !this.selectedProjectId) {
          this.selectedProjectId = String(this.projects[0].id);
        }

        if (this.projects.length && !this.projectAId) this.projectAId = String(this.projects[0].id);
        if (this.projects.length > 1 && !this.projectBId) this.projectBId = String(this.projects[1].id);
        if (!this.projectBId && this.projects.length) this.projectBId = String(this.projects[0].id);

        this.loadProjectInfo();
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.error = e?.message ?? 'Не удалось загрузить проекты';
        this.cdr.detectChanges();
      },
    });
  }

  onProjectChange() {
    this.loadProjectInfo();
  }

  loadProjectInfo() {
    let id = Number(this.selectedProjectId);
    if (!id && this.projects.length) {
      id = Number(this.projects[0].id);
      this.selectedProjectId = String(id);
    }
    if (!id) return;

    this.loadingInfo = true;
    this.error = null;
    this.cdr.detectChanges();

    this.api.getProjectInfo(id).subscribe({
      next: (rows) => {
        this.episodes = rows ?? [];
        this.computeYouTubeSingle();
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.error = e?.message ?? 'Не удалось загрузить данные проекта';
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
    });
  }

  onCompareProjectsChange() {
    this.loadCompareYouTube();
  }

  loadCompareYouTube() {
    const aId = Number(this.projectAId);
    const bId = Number(this.projectBId);
    if (!aId || !bId) return;

    this.loadingInfo = true;
    this.error = null;
    this.cdr.detectChanges();

    forkJoin([
      this.api.getProjectInfo(aId),
      this.api.getProjectInfo(bId),
    ]).subscribe({
      next: ([projectA, projectB]) => {
        this.episodesA = projectA ?? [];
        this.episodesB = projectB ?? [];
        this.kpiA = this.computeKpi(this.episodesA);
        this.kpiB = this.computeKpi(this.episodesB);
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.error = e?.message ?? 'Не удалось загрузить сравнение проектов';
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadVisits() {
    this.error = null;

    this.api.getVisits().subscribe({
      next: (resp) => {
        const rows = this.api.normalizeVisits(resp).filter((row) => row.type === 'series');
        this.visitsRows = rows;

        this.projectSlugs = Array.from(new Set(rows.map((row) => row.project_slug))).sort();

        if (!this.selectedSlug && this.projectSlugs.length) this.selectedSlug = this.projectSlugs[0];
        if (!this.slugA && this.projectSlugs.length) this.slugA = this.projectSlugs[0];
        if (!this.slugB && this.projectSlugs.length > 1) this.slugB = this.projectSlugs[1];
        if (!this.slugB && this.projectSlugs.length) this.slugB = this.projectSlugs[0];

        this.recalcYandex();
        this.recalcCompareYandex();
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.error = e?.message ?? 'Не удалось загрузить визиты';
        this.cdr.detectChanges();
      },
    });
  }

  recalcYandex() {
    const list = this.seriesRowsForSlug(this.selectedSlug);
    this.yandexUsers = list.reduce((sum, row) => sum + (Number(row.yandex_users) || 0), 0);
    this.yandexVisits = list.reduce((sum, row) => sum + (Number(row.yandex_visits) || 0), 0);
    this.yandexVisitsPerUser = this.yandexUsers ? this.yandexVisits / this.yandexUsers : 0;
  }

  onCompareSlugsChange() {
    this.recalcCompareYandex();
  }

  recalcCompareYandex() {
    const listA = this.seriesRowsForSlug(this.slugA);
    const listB = this.seriesRowsForSlug(this.slugB);

    const usersA = listA.reduce((sum, row) => sum + (Number(row.yandex_users) || 0), 0);
    const visitsA = listA.reduce((sum, row) => sum + (Number(row.yandex_visits) || 0), 0);
    const usersB = listB.reduce((sum, row) => sum + (Number(row.yandex_users) || 0), 0);
    const visitsB = listB.reduce((sum, row) => sum + (Number(row.yandex_visits) || 0), 0);

    this.yandexA = {
      users: usersA,
      visits: visitsA,
      visitsPerUser: usersA ? visitsA / usersA : 0,
    };

    this.yandexB = {
      users: usersB,
      visits: visitsB,
      visitsPerUser: usersB ? visitsB / usersB : 0,
    };
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
    return [
      this.buildCompareMetric('users', 'Пользователи', this.yandexA.users, this.yandexB.users, 'number'),
      this.buildCompareMetric('visits', 'Визиты', this.yandexA.visits, this.yandexB.visits, 'number'),
      this.buildCompareMetric('visitsPerUser', 'Визитов на пользователя', this.yandexA.visitsPerUser, this.yandexB.visitsPerUser, 'decimal'),
    ];
  }

  get youtubeCompareLabels(): string[] {
    return this.buildIndexedLabels(Math.max(this.episodesA.length, this.episodesB.length));
  }

  get youtubeViewSeriesA(): Array<number | null> {
    return this.episodeSeries(this.episodesA, (episode) => Number(episode.youtube_views) || 0);
  }

  get youtubeViewSeriesB(): Array<number | null> {
    return this.episodeSeries(this.episodesB, (episode) => Number(episode.youtube_views) || 0);
  }

  get youtubeEngagementSeriesA(): Array<number | null> {
    return this.episodeSeries(this.episodesA, (episode) => this.episodeEngagement(episode));
  }

  get youtubeEngagementSeriesB(): Array<number | null> {
    return this.episodeSeries(this.episodesB, (episode) => this.episodeEngagement(episode));
  }

  get yandexCompareLabels(): string[] {
    const rowsA = this.seriesRowsForSlug(this.slugA);
    const rowsB = this.seriesRowsForSlug(this.slugB);
    const labelsA = rowsA.map((row, index) => this.seriesRowLabel(row, index));
    const labelsB = rowsB.map((row, index) => this.seriesRowLabel(row, index));
    const length = Math.max(labelsA.length, labelsB.length);

    return Array.from({ length }, (_, index) => labelsA[index] || labelsB[index] || `#${index + 1}`);
  }

  get yandexVisitsSeriesA(): Array<number | null> {
    return this.seriesRowsForSlug(this.slugA).map((row) => Number(row.yandex_visits) || 0);
  }

  get yandexVisitsSeriesB(): Array<number | null> {
    return this.seriesRowsForSlug(this.slugB).map((row) => Number(row.yandex_visits) || 0);
  }

  get yandexUsersSeriesA(): Array<number | null> {
    return this.seriesRowsForSlug(this.slugA).map((row) => Number(row.yandex_users) || 0);
  }

  get yandexUsersSeriesB(): Array<number | null> {
    return this.seriesRowsForSlug(this.slugB).map((row) => Number(row.yandex_users) || 0);
  }

  getSingleHeadline() {
    return this.activeSource === 'youtube'
      ? `${this.getProjectNameById(this.selectedProjectId)} — обзор`
      : `${this.getSlugLabel(this.selectedSlug)} — обзор`;
  }

  getComparePrimaryLabel() {
    return this.activeSource === 'youtube'
      ? this.getProjectNameById(this.projectAId)
      : this.getSlugLabel(this.slugA);
  }

  getCompareSecondaryLabel() {
    return this.activeSource === 'youtube'
      ? this.getProjectNameById(this.projectBId)
      : this.getSlugLabel(this.slugB);
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

  countWins(rows: CompareMetricRow[], winner: MetricWinner) {
    return rows.filter((row) => row.winner === winner).length;
  }

  formatMetricValue(value: number, format: MetricFormat, compact = false) {
    if (format === 'percent') {
      return `${Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
    }

    if (format === 'decimal') {
      return Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    }

    if (compact) {
      return this.fmtCompact(value);
    }

    return this.fmt(value);
  }

  formatDelta(row: CompareMetricRow) {
    if (row.delta == null) {
      return row.winner === 'a' ? 'Новый лидер' : '—';
    }

    const sign = row.delta > 0 ? '+' : '';
    return `${sign}${row.delta.toFixed(1)}%`;
  }

  barWidth(value: number, otherValue: number) {
    const max = Math.max(value, otherValue, 1);
    return (value / max) * 100;
  }

  trackByMetric = (_: number, row: CompareMetricRow) => row.key;

  fmt(value: number) {
    return Intl.NumberFormat('ru-RU').format(value);
  }

  fmtCompact(value: number) {
    return Intl.NumberFormat('ru-RU', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  getProjectNameById(id: string) {
    const projectId = Number(id);
    const project = this.projects.find((item) => Number(item.id) === projectId);
    return project?.name || project?.utm_name || `Проект ${id}`;
  }

  getSlugLabel(slug: string) {
    return slug ? slug.replace(/[_-]+/g, ' ') : 'Проект';
  }

  private computeYouTubeSingle() {
    const episodes = this.episodes;
    this.totalViews = episodes.reduce((sum, episode) => sum + (Number(episode.youtube_views) || 0), 0);
    this.totalLikes = episodes.reduce((sum, episode) => sum + (Number(episode.youtube_likes) || 0), 0);
    this.totalComments = episodes.reduce((sum, episode) => sum + (Number(episode.youtube_comments) || 0), 0);
    this.avgViews = episodes.length ? Math.round(this.totalViews / episodes.length) : 0;
    this.engagementRate = this.totalViews ? ((this.totalLikes + this.totalComments) / this.totalViews) * 100 : 0;

    this.topEpisodes = [...episodes]
      .sort((a, b) => (Number(b.youtube_views) || 0) - (Number(a.youtube_views) || 0))
      .slice(0, 5);
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

  private seriesRowsForSlug(slug: string) {
    return [...this.visitsRows]
      .filter((row) => row.project_slug === slug)
      .sort((a, b) => {
        const left = Number(String(a.key).split('_')[1]) || 0;
        const right = Number(String(b.key).split('_')[1]) || 0;
        return left - right;
      });
  }

  private seriesRowLabel(row: UnifiedVisitsRow, index: number) {
    const itemIndex = Number(String(row.key).split('_')[1]);
    return `#${itemIndex || index + 1}`;
  }

  private buildIndexedLabels(length: number) {
    return Array.from({ length }, (_, index) => `#${index + 1}`);
  }

  private episodeSeries(
    episodes: EpisodeInfo[],
    selector: (episode: EpisodeInfo) => number
  ): Array<number | null> {
    return this.sortEpisodes(episodes).map((episode) => selector(episode));
  }

  private sortEpisodes(episodes: EpisodeInfo[]) {
    return [...episodes].sort((a, b) => this.pickEpisodeDate(a).localeCompare(this.pickEpisodeDate(b)));
  }

  private pickEpisodeDate(episode: EpisodeInfo) {
    return (episode.youtube_release_date || episode.release_date || '').slice(0, 10);
  }

  private episodeEngagement(episode: EpisodeInfo) {
    const views = Number(episode.youtube_views) || 0;
    const likes = Number(episode.youtube_likes) || 0;
    const comments = Number(episode.youtube_comments) || 0;
    return views ? ((likes + comments) / views) * 100 : 0;
  }
}
