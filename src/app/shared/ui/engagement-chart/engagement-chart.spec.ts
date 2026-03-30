import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EngagementChart } from './engagement-chart';

describe('EngagementChart', () => {
  let component: EngagementChart;
  let fixture: ComponentFixture<EngagementChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EngagementChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EngagementChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
