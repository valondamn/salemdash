import { AfterViewInit, Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import * as echarts from 'echarts';
import { InstagramAccount } from '../../services/ssm-api.service';

@Component({
  selector: 'app-instagram-per-post-line-chart',
  standalone: true,
  templateUrl: './instagram-per-post-line-chart.html',
  styleUrl: './instagram-per-post-line-chart.scss',
})
export class InstagramPerPostLineChartComponent implements AfterViewInit, OnChanges {
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

  private avg(total: number, posts: number) {
    return posts > 0 ? total / posts : 0;
  }

  private fmt(value: number) {
    return Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value);
  }

  private render() {
    if (!this.chart) return;

    const account = this.account;
    const posts = account?.posts || 0;
    const grid = this.cssVar('--chart-grid') || 'rgba(255,255,255,0.08)';
    const axis = this.cssVar('--chart-axis') || 'rgba(255,255,255,0.10)';
    const text = this.cssVar('--chart-text') || 'rgba(255,255,255,0.70)';
    const accent = this.cssVar('--accent-violet') || '#9b6bff';

    const labels = ['Просмотры / пост', 'Лайки / пост', 'Комментарии / пост', 'Сохранения / пост'];
    const values = account
      ? [
          this.avg(account.views_total, posts),
          this.avg(account.likes_total, posts),
          this.avg(account.comments_total, posts),
          this.avg(account.saved_total, posts),
        ]
      : [0, 0, 0, 0];

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: unknown) => this.fmt(Number(value) || 0),
        backgroundColor: 'rgba(17,24,39,0.92)',
        borderColor: axis,
        borderWidth: 1,
        textStyle: { color: 'rgba(255,255,255,0.92)' },
        axisPointer: { type: 'line', lineStyle: { color: axis } },
      },
      grid: { left: 18, right: 18, top: 18, bottom: 18, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLabel: { color: text, interval: 0 },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: text, formatter: (value: number) => this.fmt(value) },
        splitLine: { lineStyle: { color: grid } },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },
      series: [
        {
          name: 'Среднее на пост',
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbolSize: 8,
          data: values,
          lineStyle: { width: 3, color: accent },
          itemStyle: { color: accent },
          areaStyle: { color: `${accent}22` },
        },
      ],
    };

    this.chart.setOption(option, true);
  }
}
