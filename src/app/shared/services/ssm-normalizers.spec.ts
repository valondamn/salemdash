import { describe, expect, it } from 'vitest';

import { normalizeProjectInfo } from './ssm-normalizers';

describe('normalizeProjectInfo', () => {
  it('normalizes raw array responses from info_byprojectid', () => {
    const result = normalizeProjectInfo([
      {
        ID: 1281,
        ProjectID: 4,
        ProjectName: 'САКЕ',
        EpisodesName: 'САКЕ 1 серия',
        Season: 1,
        YouTubeID: 'video-id',
        YouTubeViews: 1000,
        YouTubeLikesCount: 100,
        YouTubeCommentsCount: 10,
        YouTubeReleaseDate: '2026-06-01T10:00:00',
      },
    ] as any);

    expect(result[0]).toMatchObject({
      id: 1281,
      project_id: 4,
      project_name: 'САКЕ',
      episode_name: 'САКЕ 1 серия',
      season: 1,
      youtube_id: 'video-id',
      youtube_views: 1000,
      youtube_likes: 100,
      youtube_comments: 10,
      youtube_release_date: '2026-06-01T10:00:00',
    });
  });
});
