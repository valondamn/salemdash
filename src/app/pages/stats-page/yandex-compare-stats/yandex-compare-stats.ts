import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

import { ComparisonLineChartComponent } from '../../../shared/ui/comparison-line-chart/comparison-line-chart';
import { CompareMetricRow } from '../stats.models';

@Component({
  selector: 'app-yandex-compare-stats',
  standalone: true,
  imports: [NgFor, ComparisonLineChartComponent],
  templateUrl: './yandex-compare-stats.html',
  styleUrl: './yandex-compare-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YandexCompareStatsComponent {
  @Input({ required: true }) rows: CompareMetricRow[] = [];
  @Input({ required: true }) labels: string[] = [];
  @Input({ required: true }) totalSeriesA: Array<number | null> = [];
  @Input({ required: true }) totalSeriesB: Array<number | null> = [];
  @Input({ required: true }) kzSeriesA: Array<number | null> = [];
  @Input({ required: true }) kzSeriesB: Array<number | null> = [];
  @Input({ required: true }) primaryLabel = '';
  @Input({ required: true }) secondaryLabel = '';
  @Input({ required: true }) summary = '';

  trackByMetric = (_: number, row: CompareMetricRow) => row.key;

  formatMetricValue(value: number, format: CompareMetricRow['format'], compact = false) {
    if (format === 'decimal') {
      return Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    }

    if (compact) {
      return Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    }

    return Intl.NumberFormat('ru-RU').format(value);
  }

  formatDelta(row: CompareMetricRow) {
    if (row.delta == null) {
      return row.winner === 'a' ? 'Новый лидер' : '—';
    }

    const sign = row.delta > 0 ? '+' : '';
    return `${sign}${row.delta.toFixed(1)}%`;
  }

  barWidth(value: number, otherValue: number) {
    const max = Math.max(value, otherValue, 1);
    return (value / max) * 100;
  }
}
