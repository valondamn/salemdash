import { AfterViewInit, Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import * as echarts from 'echarts';
import { InstagramAccount } from '../../services/ssm-api.service';

@Component({
  selector: 'app-instagram-totals-bar-chart',
  standalone: true,
  templateUrl: './instagram-totals-bar-chart.html',
  styleUrl: './instagram-totals-bar-chart.scss',
})
export class InstagramTotalsBarChartComponent implements AfterViewInit, OnChanges {
  @Input() account: InstagramAccount | null = null;

  @ViewChild('chartEl', { static: true }) chartEl!: ElementRef<HTMLDivElement>;
  private chart?: echarts.ECharts;

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartEl.nativeElement);
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['account']) this.render();
  }

  @HostListener('window:resize')
  onResize() {
    this.chart?.resize();
  }

  private cssVar(name: string) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  private fmtCompact(value: number) {
    return Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }

  private render() {
    if (!this.chart) return;

    const account = this.account;
    const grid = this.cssVar('--chart-grid') || 'rgba(255,255,255,0.08)';
    const axis = this.cssVar('--chart-axis') || 'rgba(255,255,255,0.10)';
    const text = this.cssVar('--chart-text') || 'rgba(255,255,255,0.70)';
    const accent = this.cssVar('--compare-a') || '#4f8cff';

    const labels = ['Просмотры', 'Лайки', 'Комментарии', 'Сохранения'];
    const values = account
      ? [account.views_total, account.likes_total, account.comments_total, account.saved_total]
      : [0, 0, 0, 0];

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: unknown) => this.fmtCompact(Number(value) || 0),
        backgroundColor: 'rgba(17,24,39,0.92)',
        borderColor: axis,
        borderWidth: 1,
        textStyle: { color: 'rgba(255,255,255,0.92)' },
      },
      grid: { left: 18, right: 18, top: 18, bottom: 18, containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: text },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: text, formatter: (value: number) => this.fmtCompact(value) },
        splitLine: { lineStyle: { color: grid } },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          name: 'Итого',
          data: values,
          barWidth: 18,
          itemStyle: {
            color: accent,
            opacity: 0.9,
            borderRadius: [10, 10, 0, 0],
          },
        },
      ],
    };

    this.chart.setOption(option, true);
  }
}
