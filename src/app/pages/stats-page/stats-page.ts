// src/app/pages/stats-page/stats-page.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  SsmApiService,
  Project,
  EpisodeInfo,
  UnifiedVisitsRow,
} from '../../shared/services/ssm-api.service';

import { EpisodesChartComponent } from '../../shared/ui/episodes-chart/episodes-chart';
import { EngagementChartComponent } from '../../shared/ui/engagement-chart/engagement-chart';
import { YandexVisitsChartComponent } from '../../shared/ui/yandex-visits-chart/yandex-visits-chart';

type Mode = 'single' | 'compare';
type Source = 'youtube' | 'yandex';

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
  ],
  templateUrl: './stats-page.html',
  styleUrl: './stats-page.scss',
})
export class StatsPageComponent implements OnInit {


  // хранит "сырые" данные
  episodesAll: EpisodeInfo[] = [];

// фильтр
  dateMode: 'all' | '7d' | '30d' | 'month' | 'range' = 'all';
  dateFrom = '';
  dateTo = '';

  // Tabs
  activeSource: Source = 'youtube';
  mode: Mode = 'single';

  // ---------- YOUTUBE: projects + single ----------
  projects: Project[] = [];
  selectedProjectId: string = '';

  episodes: EpisodeInfo[] = [];
  totalViews = 0;
  totalLikes = 0;
  totalComments = 0;
  avgViews = 0;
  engagementRate = 0;
  topEpisodes: EpisodeInfo[] = [];

  // ---------- YOUTUBE: compare ----------
  projectAId: string = '';
  projectBId: string = '';
  episodesA: EpisodeInfo[] = [];
  episodesB: EpisodeInfo[] = [];

  kpiA = { views: 0, likes: 0, comments: 0, avgViews: 0, engagement: 0, episodes: 0 };
  kpiB = { views: 0, likes: 0, comments: 0, avgViews: 0, engagement: 0, episodes: 0 };

  // ---------- YANDEX: visits ----------
  visitsRows: UnifiedVisitsRow[] = [];
  projectSlugs: string[] = [];

  // single
  selectedSlug: string = '';
  yandexUsers = 0;
  yandexVisits = 0;

  // compare
  slugA: string = '';
  slugB: string = '';
  yandexA = { users: 0, visits: 0 };
  yandexB = { users: 0, visits: 0 };

  // ---------- UI state ----------
  loadingInfo = false;
  error: string | null = null;

  constructor(private api: SsmApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadVisits();
  }

  // --------------------- Common handlers ---------------------
  setSource(s: Source) {
    this.activeSource = s;
  }

  onDateModeChange() {
    // placeholder: пока ничего не фильтруем
    // позже тут будет applyDateFilter()
    console.log('dateMode:', this.dateMode, 'range:', this.dateFrom, this.dateTo);
  }

