import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YandexVisitsChartComponent } from './yandex-visits-chart';

describe('YandexVisitsChartComponent', () => {
  let component: YandexVisitsChartComponent;
  let fixture: ComponentFixture<YandexVisitsChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YandexVisitsChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(YandexVisitsChartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
