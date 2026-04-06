import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YandexVisitsChart } from './yandex-visits-chart';

describe('YandexVisitsChart', () => {
  let component: YandexVisitsChart;
  let fixture: ComponentFixture<YandexVisitsChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YandexVisitsChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(YandexVisitsChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
