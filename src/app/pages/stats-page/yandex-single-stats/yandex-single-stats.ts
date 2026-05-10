import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { YandexVisitsChartComponent } from '../../../shared/ui/yandex-visits-chart/yandex-visits-chart';
import { UnifiedVisitsRow } from '../../../shared/services/ssm-models';

@Component({
  selector: 'app-yandex-single-stats',
  standalone: true,
  imports: [YandexVisitsChartComponent],
  templateUrl: './yandex-single-stats.html',
  styleUrl: './yandex-single-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YandexSingleStatsComponent {
  @Input({ required: true }) headline = '';
  @Input({ required: true }) slugLabel = '';
  @Input({ required: true }) users = 0;
  @Input({ required: true }) visits = 0;
  @Input({ required: true }) visitsPerUser = 0;
  @Input({ required: true }) rows: UnifiedVisitsRow[] = [];
  @Input({ required: true }) slug = '';

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
}
