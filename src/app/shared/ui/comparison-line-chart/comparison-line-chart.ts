import { AfterViewInit, Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import * as echarts from 'echarts';

type ValueFormat = 'number' | 'percent' | 'decimal';

@Component({
  selector: 'app-comparison-line-chart',
  standalone: true,
  templateUrl: './comparison-line-chart.html',
  styleUrl: './comparison-line-chart.scss',
})
export class ComparisonLineChartComponent implements AfterViewInit, OnChanges {
  @Input() labels: string[] = [];
  @Input() seriesA: Array<number | null> = [];
  @Input() seriesB: Array<number | null> = [];
  @Input() nameA = 'Проект A';
  @Input() nameB = 'Проект B';
  @Input() format: ValueFormat = 'number';

  @ViewChild('chartEl', { static: true }) chartEl!: ElementRef<HTMLDivElement>;
  private chart?: echarts.ECharts;

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartEl.nativeElement);
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['labels'] || changes['seriesA'] || changes['seriesB'] || changes['nameA'] || changes['nameB']) {
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

  private formatValue(value: number | null | undefined) {
    const safeValue = Number(value) || 0;

    if (this.format === 'percent') {
      return `${safeValue.toFixed(2)}%`;
    }

    if (this.format === 'decimal') {
      return safeValue.toFixed(2);
    }

    return Intl.NumberFormat('ru-RU', {
      notation: Math.abs(safeValue) >= 1000 ? 'compact' : 'standard',
      maximumFractionDigits: 1,
    }).format(safeValue);
  }

  private axisLabel(value: number) {
    if (this.format === 'percent') {
      return `${value}%`;
    }

    if (this.format === 'decimal') {
      return value.toFixed(1);
    }

    return Intl.NumberFormat('ru-RU', {
      notation: Math.abs(value) >= 1000 ? 'compact' : 'standard',
      maximumFractionDigits: 1,
    }).format(value);
  }

  private render() {
    if (!this.chart) return;

    const grid = this.cssVar('--chart-grid') || 'rgba(255,255,255,0.08)';
    const axis = this.cssVar('--chart-axis') || 'rgba(255,255,255,0.10)';
    const text = this.cssVar('--chart-text') || 'rgba(255,255,255,0.70)';
    const colorA = this.cssVar('--compare-a') || '#4f8cff';
    const colorB = this.cssVar('--compare-b') || '#9b6bff';

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const index = params?.[0]?.dataIndex ?? 0;
          const label = this.labels[index] ?? `#${index + 1}`;
          const valueA = this.seriesA[index];
          const valueB = this.seriesB[index];

          return `
            <div style="min-width:220px">
              <div style="font-weight:800;margin-bottom:8px">${label}</div>
              <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:4px">
                <span style="color:${colorA}">${this.nameA}</span>
                <b>${this.formatValue(valueA)}</b>
              </div>
              <div style="display:flex;justify-content:space-between;gap:12px">
                <span style="color:${colorB}">${this.nameB}</span>
                <b>${this.formatValue(valueB)}</b>
              </div>
            </div>
          `;
        },
        backgroundColor: 'rgba(17,24,39,0.94)',
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
        itemWidth: 16,
        itemHeight: 10,
      },
      grid: { left: 18, right: 18, top: 42, bottom: 18, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: this.labels,
        axisLabel: { color: text },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: text, formatter: (value: number) => this.axisLabel(value) },
        splitLine: { lineStyle: { color: grid } },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { show: false },
      },
      series: [
        {
          name: this.nameA,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: this.seriesA,
          lineStyle: { width: 3, color: colorA },
          itemStyle: { color: colorA },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${colorA}55` },
              { offset: 1, color: `${colorA}05` },
            ]),
          },
        },
        {
          name: this.nameB,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: this.seriesB,
          lineStyle: { width: 3, color: colorB },
          itemStyle: { color: colorB },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${colorB}40` },
              { offset: 1, color: `${colorB}05` },
            ]),
          },
        },
      ],
    };

    this.chart.setOption(option, true);
  }
}
