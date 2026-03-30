import { AfterViewInit, Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import * as echarts from 'echarts';
import { EpisodeInfo } from '../../services/ssm-api.service';

@Component({
  selector: 'app-episodes-chart',
  standalone: true,
  templateUrl: './episodes-chart.html',
  styleUrl: './episodes-chart.scss',
})
export class EpisodesChartComponent implements AfterViewInit, OnChanges {
  @Input() episodes: EpisodeInfo[] = [];

  @ViewChild('chartEl', { static: true }) chartEl!: ElementRef<HTMLDivElement>;
  private chart?: echarts.ECharts;

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartEl.nativeElement);
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['episodes']) {
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

  private toNum(v: any): number {
    return Number(v) || 0;
  }

  private pickDate(e: EpisodeInfo): string {
    // берём то, что есть
    return (e.youtube_release_date || e.release_date || '').slice(0, 10);
  }

  private shortTitle(title: string, max = 22) {
    const t = (title || '').trim();
    if (!t) return '';
    return t.length > max ? t.slice(0, max - 1) + '…' : t;
  }

  private fmtCompact(n: number) {
    return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  }

  private label(_: EpisodeInfo, idx: number): string {
    return `#${idx + 1}`;
  }

  private render() {
    if (!this.chart) return;

    const line = this.cssVar('--chart-line') || '#5b8cff';
    const grid = this.cssVar('--chart-grid') || 'rgba(255,255,255,0.08)';
    const axis = this.cssVar('--chart-axis') || 'rgba(255,255,255,0.10)';
    const text = this.cssVar('--chart-text') || 'rgba(255,255,255,0.70)';

    const list = [...(this.episodes ?? [])]
      .sort((a, b) => this.pickDate(a).localeCompare(this.pickDate(b)));

    const x = list.map((e, i) => this.label(e, i));
    const views = list.map((e) => this.toNum(e.youtube_views));
    const likes = list.map((e) => this.toNum(e.youtube_likes));
    const comments = list.map((e) => this.toNum(e.youtube_comments));
    const titles = list.map((e) => e.episode_name || '—');
    const dates = list.map((e) => this.pickDate(e) || '—');

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          // params — массив серий в точке
          const i = params?.[0]?.dataIndex ?? 0;

          const title = titles[i] ?? '—';
          const date = dates[i] ?? '—';

          const v = views[i] ?? 0;
          const l = likes[i] ?? 0;
          const c = comments[i] ?? 0;

          return `
        <div style="max-width:360px">
          <div style="font-weight:800;margin-bottom:6px">${this.shortTitle(title, 60)}</div>
          <div style="opacity:.75;margin-bottom:8px">${date}</div>
          <div>👁️ Views: <b>${this.fmtCompact(v)}</b></div>
          <div>👍 Likes: <b>${this.fmtCompact(l)}</b></div>
          <div>💬 Comments: <b>${this.fmtCompact(c)}</b></div>
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
      },

      grid: { left: 18, right: 18, top: 36, bottom: 18, containLabel: true },

      xAxis: {
        type: 'category',
        data: x,
        axisLabel: { color: text },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },

      yAxis: {
        type: 'value',
        axisLabel: {
          color: text,
          formatter: (val: number) => this.fmtCompact(val),
        },
        splitLine: { lineStyle: { color: grid } },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },

      series: [
        {
          name: 'Views',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: views,
          lineStyle: { width: 3, color: line },
          itemStyle: { color: line },
          areaStyle: { opacity: 0.12, color: line },
        },
        {
          name: 'Likes',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: likes,
          lineStyle: { width: 2, color: 'rgba(255,255,255,0.45)' },
          itemStyle: { color: 'rgba(255,255,255,0.45)' },
          areaStyle: { opacity: 0.06, color: 'rgba(255,255,255,0.45)' },
        },
        {
          name: 'Comments',
          type: 'bar',
          data: comments,
          itemStyle: { color: 'rgba(255,255,255,0.22)' },
          barWidth: 10,
        },
      ],
    };

    this.chart.setOption(option, true);


  }
}
