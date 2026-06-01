import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EpisodesChartComponent } from './episodes-chart';

describe('EpisodesChartComponent', () => {
  let component: EpisodesChartComponent;
  let fixture: ComponentFixture<EpisodesChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EpisodesChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EpisodesChartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
