import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

import { EpisodesChartComponent } from '../../../shared/ui/episodes-chart/episodes-chart';
import { EngagementChartComponent } from '../../../shared/ui/engagement-chart/engagement-chart';
import { EpisodeInfo } from '../../../shared/services/ssm-models';

@Component({
  selector: 'app-youtube-single-stats',
  standalone: true,
  imports: [NgFor, NgIf, EpisodesChartComponent, EngagementChartComponent],
  templateUrl: './youtube-single-stats.html',
  styleUrl: './youtube-single-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YoutubeSingleStatsComponent {
  @Input({ required: true }) headline = '';
  @Input({ required: true }) episodes: EpisodeInfo[] = [];
  @Input({ required: true }) totalViews = 0;
  @Input({ required: true }) totalLikes = 0;
  @Input({ required: true }) totalComments = 0;
  @Input({ required: true }) avgViews = 0;
  @Input({ required: true }) engagementRate = 0;
  @Input({ required: true }) topEpisodes: EpisodeInfo[] = [];
  @Input({ required: true }) loadingInfo = false;

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
    return [...(this.episodes ?? [])].sort((a, b) => this.dateLabel(a).localeCompare(this.dateLabel(b)));
  }
}
