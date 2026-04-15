import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import * as echarts from 'echarts';

@Component({
  selector: 'app-line-chart',
  standalone: true,
  templateUrl: './line-chart.html',
  styleUrl: './line-chart.scss',
})
export class LineChartComponent implements AfterViewInit {
  @ViewChild('chartEl', { static: true }) chartEl!: ElementRef<HTMLDivElement>;

  private chart?: echarts.ECharts;

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartEl.nativeElement, undefined, { renderer: 'canvas' });
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
      tooltip: {
        trigger: 'axis',
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
      grid: { left: 18, right: 18, top: 38, bottom: 18, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
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
          name: 'Пользователи',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: [120, 200, 150, 80, 70, 110, 230],
          lineStyle: { width: 3, color: line },
          itemStyle: { color: line },
          areaStyle: { opacity: 0.12, color: line },
        },
        {
          name: 'Выручка',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: [90, 140, 130, 110, 160, 190, 210],
          lineStyle: { width: 3, color: 'rgba(255,255,255,0.35)' },
          itemStyle: { color: 'rgba(255,255,255,0.35)' },
          areaStyle: { opacity: 0.06, color: 'rgba(255,255,255,0.35)' },
        },
      ],
    };

    this.chart?.setOption(option);
  }
}
