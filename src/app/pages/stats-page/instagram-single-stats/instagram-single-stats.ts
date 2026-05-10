import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { InstagramEngagementPieChartComponent } from '../../../shared/ui/instagram-engagement-pie-chart/instagram-engagement-pie-chart';
import { InstagramAccount } from '../../../shared/services/ssm-models';

@Component({
  selector: 'app-instagram-single-stats',
  standalone: true,
  imports: [InstagramEngagementPieChartComponent],
  templateUrl: './instagram-single-stats.html',
  styleUrl: './instagram-single-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstagramSingleStatsComponent {
  @Input({ required: true }) headline = '';
  @Input({ required: true }) account!: InstagramAccount;

  fmt(value: number) {
    return Intl.NumberFormat('ru-RU').format(value);
  }

  fmtCompact(value: number) {
    return Intl.NumberFormat('ru-RU', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  formatDecimal(value: number) {
    return Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  instagramUrl(username: string) {
    return username ? `https://www.instagram.com/${username}/` : '#';
  }
}
