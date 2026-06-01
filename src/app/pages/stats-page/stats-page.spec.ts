import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AnalyticsApiService } from '../../shared/services/analytics-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { StatsPageComponent } from './stats-page';

describe('StatsPageComponent', () => {
  let component: StatsPageComponent;
  let fixture: ComponentFixture<StatsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsPageComponent],
      providers: [
        { provide: ProjectsApiService, useValue: { getProjects: () => of([]), getProjectInfo: () => of([]) } },
        {
          provide: AnalyticsApiService,
          useValue: {
            getInstagramAccounts: () => of([]),
            getYandexByProjectId: () => of({ project_id: 0, project_name: '', total_count: 0, total_kz_count: 0, url_count: 0, items: [] }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StatsPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
