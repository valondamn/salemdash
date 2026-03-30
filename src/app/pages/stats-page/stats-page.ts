import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SsmApiService, Project, EpisodeInfo } from '../../shared/services/ssm-api.service';
import { EpisodesChartComponent } from '../../shared/ui/episodes-chart/episodes-chart';
import { EngagementChartComponent } from '../../shared/ui/engagement-chart/engagement-chart';
@Component({
  selector: 'app-stats-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, EpisodesChartComponent, EngagementChartComponent],
  templateUrl: './stats-page.html',
  styleUrl: './stats-page.scss',
})

export class StatsPageComponent implements OnInit {
  totalViews = 0;
  totalLikes = 0;
  totalComments = 0;
  avgViews = 0;
  engagementRate = 0; // общий %

  topEpisodes: EpisodeInfo[] = [];

  projects: Project[] = [];
  selectedProjectId: string = '';

  loadingProjects = false;
  loadingInfo = false;
  error: string | null = null;

  episodes: EpisodeInfo[] = [];

  constructor(private api: SsmApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects() {
    this.loadingProjects = true;
    this.error = null;
    this.cdr.detectChanges();

    this.api.getProjects().subscribe({
      next: (list) => {
        this.projects = list ?? [];
        if (this.projects.length && !this.selectedProjectId) {
          this.selectedProjectId = String(this.projects[0].id);
        }
        this.loadingProjects = false;
        this.cdr.detectChanges();

        this.loadProjectInfo();
      },
      error: (e: any) => {
        this.error = e?.message ?? 'Failed to load projects';
        this.loadingProjects = false;
        this.cdr.detectChanges();
      },
    });
  }

  onProjectChange() {
    this.loadProjectInfo();
  }

  fmt(n: number) {
    return Intl.NumberFormat('en-US').format(n);
  }
  fmtPct(n: number) {
    return `${n.toFixed(2)}%`;
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

        const eps = this.episodes;

        this.totalViews = eps.reduce((s, x) => s + (Number(x.youtube_views) || 0), 0);
        this.totalLikes = eps.reduce((s, x) => s + (Number(x.youtube_likes) || 0), 0);
        this.totalComments = eps.reduce((s, x) => s + (Number(x.youtube_comments) || 0), 0);

        this.avgViews = eps.length ? Math.round(this.totalViews / eps.length) : 0;

        const denom = this.totalViews || 0;
        this.engagementRate = denom ? ((this.totalLikes + this.totalComments) / denom) * 100 : 0;

// Top 5 по views
        this.topEpisodes = [...eps]
          .sort((a, b) => (Number(b.youtube_views) || 0) - (Number(a.youtube_views) || 0))
          .slice(0, 5);

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
  protected readonly Number = Number;
}
