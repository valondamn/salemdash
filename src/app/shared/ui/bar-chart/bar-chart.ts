import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import * as echarts from 'echarts';

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.scss',
})
export class BarChartComponent implements AfterViewInit {
  @ViewChild('chartEl', { static: true }) chartEl!: ElementRef<HTMLDivElement>;
  private chart?: echarts.ECharts;

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartEl.nativeElement);
    this.setOption();
  }

  @HostListener('window:resize')
  onResize() {
    this.chart?.resize();
  }

  private cssVar(name: string) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  private setOption() {
    const line = this.cssVar('--chart-line') || '#5b8cff';
    const grid = this.cssVar('--chart-grid') || 'rgba(255,255,255,0.08)';
    const axis = this.cssVar('--chart-axis') || 'rgba(255,255,255,0.10)';
    const text = this.cssVar('--chart-text') || 'rgba(255,255,255,0.70)';

    const option: echarts.EChartsOption = {
      tooltip: { trigger: 'axis' },
      grid: { left: 18, right: 18, top: 18, bottom: 18, containLabel: true },
      xAxis: {
        type: 'category',
        data: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        axisLabel: { color: text },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: text },
        splitLine: { lineStyle: { color: grid } },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          name: 'Сессии',
          data: [320, 280, 410, 360, 390, 460, 520],
          itemStyle: { color: line, opacity: 0.9 },
          barWidth: 18,
          emphasis: { itemStyle: { opacity: 1 } },
        },
      ],
    };

    this.chart?.setOption(option);
  }
}
