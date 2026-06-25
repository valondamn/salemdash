import {
  AddUserResponse,
  AuthUser,
  EpisodeInfo,
  InstagramAccount,
  InstagramAccountApiItem,
  LoginResponse,
  ProjectInfoApiItem,
  ProjectInfoApiResponse,
  ProjectMetricRow,
  ProjectPlatformStats,
  ProjectStatsSource,
  Project,
  ProjectAccountOption,
  RoleOption,
  SystemUser,
  TikTokAccountTotals,
  TikTokAccountTotalsApiItem,
  TikTokPeriodMetric,
  TikTokPeriodMetricApiItem,
  TikTokTotal,
  TikTokTotalApiResponse,
  UnifiedVisitsRow,
  VisitsResponse,
  YandexProjectAnalytics,
  YandexProjectAnalyticsApiResponse,
  YandexProjectsGroupItem,
  YandexProjectsGroupItemApi,
  YandexTotal,
  YandexTotalApiResponse,
  YoutubeChannel,
  YoutubeChannelApiItem,
  YoutubeReleaseMetric,
  YoutubeReleaseMetricApiItem,
  YoutubeReleasePeriod,
  YoutubeReleasePeriodApiResponse,
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

export function extractAuthToken(response: LoginResponse | null | undefined): string | null {
  const raw = response as Record<string, any> | null | undefined;
  const token = pickString(
    response?.token,
    response?.access_token,
    response?.jwt,
    raw?.['data']?.token,
    raw?.['data']?.access_token,
    raw?.['data']?.jwt
  );

  return token ?? null;
}

export function normalizeAuthUser(user: Partial<AuthUser> | null | undefined): AuthUser {
  const raw = user as Record<string, any> | null | undefined;
  return {
    user_id: pickNumber(user?.user_id, raw?.['id']) ?? 0,
    login: pickString(user?.login, raw?.['username']) ?? '',
    role: pickString(user?.role, raw?.['role_code']) ?? 'user',
  };
}

export function normalizeRoleOption(role: Partial<RoleOption> | null | undefined): RoleOption {
  return {
    id: pickNumber(role?.id) ?? 0,
    code: pickString(role?.code) ?? 'user',
    name: pickString(role?.name) ?? 'Пользователь',
  };
}

export function normalizeSystemUser(user: Partial<SystemUser> | null | undefined): SystemUser {
  const raw = user as Record<string, any> | null | undefined;
  const isActive = raw?.['is_active'];
  return {
    id: pickNumber(user?.id, raw?.['user_id']) ?? 0,
    login: pickString(user?.login, raw?.['username']) ?? '',
    role: pickString(user?.role, raw?.['role_code']) ?? 'user',
    is_active: isActive == null ? false : Boolean(Number(isActive) || isActive),
    created_at: pickString(user?.created_at) ?? '',
  };
}

export function extractCreatedUserId(response: AddUserResponse | null | undefined): number | null {
  const raw = response as Record<string, any> | null | undefined;
  return pickNumber(response?.id, response?.user_id, raw?.['data']?.id, raw?.['data']?.user_id) ?? null;
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

export function normalizeProject(project: Project): Project {
  return {
    ...project,
    id: pickNumber(project.id) ?? 0,
    name: pickString(project.name) ?? '',
    utm_name: pickString(project.utm_name),
    youtube_channel_id: pickNumber(project.youtube_channel_id) ?? null,
    instagram_id: pickNumber(project.instagram_id) ?? null,
    tiktok_id: pickNumber(project.tiktok_id) ?? null,
    aliaslist: Array.isArray(project.aliaslist)
      ? project.aliaslist.map((item) => String(item).trim()).filter(Boolean)
      : [],
    project_start_date: pickString(project.project_start_date) ?? null,
    project_end_date: pickString(project.project_end_date) ?? null,
    age: pickString(project.age) ?? null,
    category: pickString(project.category) ?? null,
    gender: pickString(project.gender) ?? null,
    genre: pickString(project.genre) ?? null,
    lang: pickString(project.lang) ?? null,
    is_serial: typeof project.is_serial === 'boolean' ? project.is_serial : project.is_serial == null ? null : Boolean(project.is_serial),
  };
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

export function normalizeYoutubeReleaseMetric(item: YoutubeReleaseMetricApiItem): YoutubeReleaseMetric {
  return {
    project_name: pickString(item.ProjectName) ?? '',
    channel_name: pickString(item.channel_name) ?? 'YouTube',
    metric_date: pickString(item.metric_date) ?? '',
    views: pickNumber(item.views) ?? 0,
    likes: pickNumber(item.likes) ?? 0,
    comments: pickNumber(item.comments) ?? 0,
    subscribers_gained: pickNumber(item.subscribers_gained) ?? 0,
    subscribers_lost: pickNumber(item.subscribers_lost) ?? 0,
    subscribers_net: pickNumber(item.subscribers_net) ?? 0,
  };
}

export function normalizeYoutubeReleasePeriod(resp: YoutubeReleasePeriodApiResponse): YoutubeReleasePeriod {
  const items = Array.isArray(resp?.items) ? resp.items : [];

  return {
    count: pickNumber(resp?.count) ?? items.length,
    date_from: pickString(resp?.date_from) ?? '',
    date_to: pickString(resp?.date_to) ?? '',
    n: pickNumber(resp?.n) ?? 0,
    period: pickString(resp?.period) ?? '',
    project_id: pickNumber(resp?.project_id) ?? 0,
    type: pickString(resp?.type) ?? '',
    items: items.map((item) => normalizeYoutubeReleaseMetric(item)),
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

export function normalizeInstagramPeriodDaily(items: InstagramAccountApiItem[] | null | undefined): InstagramAccount[] {
  return (items ?? []).map((item) => normalizeInstagramAccount(item));
}

export function normalizeAccountOption(item: any): ProjectAccountOption {
  return {
    id: pickNumber(item?.id, item?.ID) ?? 0,
    name: pickString(item?.name, item?.Name) ?? 'Unnamed',
    url: pickString(item?.url, item?.URL),
  };
}

export function normalizeYandexProjectAnalytics(resp: YandexProjectAnalyticsApiResponse): YandexProjectAnalytics {
  const items = Array.isArray(resp?.Items) ? resp.Items : [];

  return {
    project_id: pickNumber(resp.ProjectID) ?? 0,
    project_name: pickString(resp.ProjectName) ?? 'Проект',
    total_count: pickNumber(resp.TotalCount) ?? 0,
    total_kz_count: pickNumber(resp.TotalKZCount) ?? 0,
    url_count: pickNumber(resp.UrlCount) ?? items.length,
    items: items.map((item) => ({
      id: pickNumber(item.ID) ?? 0,
      project_id: pickNumber(item.ProjectID) ?? 0,
      name: pickString(item.Name) ?? 'Источник',
      count: pickNumber(item.Count) ?? 0,
      kz_count: pickNumber(item.KZCount) ?? 0,
      is_need: pickNumber(item.is_need) ?? 0,
    })),
  };
}

export function normalizeYandexProjectsGroup(items: YandexProjectsGroupItemApi[] | null | undefined): YandexProjectsGroupItem[] {
  return (items ?? []).map((item) => ({
    project_id: pickNumber(item.ProjectID) ?? 0,
    project_name: pickString(item.ProjectName) ?? 'Проект',
    total_count: pickNumber(item.TotalCount) ?? 0,
    total_kz_count: pickNumber(item.TotalKZCount) ?? 0,
    url_count: pickNumber(item.UrlCount) ?? 0,
  }));
}

export function normalizeYandexTotal(resp: YandexTotalApiResponse): YandexTotal {
  return {
    total_count: pickNumber(resp.TotalCount) ?? 0,
    total_kz_count: pickNumber(resp.TotalKZCount) ?? 0,
    url_count: pickNumber(resp.UrlCount) ?? 0,
  };
}

export function normalizeTikTokTotal(resp: TikTokTotalApiResponse): TikTokTotal {
  return {
    accounts_count: pickNumber(resp.accounts_count) ?? 0,
    total_comments: pickNumber(resp.total_comments) ?? 0,
    total_followers: pickNumber(resp.total_followers) ?? 0,
    total_likes: pickNumber(resp.total_likes) ?? 0,
    total_profile_likes: pickNumber(resp.total_profile_likes) ?? 0,
    total_shares: pickNumber(resp.total_shares) ?? 0,
    total_videos: pickNumber(resp.total_videos) ?? 0,
    total_views: pickNumber(resp.total_views) ?? 0,
  };
}

export function normalizeTikTokAccountTotals(items: TikTokAccountTotalsApiItem[] | null | undefined): TikTokAccountTotals[] {
  return (items ?? []).map((item) => ({
    account_id: pickNumber(item.account_id) ?? 0,
    channel_name: pickString(item.channel_name) ?? 'TikTok',
    channel_url: pickString(item.channel_url) ?? '',
    followers: pickNumber(item.followers) ?? 0,
    profile_likes: pickNumber(item.profile_likes) ?? 0,
    total_comments: pickNumber(item.total_comments) ?? 0,
    total_likes: pickNumber(item.total_likes) ?? 0,
    total_shares: pickNumber(item.total_shares) ?? 0,
    total_videos: pickNumber(item.total_videos) ?? 0,
    total_views: pickNumber(item.total_views) ?? 0,
    updated_at: pickString(item.updated_at) ?? '',
  }));
}

export function normalizeTikTokPeriodMetric(item: TikTokPeriodMetricApiItem): TikTokPeriodMetric {
  return {
    account_id: pickNumber(item.account_id) ?? 0,
    channel_name: pickString(item.channel_name) ?? 'TikTok',
    channel_url: pickString(item.channel_url) ?? '',
    collected_at: pickString(item.collected_at) ?? '',
    stat_date: pickString(item.stat_date) ?? '',
    followers: pickNumber(item.followers) ?? 0,
    followers_growth: pickNumber(item.followers_growth) ?? 0,
    profile_likes: pickNumber(item.profile_likes) ?? 0,
    total_comments: pickNumber(item.total_comments) ?? 0,
    total_likes: pickNumber(item.total_likes) ?? 0,
    total_shares: pickNumber(item.total_shares) ?? 0,
    total_videos: pickNumber(item.total_videos) ?? 0,
    total_views: pickNumber(item.total_views) ?? 0,
    comments_growth: pickNumber(item.comments_growth) ?? 0,
    likes_growth: pickNumber(item.likes_growth) ?? 0,
    shares_growth: pickNumber(item.shares_growth) ?? 0,
    views_growth: pickNumber(item.views_growth) ?? 0,
  };
}

export function normalizeTikTokPeriodMetrics(items: TikTokPeriodMetricApiItem[] | null | undefined): TikTokPeriodMetric[] {
  return (items ?? []).map((item) => normalizeTikTokPeriodMetric(item));
}

function unwrapItems(response: any): any[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.Items)) return response.Items;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function normalizeMetricDate(...values: any[]): string {
  const raw = pickString(...values) ?? '';
  if (!raw) return '';

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return raw.slice(0, 10);
}

function buildProjectPlatformStats(
  source: ProjectStatsSource,
  response: any,
  labels: ProjectPlatformStats['labels'],
  rows: ProjectMetricRow[],
  dateFrom = '',
  dateTo = '',
  fallbackProjectId = 0
): ProjectPlatformStats {
  const first = rows[0];

  return {
    source,
    project_id: pickNumber(response?.ProjectID, response?.project_id, fallbackProjectId, first?.project_id) ?? 0,
    project_name: pickString(response?.ProjectName, response?.project_name, first?.project_name) ?? 'Проект',
    date_from: pickString(response?.DateFrom, response?.date_from, dateFrom) ?? '',
    date_to: pickString(response?.DateTo, response?.date_to, dateTo) ?? '',
    labels,
    totals: {
      primary: rows.reduce((sum, row) => sum + row.primary, 0),
      secondary: rows.reduce((sum, row) => sum + row.secondary, 0),
      tertiary: rows.reduce((sum, row) => sum + row.tertiary, 0),
      quaternary: rows.reduce((sum, row) => sum + row.quaternary, 0),
    },
    rows,
  };
}

export function normalizeYandexDailyStats(response: any, dateFrom = '', dateTo = '', fallbackProjectId = 0): ProjectPlatformStats {
  const items = unwrapItems(response);
  const rows = items.map((item): ProjectMetricRow => ({
    project_id: pickNumber(item.ProjectID, item.project_id, fallbackProjectId) ?? 0,
    project_name: pickString(item.ProjectName, item.project_name) ?? 'Проект',
    metric_date: normalizeMetricDate(item.Metric_Date ?? item.metric_date ?? item.Date),
    label: pickString(item.Name, item.name, item.ProjectName) ?? 'Источник',
    url: pickString(item.URL, item.url) ?? '',
    primary: pickNumber(item.Count, item.TotalCount, item.count, item.total_count) ?? 0,
    secondary: pickNumber(item.Users, item.TotalUsers, item.users, item.total_users) ?? 0,
    tertiary: pickNumber(item.KZCount, item.TotalKZCount, item.kz_count, item.total_kz_count) ?? 0,
    quaternary: pickNumber(item.KZUsers, item.TotalKZUsers, item.kz_users, item.total_kz_users, item.UrlCount) ?? 0,
  }));

  return buildProjectPlatformStats(
    'yandex',
    response,
    { primary: 'Total', secondary: 'Users', tertiary: 'KZ Total', quaternary: 'KZ Users' },
    rows,
    dateFrom,
    dateTo,
    fallbackProjectId
  );
}

export function normalizeInstagramProjectStats(response: any, dateFrom = '', dateTo = '', fallbackProjectId = 0): ProjectPlatformStats {
  const items = unwrapItems(response);
  const rows = items.map((item): ProjectMetricRow => ({
    project_id: pickNumber(item.ProjectID, item.project_id, fallbackProjectId) ?? 0,
    project_name: pickString(item.ProjectName, item.project_name) ?? 'Проект',
    metric_date: normalizeMetricDate(item.metric_date, item.Metric_Date),
    label: pickString(item.page_name, item.Page_Name, item.username, item.Instagram_Username) ?? 'Instagram',
    url: pickString(item.username, item.Instagram_Username) ? `https://www.instagram.com/${pickString(item.username, item.Instagram_Username)}/` : '',
    primary: pickNumber(item.views_day, item.Instagram_Views_Day, item.Instagram_Views_Total, item.views_total) ?? 0,
    secondary: pickNumber(item.likes_day, item.Instagram_Likes_Day, item.Instagram_Likes_Total, item.likes_total) ?? 0,
    tertiary: pickNumber(item.comments_day, item.Instagram_Comments_Day, item.Instagram_Comments_Total, item.comments_total) ?? 0,
    quaternary: pickNumber(item.saved_day, item.Instagram_Saved_Day, item.Instagram_Saved_Total, item.saved_total) ?? 0,
  }));

  return buildProjectPlatformStats(
    'instagram',
    response,
    { primary: 'Просмотры', secondary: 'Лайки', tertiary: 'Комментарии', quaternary: 'Сохранения' },
    rows,
    dateFrom,
    dateTo,
    fallbackProjectId
  );
}

export function normalizeTikTokProjectStats(response: any, dateFrom = '', dateTo = '', fallbackProjectId = 0): ProjectPlatformStats {
  const items = unwrapItems(response);
  const rows = items.map((item): ProjectMetricRow => ({
    project_id: pickNumber(item.ProjectID, item.project_id, fallbackProjectId) ?? 0,
    project_name: pickString(item.ProjectName, item.project_name) ?? 'Проект',
    metric_date: normalizeMetricDate(item.stat_date, item.Stat_Date, item.collected_at),
    label: pickString(item.channel_name, item.TikTok_Channel_Name, item.ProjectName) ?? 'TikTok',
    url: pickString(item.channel_url, item.TikTok_Channel_URL) ?? '',
    primary: pickNumber(item.views_growth, item.TikTok_Views_Growth, item.TikTok_Total_Views, item.total_views) ?? 0,
    secondary: pickNumber(item.likes_growth, item.TikTok_Likes_Growth, item.TikTok_Total_Likes, item.total_likes) ?? 0,
    tertiary: pickNumber(item.comments_growth, item.TikTok_Comments_Growth, item.TikTok_Total_Comments, item.total_comments) ?? 0,
    quaternary: pickNumber(item.shares_growth, item.TikTok_Shares_Growth, item.TikTok_Total_Shares, item.total_shares) ?? 0,
  }));

  return buildProjectPlatformStats(
    'tiktok',
    response,
    { primary: 'Просмотры', secondary: 'Лайки', tertiary: 'Комментарии', quaternary: 'Шеры' },
    rows,
    dateFrom,
    dateTo,
    fallbackProjectId
  );
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
