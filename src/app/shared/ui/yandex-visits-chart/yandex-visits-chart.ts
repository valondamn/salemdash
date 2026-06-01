import { AfterViewInit, Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import * as echarts from 'echarts';
import { YandexProjectUrlMetric } from '../../services/ssm-models';

@Component({
  selector: 'app-yandex-visits-chart',
  standalone: true,
  templateUrl: './yandex-visits-chart.html',
  styleUrl: './yandex-visits-chart.scss',
})
export class YandexVisitsChartComponent implements AfterViewInit, OnChanges {
  @Input() items: YandexProjectUrlMetric[] = [];
  @Input() label: string = '';

  @ViewChild('chartEl', { static: true }) chartEl!: ElementRef<HTMLDivElement>;
  private chart?: echarts.ECharts;

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartEl.nativeElement);
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] || changes['label']) this.render();
  }

  @HostListener('window:resize')
  onResize() {
    this.chart?.resize();
  }

  private cssVar(name: string) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  private fmtCompact(n: number) {
    return Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  }

  private render() {
    if (!this.chart) return;

    const grid = this.cssVar('--chart-grid') || 'rgba(255,255,255,0.08)';
    const axis = this.cssVar('--chart-axis') || 'rgba(255,255,255,0.10)';
    const text = this.cssVar('--chart-text') || 'rgba(255,255,255,0.70)';
    const accent = this.cssVar('--chart-line') || '#22d3ee';
    const accentSecondary = this.cssVar('--chart-success') || '#22c55e';

    const list = [...(this.items ?? [])]
      .sort((a, b) => (b.count - a.count))
      .slice(0, 12);

    const x = list.map((item, i) => item.name || `#${i + 1}`);
    const visits = list.map(item => Number(item.count) || 0);
    const users = list.map(item => Number(item.kz_count) || 0);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const i = params?.[0]?.dataIndex ?? 0;
          return `
            <div style="min-width:180px">
              <div style="font-weight:800;margin-bottom:6px">${this.label || 'project'} • ${x[i]}</div>
              <div>KZ: <b>${this.fmtCompact(users[i] ?? 0)}</b></div>
              <div>Total: <b>${this.fmtCompact(visits[i] ?? 0)}</b></div>
            </div>
          `;
        },
        backgroundColor: 'rgba(17,24,39,0.92)',
        borderColor: axis,
        borderWidth: 1,
        textStyle: { color: 'rgba(255,255,255,0.92)' },
        axisPointer: { type: 'line', lineStyle: { color: axis } },
      },
      legend: {
        top: 0,
        left: 0,
        textStyle: { color: text },
        icon: 'roundRect',
        itemWidth: 14,
        itemHeight: 8,
      },
      grid: { left: 18, right: 18, top: 36, bottom: 18, containLabel: true },
      xAxis: {
        type: 'category',
        data: x,
        axisLabel: { color: text },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Total',
          axisLabel: { color: text, formatter: (v: any) => this.fmtCompact(Number(v) || 0) },
          splitLine: { lineStyle: { color: grid } },
          axisLine: { lineStyle: { color: axis } },
          axisTick: { show: false },
        },
        {
          type: 'value',
          name: 'KZ',
          axisLabel: { color: text, formatter: (v: any) => this.fmtCompact(Number(v) || 0) },
          splitLine: { show: false },
          axisLine: { lineStyle: { color: axis } },
          axisTick: { show: false },
        }
      ],
      series: [
        {
          name: 'Total',
          type: 'bar',
          data: visits,
          barWidth: 12,
          itemStyle: { color: accent, opacity: 0.8, borderRadius: [10, 10, 0, 0] },
        },
        {
          name: 'KZ',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          data: users,
          lineStyle: { width: 3, color: accentSecondary },
          itemStyle: { color: accentSecondary },
        },
      ],
    };

    this.chart.setOption(option, true);
  }
}
