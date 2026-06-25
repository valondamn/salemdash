import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

import { TikTokAccountTotals } from '../../../shared/services/ssm-models';
import { CompareMetricRow } from '../stats.models';

@Component({
  selector: 'app-tiktok-compare-stats',
  standalone: true,
  imports: [NgFor],
  templateUrl: './tiktok-compare-stats.html',
  styleUrl: './tiktok-compare-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TikTokCompareStatsComponent {
  @Input({ required: true }) rows: CompareMetricRow[] = [];
  @Input({ required: true }) accountA: TikTokAccountTotals | null = null;
  @Input({ required: true }) accountB: TikTokAccountTotals | null = null;
  @Input({ required: true }) primaryLabel = '';
  @Input({ required: true }) secondaryLabel = '';
  @Input({ required: true }) summary = '';

  trackByMetric = (_: number, row: CompareMetricRow) => row.key;

  formatMetricValue(value: number, _format: CompareMetricRow['format'], compact = false) {
    if (compact) {
      return Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    }
    return Intl.NumberFormat('ru-RU').format(value);
  }

  formatDelta(row: CompareMetricRow) {
    if (row.delta == null) return row.winner === 'a' ? 'Новый лидер' : '—';
    const sign = row.delta > 0 ? '+' : '';
    return `${sign}${row.delta.toFixed(1)}%`;
  }

  barWidth(value: number, otherValue: number) {
    const max = Math.max(value, otherValue, 1);
    return (value / max) * 100;
  }

  tiktokUrl(url: string) {
    return url || '#';
  }
}
