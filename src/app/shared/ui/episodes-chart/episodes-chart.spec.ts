import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EpisodesChart } from './episodes-chart';

describe('EpisodesChart', () => {
  let component: EpisodesChart;
  let fixture: ComponentFixture<EpisodesChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EpisodesChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EpisodesChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
