import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SsmApiService, Project, EpisodeInfo } from '../../shared/services/ssm-api.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPageComponent implements OnInit {
  projects: Project[] = [];
  selectedProjectId: string = '';

  loadingProjects = false;
  loadingInfo = false;
  error: string | null = null;

  episodes: EpisodeInfo[] = [];
  totalViews = 0;
  totalLikes = 0;
  totalComments = 0;

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

        this.totalViews = this.episodes.reduce((s, x) => s + (Number(x.youtube_views) || 0), 0);
        this.totalLikes = this.episodes.reduce((s, x) => s + (Number(x.youtube_likes) || 0), 0);
        this.totalComments = this.episodes.reduce((s, x) => s + (Number(x.youtube_comments) || 0), 0);

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

  fmt(n: number) {
    return Intl.NumberFormat('en-US').format(n);
  }

  toNum(v: any): number {
    return Number(v) || 0;
  }

}
