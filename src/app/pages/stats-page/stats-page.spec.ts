import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AnalyticsApiService } from '../../shared/services/analytics-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { StatsPageComponent } from './stats-page';

describe('StatsPageComponent', () => {
  let component: StatsPageComponent;
  let fixture: ComponentFixture<StatsPageComponent>;
  let youtubePeriodCalls: Array<{ projectId: number; dateFrom: string; dateTo: string }>;

  beforeEach(async () => {
    youtubePeriodCalls = [];

    await TestBed.configureTestingModule({
      imports: [StatsPageComponent],
      providers: [
        { provide: ProjectsApiService, useValue: { getProjects: () => of([]), getProjectInfo: () => of([]) } },
        {
          provide: AnalyticsApiService,
          useValue: {
            getInstagramAccounts: () => of([]),
            getYandexByProjectId: () => of({ project_id: 0, project_name: '', total_count: 0, total_kz_count: 0, url_count: 0, items: [] }),
            getYoutubeProjectReleaseMetrics: (projectId: number, dateFrom: string, dateTo: string) => {
              youtubePeriodCalls.push({ projectId, dateFrom, dateTo });
              return of({
                count: 1,
                date_from: dateFrom,
                date_to: dateTo,
                n: 1,
                period: 'DAY',
                project_id: projectId,
                type: 'metric',
                items: [
                  {
                    project_name: `Project ${projectId}`,
                    episode_name: '',
                    youtube_id: '',
                    channel_name: 'YouTube',
                    metric_date: dateFrom,
                    views: projectId * 100,
                    likes: projectId * 10,
                    comments: projectId,
                    subscribers_gained: 0,
                    subscribers_lost: 0,
                    subscribers_net: 0,
                  },
                ],
              });
            },
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

  it('requests independent periods for both comparison sides', () => {
    component.projectAId = '4';
    component.projectBId = '9';
    component.youtubeCompareAFrom = '2026-06-01';
    component.youtubeCompareATo = '2026-06-15';
    component.youtubeCompareBFrom = '2026-05-01';
    component.youtubeCompareBTo = '2026-05-31';

    component.runYoutubeComparison();

    expect(youtubePeriodCalls).toEqual([
      { projectId: 4, dateFrom: '2026-06-01', dateTo: '2026-06-15' },
      { projectId: 9, dateFrom: '2026-05-01', dateTo: '2026-05-31' },
    ]);
    expect(component.youtubeComparisonReady).toBe(true);
    expect(component.youtubeCompareRows[0].a).toBe(400);
    expect(component.youtubeCompareRows[0].b).toBe(900);
  });

  it('compares selected episodes from the same or different projects', () => {
    component.youtubeCompareKind = 'episodes';
    component.projectAId = '4';
    component.projectBId = '4';
    component.youtubeEpisodeOptionsA = [
      { youtube_id: 'video-a', episode_name: 'Серия 1', youtube_views: 1000, youtube_likes: 100, youtube_comments: 10 },
    ];
    component.youtubeEpisodeOptionsB = [
      { youtube_id: 'video-b', episode_name: 'Серия 2', youtube_views: 1500, youtube_likes: 120, youtube_comments: 15 },
    ];
    component.youtubeEpisodeAKey = 'youtube:video-a';
    component.youtubeEpisodeBKey = 'youtube:video-b';

    component.runYoutubeComparison();

    expect(component.youtubeComparisonReady).toBe(true);
    expect(component.youtubeComparePrimaryLabel).toBe('Серия 1');
    expect(component.youtubeCompareSecondaryLabel).toBe('Серия 2');
    expect(component.youtubeCompareRows[0].a).toBe(1000);
    expect(component.youtubeCompareRows[0].b).toBe(1500);
  });
});
