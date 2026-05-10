import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Project,
  EpisodeInfo,
  YoutubeChannel,
  InstagramAccount,
} from '../../shared/services/ssm-models';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { AnalyticsApiService } from '../../shared/services/analytics-api.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
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

  constructor(
    private projectsApi: ProjectsApiService,
    private analyticsApi: AnalyticsApiService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadYoutubeChannels();
    this.loadInstagramAccounts();
  }

  get selectedProjectLabel() {
    const projectId = Number(this.selectedProjectId);
    const project = this.projects().find((item) => Number(item.id) === projectId);
    return project?.name || project?.utm_name || 'проект не выбран';
  }

  get hasEpisodes() {
    return this.episodes().length > 0;
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

    this.projectsApi.getProjectInfo(id, force).subscribe({
      next: (rows) => {
        this.episodes.set(rows ?? []);
        const episodes = this.episodes();

        this.totalViews = episodes.reduce((s, x) => s + (Number(x.youtube_views) || 0), 0);
        this.totalLikes = episodes.reduce((s, x) => s + (Number(x.youtube_likes) || 0), 0);
        this.totalComments = episodes.reduce((s, x) => s + (Number(x.youtube_comments) || 0), 0);

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

  toNum(v: any): number {
    return Number(v) || 0;
  }

  private loadYoutubeChannels(force = false) {
    this.loadingChannels.set(true);
    this.channelsError.set(null);

    this.analyticsApi.getYoutubeChannels(force).subscribe({
      next: (items) => {
        this.channels.set(items ?? []);
        const channels = this.channels();
        this.totalChannelSubscribers = channels.reduce((sum, channel) => sum + channel.subs_count, 0);
        this.totalChannelViews = channels.reduce((sum, channel) => sum + channel.views_count, 0);
        this.totalChannelLikes = channels.reduce((sum, channel) => sum + channel.likes_count, 0);
        this.totalChannelComments = channels.reduce((sum, channel) => sum + channel.comments_count, 0);
        this.topChannels.set([...channels]
          .sort((a, b) => b.views_count - a.views_count)
          .slice(0, 8));
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

    this.analyticsApi.getInstagramAccounts(force).subscribe({
      next: (items) => {
        this.instagramAccounts.set(items ?? []);
        const instagramAccounts = this.instagramAccounts();
        this.totalInstagramFollowers = instagramAccounts.reduce((sum, account) => sum + account.followers, 0);
        this.totalInstagramPosts = instagramAccounts.reduce((sum, account) => sum + account.posts, 0);
        this.totalInstagramViews = instagramAccounts.reduce((sum, account) => sum + account.views_total, 0);
        this.totalInstagramLikes = instagramAccounts.reduce((sum, account) => sum + account.likes_total, 0);
        this.totalInstagramComments = instagramAccounts.reduce((sum, account) => sum + account.comments_total, 0);
        this.totalInstagramSaves = instagramAccounts.reduce((sum, account) => sum + account.saved_total, 0);
        this.topInstagramAccounts.set([...instagramAccounts]
          .sort((a, b) => b.followers - a.followers)
          .slice(0, 8));
        this.loadingInstagram.set(false);
      },
      error: (e: any) => {
        this.instagramError.set(e?.message ?? 'Не удалось загрузить данные по Instagram');
        this.loadingInstagram.set(false);
      },
    });
  }
}
