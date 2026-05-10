import {
  EpisodeInfo,
  InstagramAccount,
  InstagramAccountApiItem,
  ProjectInfoApiItem,
  ProjectInfoApiResponse,
  UnifiedVisitsRow,
  VisitsResponse,
  YoutubeChannel,
  YoutubeChannelApiItem,
} from './ssm-models';

function pickNumber(...values: any[]): number | undefined {
  for (const value of values) {
    if (value == null || value === '') continue;
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }

  return undefined;
}

function pickString(...values: any[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }

  return undefined;
}

function normalizeProjectInfoItem(item: ProjectInfoApiItem): EpisodeInfo {
  return {
    ...item,
    id: pickNumber(item.ID, item.id),
    project_id: pickNumber(item.ProjectID, item.project_id),
    project_name: pickString(item.ProjectName, item.project_name),
    episode_name: pickString(item.EpisodesName, item.episode_name),
    season: pickNumber(item.Season, item.season),
    youtube_id: pickString(item.YouTubeID, item.youtube_id),
    youtube_channel: pickString(item.youtube_channel),
    youtube_views: pickNumber(item.YouTubeViews, item.youtube_views),
    youtube_comments: pickNumber(item.YouTubeCommentsCount, item.youtube_comments),
    youtube_likes: pickNumber(item.YouTubeLikesCount, item.youtube_likes),
    retention: pickString(item.AudienceRetention, item.retention),
    avg_view_by_user: pickString(item.AverageViewsByUser, item.avg_view_by_user),
    release_date: pickString(item.ReleaseDate, item.release_date),
    youtube_release_date: pickString(item.YouTubeReleaseDate, item.youtube_release_date),
  };
}

export function normalizeProjectInfo(resp: EpisodeInfo[] | ProjectInfoApiResponse): EpisodeInfo[] {
  if (Array.isArray(resp)) {
    return resp;
  }

  const items = Array.isArray(resp?.items) ? resp.items : [];
  return items.map((item) => normalizeProjectInfoItem(item));
}

export function normalizeYoutubeChannel(item: YoutubeChannelApiItem): YoutubeChannel {
  return {
    id: Number(item.id) || 0,
    name: pickString(item.name) ?? 'Unnamed channel',
    link: pickString(item.link) ?? '',
    partner: pickNumber(item.partner) ?? 0,
    subs_count: pickNumber(item.subs_count) ?? 0,
    likes_count: pickNumber(item.likes_count) ?? 0,
    comments_count: pickNumber(item.comments_count) ?? 0,
    views_count: pickNumber(item.views_count) ?? 0,
    quarter_likes_count: pickNumber(item.quarter_likes_count) ?? 0,
    quarter_comments_count: pickNumber(item.quarter_comments_count) ?? 0,
    quarter_views_count: pickNumber(item.quarter_views_count) ?? 0,
  };
}

export function normalizeInstagramAccount(item: InstagramAccountApiItem): InstagramAccount {
  return {
    id: pickString(item.Instagram_ID) ?? '',
    username: pickString(item.Instagram_Username) ?? 'unknown',
    page_name: pickString(item.Page_Name) ?? 'Instagram page',
    metric_date: pickString(item.Metric_Date) ?? '',
    followers: pickNumber(item.Instagram_Followers) ?? 0,
    posts: pickNumber(item.Instagram_Posts) ?? 0,
    likes_day: pickNumber(item.Instagram_Likes_Day) ?? 0,
    likes_total: pickNumber(item.Instagram_Likes_Total) ?? 0,
    comments_day: pickNumber(item.Instagram_Comments_Day) ?? 0,
    comments_total: pickNumber(item.Instagram_Comments_Total) ?? 0,
    saved_day: pickNumber(item.Instagram_Saved_Day) ?? 0,
    saved_total: pickNumber(item.Instagram_Saved_Total) ?? 0,
    views_day: pickNumber(item.Instagram_Views_Day) ?? 0,
    views_total: pickNumber(item.Instagram_Views_Total) ?? 0,
  };
}

export function normalizeVisits(resp: VisitsResponse): UnifiedVisitsRow[] {
  const toNum = (value: any) => Number(value) || 0;

  return Object.entries(resp).map(([key, block]) => {
    const yandexRows = block.yandex ?? block.details?.yandex ?? [];
    const youtubeRows = block.youtube ?? block.details?.youtube ?? [];

    const yandex_users = yandexRows.reduce((sum, row) => sum + toNum((row as any).users), 0);
    const yandex_visits = yandexRows.reduce((sum, row) => sum + toNum((row as any).visits), 0);

    const youtube_views =
      block.total?.views != null
        ? toNum(block.total.views)
        : youtubeRows.reduce((sum, row) => sum + toNum((row as any).views), 0);

    const youtube_likes =
      block.total?.likes != null
        ? toNum(block.total.likes)
        : youtubeRows.reduce((sum, row) => sum + toNum((row as any).likes), 0);

    const youtube_comments =
      block.total?.comments != null
        ? toNum(block.total.comments)
        : youtubeRows.reduce((sum, row) => sum + toNum((row as any).comments), 0);

    return {
      key,
      project_slug: block.project_slug,
      type: block.type,
      updated_at: block.updated_at,
      yandex_users,
      yandex_visits,
      youtube_views,
      youtube_likes,
      youtube_comments,
    };
  });
}
