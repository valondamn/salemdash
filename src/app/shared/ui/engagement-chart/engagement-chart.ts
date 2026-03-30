import { AfterViewInit, Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import * as echarts from 'echarts';
import { EpisodeInfo } from '../../services/ssm-api.service';

@Component({
  selector: 'app-engagement-chart',
  standalone: true,
  templateUrl: './engagement-chart.html',
  styleUrl: './engagement-chart.scss',
})
export class EngagementChartComponent implements AfterViewInit, OnChanges {
  @Input() episodes: EpisodeInfo[] = [];

  @ViewChild('chartEl', { static: true }) chartEl!: ElementRef<HTMLDivElement>;
  private chart?: echarts.ECharts;

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartEl.nativeElement);
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['episodes']) this.render();
  }

  @HostListener('window:resize')
  onResize() {
    this.chart?.resize();
  }

  private cssVar(name: string) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  private toNum(v: any): number {
    return Number(v) || 0;
  }

  private pickDate(e: EpisodeInfo): string {
    return (e.youtube_release_date || e.release_date || '').slice(0, 10);
  }

  private render() {
    if (!this.chart) return;

    const grid = this.cssVar('--chart-grid') || 'rgba(255,255,255,0.08)';
    const axis = this.cssVar('--chart-axis') || 'rgba(255,255,255,0.10)';
    const text = this.cssVar('--chart-text') || 'rgba(255,255,255,0.70)';
    const accent = this.cssVar('--chart-line') || '#5b8cff';

    const list = [...(this.episodes ?? [])]
      .sort((a, b) => this.pickDate(a).localeCompare(this.pickDate(b)));

    const x = list.map((_, i) => `#${i + 1}`);
    const rate = list.map((e) => {
      const v = this.toNum(e.youtube_views);
      const l = this.toNum(e.youtube_likes);
      const c = this.toNum(e.youtube_comments);
      return v ? ((l + c) / v) * 100 : 0;
    });

    const option: echarts.EChartsOption = {
      tooltip: { trigger: 'axis', valueFormatter: (v: any) => `${Number(v).toFixed(2)}%` },
      grid: { left: 18, right: 18, top: 18, bottom: 18, containLabel: true },
      xAxis: {
        type: 'category',
        data: x,
        axisLabel: { color: text },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: text, formatter: (v: any) => `${v}%` },
        splitLine: { lineStyle: { color: grid } },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },
      series: [
        {
          name: 'Engagement %',
          type: 'bar',
          data: rate,
          barWidth: 12,
          itemStyle: { color: accent, opacity: 0.85 },
        },
      ],
    };

    this.chart.setOption(option, true);
  }
}
