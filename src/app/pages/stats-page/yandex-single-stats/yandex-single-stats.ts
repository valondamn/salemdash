import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { YandexVisitsChartComponent } from '../../../shared/ui/yandex-visits-chart/yandex-visits-chart';
import { YandexProjectUrlMetric } from '../../../shared/services/ssm-models';

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
  @Input({ required: true }) projectName = '';
  @Input({ required: true }) totalCount = 0;
  @Input({ required: true }) totalKzCount = 0;
  @Input({ required: true }) urlCount = 0;
  @Input({ required: true }) items: YandexProjectUrlMetric[] = [];

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

  get avgPerUrl() {
    return this.urlCount ? this.totalCount / this.urlCount : 0;
  }

  get avgKzPerUrl() {
    return this.urlCount ? this.totalKzCount / this.urlCount : 0;
  }
}
