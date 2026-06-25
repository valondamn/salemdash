import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AnalyticsApiService } from '../../shared/services/analytics-api.service';
import { DashboardPageComponent } from './dashboard-page';

describe('DashboardPageComponent', () => {
  let component: DashboardPageComponent;
  let fixture: ComponentFixture<DashboardPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        {
          provide: AnalyticsApiService,
          useValue: {
            getYoutubeChannels: () => of([]),
            getInstagramAccounts: () => of([]),
            getYandexTotal: () => of({ total_count: 0, total_kz_count: 0, url_count: 0 }),
            getTikTokTotal: () => of({
              accounts_count: 0,
              total_comments: 0,
              total_followers: 0,
              total_likes: 0,
              total_profile_likes: 0,
              total_shares: 0,
              total_videos: 0,
              total_views: 0,
            }),
            getTikTokTotalsByAccount: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
