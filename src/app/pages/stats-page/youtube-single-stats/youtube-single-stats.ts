import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EpisodesChartComponent } from '../../../shared/ui/episodes-chart/episodes-chart';
import { EngagementChartComponent } from '../../../shared/ui/engagement-chart/engagement-chart';
import { EpisodeInfo } from '../../../shared/services/ssm-models';

@Component({
  selector: 'app-youtube-single-stats',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, EpisodesChartComponent, EngagementChartComponent],
  templateUrl: './youtube-single-stats.html',
  styleUrl: './youtube-single-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YoutubeSingleStatsComponent implements OnChanges {
  @Input({ required: true }) headline = '';
  @Input({ required: true }) episodes: EpisodeInfo[] = [];
  /**
   * Real "views/likes/comments gained during the selected period", sourced from
   * the daily releases feed. Null when no period is applied yet, or the range
   * predates the daily-metrics retention window — in that case totals fall back
   * to summing each episode's lifetime YouTubeViews/Likes/Comments below.
   */
  @Input() periodTotals: { views: number; likes: number; comments: number } | null = null;
  @Input({ required: true }) loadingInfo = false;

  selectedChannel = 'all';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['episodes'] && this.selectedChannel !== 'all') {
      if (!this.availableChannels.includes(this.selectedChannel)) {
        this.selectedChannel = 'all';
      }
    }
  }

  get availableChannels(): string[] {
    return [...new Set(
      (this.episodes ?? [])
        .map(e => e.youtube_channel)
        .filter((c): c is string => !!c)
    )].sort();
  }

  get hasMultipleChannels(): boolean {
    return this.availableChannels.length > 1;
  }

  get filteredEpisodes(): EpisodeInfo[] {
    if (this.selectedChannel === 'all') return this.episodes ?? [];
    return (this.episodes ?? []).filter(e => e.youtube_channel === this.selectedChannel);
  }

  /**
   * Period totals are aggregated at the whole-project level (the daily feed
   * doesn't break metrics down by channel), so they only apply while viewing
   * "all channels". Filtering to a single channel falls back to lifetime sums
   * for that channel's episodes, since a per-channel period figure isn't available.
   */
  get usingPeriodTotals(): boolean {
    return !!this.periodTotals && this.selectedChannel === 'all';
  }

  get totalViews(): number {
    if (this.usingPeriodTotals) return this.periodTotals!.views;
    return this.filteredEpisodes.reduce((sum, e) => sum + (Number(e.youtube_views) || 0), 0);
  }

  get totalLikes(): number {
    if (this.usingPeriodTotals) return this.periodTotals!.likes;
    return this.filteredEpisodes.reduce((sum, e) => sum + (Number(e.youtube_likes) || 0), 0);
  }

  get totalComments(): number {
    if (this.usingPeriodTotals) return this.periodTotals!.comments;
    return this.filteredEpisodes.reduce((sum, e) => sum + (Number(e.youtube_comments) || 0), 0);
  }

  get totalsHint(): string {
    return this.usingPeriodTotals ? 'за выбранный период' : 'суммарно за всё время';
  }

  get avgViews(): number {
    const eps = this.filteredEpisodes;
    return eps.length ? Math.round(this.totalViews / eps.length) : 0;
  }

  get engagementRate(): number {
    return this.totalViews
      ? ((this.totalLikes + this.totalComments) / this.totalViews) * 100
      : 0;
  }

  get topEpisodes(): EpisodeInfo[] {
    return [...this.filteredEpisodes]
      .sort((a, b) => (Number(b.youtube_views) || 0) - (Number(a.youtube_views) || 0))
      .slice(0, 5);
  }

  fmt(value: number) {
    return Intl.NumberFormat('ru-RU').format(value);
  }

  fmtCompact(value: number) {
    return Intl.NumberFormat('ru-RU', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  formatMetricValue(value: number) {
    return `${Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}%`;
  }

  dateLabel(episode: EpisodeInfo) {
    return (episode.youtube_release_date || episode.release_date || '').slice(0, 10) || '—';
  }

  rowTitle(episode: EpisodeInfo) {
    return episode.episode_name || episode.youtube_id || '—';
  }

  hasTitle(episode: EpisodeInfo) {
    return !!episode.episode_name;
  }

  youtubeUrl(episode: EpisodeInfo) {
    return episode.youtube_id
      ? `https://www.youtube.com/watch?v=${episode.youtube_id}`
      : null;
  }

  rowMeta(episode: EpisodeInfo) {
    const date = this.dateLabel(episode);
    const source = episode.youtube_channel || episode.project_name || 'YouTube';
    return `${date} · ${source}`;
  }

  sortedEpisodes() {
    return [...this.filteredEpisodes].sort((a, b) => this.dateLabel(a).localeCompare(this.dateLabel(b)));
  }
}
