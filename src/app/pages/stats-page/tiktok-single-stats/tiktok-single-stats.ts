import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

import { TikTokTotal, TikTokAccountTotals } from '../../../shared/services/ssm-models';

@Component({
  selector: 'app-tiktok-single-stats',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './tiktok-single-stats.html',
  styleUrl: './tiktok-single-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TikTokSingleStatsComponent {
  @Input({ required: true }) total!: TikTokTotal;
  @Input({ required: true }) accounts: TikTokAccountTotals[] = [];

  fmt(value: number) {
    return Intl.NumberFormat('ru-RU').format(value);
  }

  fmtCompact(value: number) {
    return Intl.NumberFormat('ru-RU', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  tiktokUrl(url: string) {
    return url || '#';
  }

  updatedDate(dateStr: string) {
    if (!dateStr) return '—';
    return dateStr.slice(0, 10);
  }
}