  setMode(m: Mode) {
    this.mode = m;

    // Подготовим дефолты при переключении режима
    if (m === 'compare') {
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

  // --------------------- YouTube: projects + single ---------------------
  loadProjects() {
    this.error = null;

    this.api.getProjects().subscribe({
      next: (list) => {
        this.projects = list ?? [];

        // single default
        if (this.projects.length && !this.selectedProjectId) {
          this.selectedProjectId = String(this.projects[0].id);
        }

        // compare defaults
        if (this.projects.length && !this.projectAId) this.projectAId = String(this.projects[0].id);
        if (this.projects.length > 1 && !this.projectBId) this.projectBId = String(this.projects[1].id);
        if (!this.projectBId && this.projects.length) this.projectBId = String(this.projects[0].id);

        this.loadProjectInfo();
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.error = e?.message ?? 'Failed to load projects';
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
        this.error = e?.message ?? 'Failed to load project info';
        this.loadingInfo = false;
        this.cdr.detectChanges();
      },
    });
  }

  private computeYouTubeSingle() {
    const eps = this.episodes;
    this.totalViews = eps.reduce((s, x) => s + (Number(x.youtube_views) || 0), 0);
    this.totalLikes = eps.reduce((s, x) => s + (Number(x.youtube_likes) || 0), 0);
    this.totalComments = eps.reduce((s, x) => s + (Number(x.youtube_comments) || 0), 0);
    this.avgViews = eps.length ? Math.round(this.totalViews / eps.length) : 0;
    this.engagementRate = this.totalViews ? ((this.totalLikes + this.totalComments) / this.totalViews) * 100 : 0;

    this.topEpisodes = [...eps]
      .sort((a, b) => (Number(b.youtube_views) || 0) - (Number(a.youtube_views) || 0))
      .slice(0, 5);
  }

  // --------------------- YouTube: compare ---------------------
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

    let done = 0;
    const finish = () => {
      done += 1;
      if (done === 2) {
        this.kpiA = this.computeKpi(this.episodesA);
        this.kpiB = this.computeKpi(this.episodesB);
        this.loadingInfo = false;
        this.cdr.detectChanges();
      }
    };

    this.api.getProjectInfo(aId).subscribe({
      next: (rows) => (this.episodesA = rows ?? []),
      error: (e: any) => (this.error = e?.message ?? 'Failed to load Project A'),
      complete: finish,
    });

    this.api.getProjectInfo(bId).subscribe({
      next: (rows) => (this.episodesB = rows ?? []),
      error: (e: any) => (this.error = e?.message ?? 'Failed to load Project B'),
      complete: finish,
    });
  }

  private computeKpi(eps: EpisodeInfo[]) {
    const views = eps.reduce((s, x) => s + (Number(x.youtube_views) || 0), 0);
    const likes = eps.reduce((s, x) => s + (Number(x.youtube_likes) || 0), 0);
    const comments = eps.reduce((s, x) => s + (Number(x.youtube_comments) || 0), 0);
    const avgViews = eps.length ? Math.round(views / eps.length) : 0;
    const engagement = views ? ((likes + comments) / views) * 100 : 0;
    return { views, likes, comments, avgViews, engagement, episodes: eps.length };
  }

  // --------------------- Yandex: visits ---------------------
  loadVisits() {
    this.error = null;

    this.api.getVisits().subscribe({
      next: (resp) => {
        const rows = this.api.normalizeVisits(resp).filter(r => r.type === 'series');
        this.visitsRows = rows;

        this.projectSlugs = Array.from(new Set(rows.map(r => r.project_slug))).sort();

        if (!this.selectedSlug && this.projectSlugs.length) this.selectedSlug = this.projectSlugs[0];
        if (!this.slugA && this.projectSlugs.length) this.slugA = this.projectSlugs[0];
        if (!this.slugB && this.projectSlugs.length > 1) this.slugB = this.projectSlugs[1];

        this.recalcYandex();
        this.recalcCompareYandex();
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.error = e?.message ?? 'Failed to load visits';
        this.cdr.detectChanges();
      },
    });
  }

  recalcYandex() {
    const list = this.visitsRows.filter(r => r.project_slug === this.selectedSlug);
    this.yandexUsers = list.reduce((s, r) => s + (Number(r.yandex_users) || 0), 0);
    this.yandexVisits = list.reduce((s, r) => s + (Number(r.yandex_visits) || 0), 0);
  }

  onCompareSlugsChange() {
    this.recalcCompareYandex();
  }

  recalcCompareYandex() {
    const listA = this.visitsRows.filter(r => r.project_slug === this.slugA);
    const listB = this.visitsRows.filter(r => r.project_slug === this.slugB);

    this.yandexA = {
      users: listA.reduce((s, r) => s + (Number(r.yandex_users) || 0), 0),
      visits: listA.reduce((s, r) => s + (Number(r.yandex_visits) || 0), 0),
    };

    this.yandexB = {
      users: listB.reduce((s, r) => s + (Number(r.yandex_users) || 0), 0),
      visits: listB.reduce((s, r) => s + (Number(r.yandex_visits) || 0), 0),
    };
  }

  // --------------------- Format helpers ---------------------
  fmt(n: number) {
    return Intl.NumberFormat('en-US').format(n);
  }

  fmtPct(n: number) {
    return `${n.toFixed(2)}%`;
  }

  diffPct(a: number, b: number) {
    if (!b) return '—';
    const v = ((a - b) / b) * 100;
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(1)}%`;
  }

  getProjectNameById(id: string) {
    const n = Number(id);
    const p = this.projects.find(x => Number(x.id) === n);
    return p?.name || p?.utm_name || `Project ${id}`;
  }

  protected readonly Number = Number;
}
