import { AfterViewInit, Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import * as echarts from 'echarts';
import { InstagramAccount } from '../../services/ssm-api.service';

@Component({
  selector: 'app-instagram-engagement-pie-chart',
  standalone: true,
  templateUrl: './instagram-engagement-pie-chart.html',
  styleUrl: './instagram-engagement-pie-chart.scss',
})
export class InstagramEngagementPieChartComponent implements AfterViewInit, OnChanges {
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

  private fmt(value: number) {
    return Intl.NumberFormat('ru-RU').format(value);
  }

  private render() {
    if (!this.chart) return;

    const account = this.account;
    const axis = this.cssVar('--chart-axis') || 'rgba(255,255,255,0.10)';
    const text = this.cssVar('--chart-text') || 'rgba(255,255,255,0.70)';
    const rose = this.cssVar('--accent-rose') || '#fb7185';
    const cyan = this.cssVar('--accent-cyan') || '#22d3ee';
    const emerald = this.cssVar('--accent-emerald') || '#22c55e';

    const data = [
      { value: account?.likes_total || 0, name: 'Лайки', itemStyle: { color: rose } },
      { value: account?.comments_total || 0, name: 'Комментарии', itemStyle: { color: cyan } },
      { value: account?.saved_total || 0, name: 'Сохранения', itemStyle: { color: emerald } },
    ];

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => `${params.name}: <b>${this.fmt(Number(params.value) || 0)}</b> (${params.percent}%)`,
        backgroundColor: 'rgba(17,24,39,0.92)',
        borderColor: axis,
        borderWidth: 1,
        textStyle: { color: 'rgba(255,255,255,0.92)' },
      },
      legend: {
        bottom: 0,
        left: 'center',
        textStyle: { color: text },
        icon: 'roundRect',
      },
      series: [
        {
          type: 'pie',
          radius: ['48%', '72%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          label: {
            color: text,
            formatter: '{b}\n{d}%',
          },
          labelLine: {
            lineStyle: { color: 'rgba(255,255,255,0.18)' },
          },
          data,
        },
      ],
    };

    this.chart.setOption(option, true);
  }
}
