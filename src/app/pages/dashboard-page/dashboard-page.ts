import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SsmApiService,
  Project,
  EpisodeInfo,
  YoutubeChannel,
  InstagramAccount,
} from '../../shared/services/ssm-api.service';

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

  loadingChannels = false;
  channelsError: string | null = null;
  channels: YoutubeChannel[] = [];
  topChannels: YoutubeChannel[] = [];
  totalChannelSubscribers = 0;
  totalChannelViews = 0;
  totalChannelLikes = 0;
  totalChannelComments = 0;

  loadingInstagram = false;
  instagramError: string | null = null;
  instagramAccounts: InstagramAccount[] = [];
  topInstagramAccounts: InstagramAccount[] = [];
  totalInstagramFollowers = 0;
  totalInstagramPosts = 0;
  totalInstagramViews = 0;
  totalInstagramLikes = 0;
  totalInstagramComments = 0;
  totalInstagramSaves = 0;

  constructor(private api: SsmApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadYoutubeChannels();
    this.loadInstagramAccounts();
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
        this.error = e?.message ?? 'Не удалось загрузить проекты';
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
        this.error = e?.message ?? 'Не удалось загрузить данные проекта';
        this.loadingInfo = false;
        this.cdr.detectChanges();
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

  private loadYoutubeChannels() {
    this.loadingChannels = true;
    this.channelsError = null;
    this.cdr.detectChanges();

    this.api.getYoutubeChannels().subscribe({
      next: (items) => {
        this.channels = items ?? [];
        this.totalChannelSubscribers = this.channels.reduce((sum, channel) => sum + channel.subs_count, 0);
        this.totalChannelViews = this.channels.reduce((sum, channel) => sum + channel.views_count, 0);
        this.totalChannelLikes = this.channels.reduce((sum, channel) => sum + channel.likes_count, 0);
        this.totalChannelComments = this.channels.reduce((sum, channel) => sum + channel.comments_count, 0);
        this.topChannels = [...this.channels]
          .sort((a, b) => b.views_count - a.views_count)
          .slice(0, 8);
        this.loadingChannels = false;
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.channelsError = e?.message ?? 'Не удалось загрузить данные по каналам';
        this.loadingChannels = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadInstagramAccounts() {
    this.loadingInstagram = true;
    this.instagramError = null;
    this.cdr.detectChanges();

    this.api.getInstagramAccounts().subscribe({
      next: (items) => {
        this.instagramAccounts = items ?? [];
        this.totalInstagramFollowers = this.instagramAccounts.reduce((sum, account) => sum + account.followers, 0);
        this.totalInstagramPosts = this.instagramAccounts.reduce((sum, account) => sum + account.posts, 0);
        this.totalInstagramViews = this.instagramAccounts.reduce((sum, account) => sum + account.views_total, 0);
        this.totalInstagramLikes = this.instagramAccounts.reduce((sum, account) => sum + account.likes_total, 0);
        this.totalInstagramComments = this.instagramAccounts.reduce((sum, account) => sum + account.comments_total, 0);
        this.totalInstagramSaves = this.instagramAccounts.reduce((sum, account) => sum + account.saved_total, 0);
        this.topInstagramAccounts = [...this.instagramAccounts]
          .sort((a, b) => b.followers - a.followers)
          .slice(0, 8);
        this.loadingInstagram = false;
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.instagramError = e?.message ?? 'Не удалось загрузить данные по Instagram';
        this.loadingInstagram = false;
        this.cdr.detectChanges();
      },
    });
  }
}
