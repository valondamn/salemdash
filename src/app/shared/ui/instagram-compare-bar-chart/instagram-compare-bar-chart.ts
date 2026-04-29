import { AfterViewInit, Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import * as echarts from 'echarts';
import { InstagramAccount } from '../../services/ssm-api.service';

@Component({
  selector: 'app-instagram-compare-bar-chart',
  standalone: true,
  templateUrl: './instagram-compare-bar-chart.html',
  styleUrl: './instagram-compare-bar-chart.scss',
})
export class InstagramCompareBarChartComponent implements AfterViewInit, OnChanges {
  @Input() accountA: InstagramAccount | null = null;
  @Input() accountB: InstagramAccount | null = null;
  @Input() nameA = 'Аккаунт A';
  @Input() nameB = 'Аккаунт B';

  @ViewChild('chartEl', { static: true }) chartEl!: ElementRef<HTMLDivElement>;
  private chart?: echarts.ECharts;

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartEl.nativeElement);
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['accountA'] || changes['accountB'] || changes['nameA'] || changes['nameB']) this.render();
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

    const grid = this.cssVar('--chart-grid') || 'rgba(255,255,255,0.08)';
    const axis = this.cssVar('--chart-axis') || 'rgba(255,255,255,0.10)';
    const text = this.cssVar('--chart-text') || 'rgba(255,255,255,0.70)';
    const colorA = this.cssVar('--compare-a') || '#4f8cff';
    const colorB = this.cssVar('--compare-b') || '#9b6bff';

    const labels = ['Подписчики', 'Просмотры', 'Лайки', 'Комментарии', 'Сохранения'];
    const seriesA = this.accountA
      ? [
          this.accountA.followers,
          this.accountA.views_total,
          this.accountA.likes_total,
          this.accountA.comments_total,
          this.accountA.saved_total,
        ]
      : [0, 0, 0, 0, 0];
    const seriesB = this.accountB
      ? [
          this.accountB.followers,
          this.accountB.views_total,
          this.accountB.likes_total,
          this.accountB.comments_total,
          this.accountB.saved_total,
        ]
      : [0, 0, 0, 0, 0];

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(17,24,39,0.92)',
        borderColor: axis,
        borderWidth: 1,
        textStyle: { color: 'rgba(255,255,255,0.92)' },
      },
      legend: {
        top: 0,
        left: 0,
        textStyle: { color: text },
        icon: 'roundRect',
      },
      grid: { left: 18, right: 18, top: 42, bottom: 18, containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: text, interval: 0 },
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
          name: this.nameA,
          type: 'bar',
          data: seriesA,
          itemStyle: { color: colorA, opacity: 0.88, borderRadius: [10, 10, 0, 0] },
          barWidth: 16,
        },
        {
          name: this.nameB,
          type: 'bar',
          data: seriesB,
          itemStyle: { color: colorB, opacity: 0.82, borderRadius: [10, 10, 0, 0] },
          barWidth: 16,
        },
      ],
    };

    this.chart.setOption(option, true);
  }
}
