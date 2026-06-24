import { AfterViewInit, Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import * as echarts from 'echarts';

import { YoutubeReleaseMetric } from '../../services/ssm-models';

@Component({
  selector: 'app-project-period-line-chart',
  standalone: true,
  templateUrl: './project-period-line-chart.html',
  styleUrl: './project-period-line-chart.scss',
})
export class ProjectPeriodLineChartComponent implements AfterViewInit, OnChanges {
  @Input() items: YoutubeReleaseMetric[] = [];

  @ViewChild('chartEl', { static: true }) chartEl!: ElementRef<HTMLDivElement>;
  private chart?: echarts.ECharts;

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartEl.nativeElement);
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.render();
    }
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

    const line = this.cssVar('--chart-line') || '#22d3ee';
    const accent = this.cssVar('--chart-danger') || '#fb7185';
    const warm = this.cssVar('--chart-warm') || '#f59e0b';
    const grid = this.cssVar('--chart-grid') || 'rgba(255,255,255,0.08)';
    const axis = this.cssVar('--chart-axis') || 'rgba(255,255,255,0.10)';
    const text = this.cssVar('--chart-text') || 'rgba(255,255,255,0.70)';

    const rows = [...(this.items ?? [])].sort((a, b) => a.metric_date.localeCompare(b.metric_date));
    const dates = rows.map((item) => item.metric_date || '—');
    const views = rows.map((item) => item.views);
    const likes = rows.map((item) => item.likes);
    const comments = rows.map((item) => item.comments);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(17,24,39,0.94)',
        borderColor: axis,
        borderWidth: 1,
        textStyle: { color: 'rgba(255,255,255,0.92)' },
        axisPointer: { type: 'line', lineStyle: { color: axis } },
        formatter: (params: any) => {
          const i = params?.[0]?.dataIndex ?? 0;
          return `
            <div style="min-width:180px">
              <div style="font-weight:800;margin-bottom:8px">${dates[i] ?? '—'}</div>
              <div>Просмотры: <b>${this.fmtCompact(views[i] ?? 0)}</b></div>
              <div>Лайки: <b>${this.fmtCompact(likes[i] ?? 0)}</b></div>
              <div>Комментарии: <b>${this.fmtCompact(comments[i] ?? 0)}</b></div>
            </div>
          `;
        },
      },
      legend: {
        top: 0,
        left: 0,
        textStyle: { color: text },
        icon: 'roundRect',
        itemWidth: 14,
        itemHeight: 8,
      },
      grid: { left: 18, right: 54, top: 42, bottom: 22, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: { color: text },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Просмотры',
          nameTextStyle: { color: text, fontSize: 10 },
          axisLabel: { color: text, formatter: (val: number) => this.fmtCompact(val) },
          splitLine: { lineStyle: { color: grid } },
          axisLine: { lineStyle: { color: axis } },
          axisTick: { show: false },
        },
        {
          type: 'value',
          name: 'Реакции',
          nameTextStyle: { color: text, fontSize: 10 },
          position: 'right',
          axisLabel: { color: text, formatter: (val: number) => this.fmtCompact(val) },
          splitLine: { show: false },
          axisLine: { lineStyle: { color: axis } },
          axisTick: { show: false },
        },
      ],
      series: [
        {
          name: 'Просмотры',
          type: 'line',
          yAxisIndex: 0,
          smooth: true,
          showSymbol: rows.length <= 12,
          data: views,
          lineStyle: { width: 3, color: line },
          itemStyle: { color: line },
          areaStyle: {
            opacity: 0.16,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(34,211,238,0.28)' },
              { offset: 1, color: 'rgba(34,211,238,0.02)' },
            ]),
          },
        },
        {
          name: 'Лайки',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          data: likes,
          lineStyle: { width: 2, color: accent },
          itemStyle: { color: accent },
        },
        {
          name: 'Комментарии',
          type: 'bar',
          yAxisIndex: 1,
          data: comments,
          itemStyle: { color: warm, opacity: 0.76 },
          barWidth: 10,
        },
      ],
    };

    this.chart.setOption(option, true);
  }
}
