export type AutoReleaseAddPayload = {
  youtube_id: string;
  project_id: number;
  season: number;
};

export type CreateReleasePayload = {
  release_date: string;
  project_id: number;
  season: number;
  episodes_name: string;
  yt_id: string;
};

export type Project = {
  id: number;
  name?: string;
  utm_name?: string;
  youtube_channel_id?: number | null;
  instagram_id?: number | null;
  tiktok_id?: number | null;
  aliaslist?: string[];
  project_start_date?: string | null;
  project_end_date?: string | null;
  age?: string | null;
  category?: string | null;
  gender?: string | null;
  genre?: string | null;
  lang?: string | null;
  is_serial?: boolean | null;
  [key: string]: any;
};

export type ProjectUpsertPayload = {
  ProjectName: string;
  YTChannelID: number | null;
  InstagramId: number | null;
  TikTokId: number | null;
  aliaslist: string[];
  ProjectStartDate: string | null;
  ProjectEndDate: string | null;
};

export type ProjectAccountOption = {
  id: number;
  name: string;
  url?: string;
};

export type EpisodeInfo = {
  id?: number;
  project_id?: number;
  project_name?: string;
  episode_name?: string;
  season?: number;
  youtube_id?: string;
  youtube_channel?: string;
  youtube_views?: number;
  youtube_comments?: number;
  youtube_likes?: number;
  retention?: string;
  avg_view_by_user?: string;
  release_date?: string;
  youtube_release_date?: string;
  [key: string]: any;
};

export type VisitsItem = {
  url: string;
  users: number;
  visits: number;
};

export type YoutubeItem = {
  video_id: string;
  views: number;
  likes: number;
  comments: number;
};

export type VisitsBlock = {
  project_slug: string;
  type: string;
  updated_at: string;
  yandex?: VisitsItem[];
  youtube?: YoutubeItem[];
  total?: {
    users?: number;
    visits?: number;
    views?: number;
    likes?: number;
    comments?: number;
  };
  details?: {
    yandex?: VisitsItem[];
    youtube?: YoutubeItem[];
  };
  [key: string]: any;
};

export type VisitsResponse = Record<string, VisitsBlock>;

export type UnifiedVisitsRow = {
  key: string;
  project_slug: string;
  type: string;
  updated_at: string;
  yandex_users: number;
  yandex_visits: number;
  youtube_views: number;
  youtube_likes: number;
  youtube_comments: number;
};

export type YandexProjectUrlMetric = {
  id: number;
  project_id: number;
  name: string;
  count: number;
  kz_count: number;
  is_need: number;
};

export type YandexProjectAnalyticsApiResponse = {
  Items?: Array<{
    Count?: number | string;
    ID?: number | string;
    KZCount?: number | string;
    Name?: string;
    ProjectID?: number | string;
    is_need?: number | string;
  }>;
  ProjectID?: number | string;
  ProjectName?: string;
  TotalCount?: number | string;
  TotalKZCount?: number | string;
  UrlCount?: number | string;
};

export type YandexProjectAnalytics = {
  project_id: number;
  project_name: string;
  total_count: number;
  total_kz_count: number;
  url_count: number;
  items: YandexProjectUrlMetric[];
};

export type YandexProjectsGroupItemApi = {
  ProjectID?: number | string;
  ProjectName?: string;
  TotalCount?: number | string;
  TotalKZCount?: number | string;
  UrlCount?: number | string;
};

export type YandexProjectsGroupItem = {
  project_id: number;
  project_name: string;
  total_count: number;
  total_kz_count: number;
  url_count: number;
};

export type YandexTotalApiResponse = {
  TotalCount?: number | string;
  TotalKZCount?: number | string;
  UrlCount?: number | string;
};

export type YandexTotal = {
  total_count: number;
  total_kz_count: number;
  url_count: number;
};

export type YoutubeChannelApiItem = {
  id: number;
  name: string;
  subs_count?: number | string;
  link?: string;
  partner?: number | string;
  likes_count?: number | string;
  comments_count?: number | string;
  views_count?: number | string;
  quarter_likes_count?: number | string;
  quarter_comments_count?: number | string;
  quarter_views_count?: number | string;
  [key: string]: any;
};

export type YoutubeChannel = {
  id: number;
  name: string;
  link: string;
  partner: number;
  subs_count: number;
  likes_count: number;
  comments_count: number;
  views_count: number;
  quarter_likes_count: number;
  quarter_comments_count: number;
  quarter_views_count: number;
};

export type InstagramAccountApiItem = {
  Instagram_Comments_Day?: number | string;
  Instagram_Comments_Total?: number | string;
  Instagram_Followers?: number | string;
  Instagram_ID?: string | number;
  Instagram_Likes_Day?: number | string;
  Instagram_Likes_Total?: number | string;
  Instagram_Posts?: number | string;
  Instagram_Saved_Day?: number | string;
  Instagram_Saved_Total?: number | string;
  Instagram_Username?: string;
  Instagram_Views_Day?: number | string;
  Instagram_Views_Total?: number | string;
  Metric_Date?: string;
  Page_Name?: string;
  [key: string]: any;
};

export type InstagramAccount = {
  id: string;
  username: string;
  page_name: string;
  metric_date: string;
  followers: number;
  posts: number;
  likes_day: number;
  likes_total: number;
  comments_day: number;
  comments_total: number;
  saved_day: number;
  saved_total: number;
  views_day: number;
  views_total: number;
};

export type TikTokTotalApiResponse = {
  accounts_count?: number | string;
  total_comments?: number | string;
  total_followers?: number | string;
  total_likes?: number | string;
  total_profile_likes?: number | string;
  total_shares?: number | string;
  total_videos?: number | string;
  total_views?: number | string;
};

export type TikTokTotal = {
  accounts_count: number;
  total_comments: number;
  total_followers: number;
  total_likes: number;
  total_profile_likes: number;
  total_shares: number;
  total_videos: number;
  total_views: number;
};

export type UserRoleCode = 'super_user' | 'editor' | 'user';

export type AuthUser = {
  user_id: number;
  login: string;
  role: UserRoleCode | string;
};

export type LoginPayload = {
  login: string;
  password: string;
};

export type LoginResponse = {
  success?: boolean;
  token?: string;
  access_token?: string;
  jwt?: string;
  user?: Partial<AuthUser>;
  [key: string]: any;
};

export type RoleOption = {
  id: number;
  code: UserRoleCode | string;
  name: string;
};

export type RoleListResponse = {
  success?: boolean;
  roles?: RoleOption[];
  [key: string]: any;
};

export type SystemUser = {
  id: number;
  login: string;
  role: UserRoleCode | string;
  is_active: boolean;
  created_at: string;
};

export type CurrentUserResponse = {
  success?: boolean;
  user?: Partial<AuthUser>;
  [key: string]: any;
};

export type AddUserPayload = {
  login: string;
  password: string;
  role: UserRoleCode | string;
};

export type AddUserResponse = {
  success?: boolean;
  id?: number;
  user_id?: number;
  [key: string]: any;
};

export type TikTokAccountTotalsApiItem = {
  account_id?: number | string;
  channel_name?: string;
  channel_url?: string;
  followers?: number | string;
  profile_likes?: number | string;
  total_comments?: number | string;
  total_likes?: number | string;
  total_shares?: number | string;
  total_videos?: number | string;
  total_views?: number | string;
  updated_at?: string;
};

export type TikTokAccountTotals = {
  account_id: number;
  channel_name: string;
  channel_url: string;
  followers: number;
  profile_likes: number;
  total_comments: number;
  total_likes: number;
  total_shares: number;
  total_videos: number;
  total_views: number;
  updated_at: string;
};

export type ProjectInfoApiItem = {
  ID?: number;
  ProjectID?: number;
  ProjectName?: string;
  EpisodesName?: string;
  YouTubeViews?: number;
  YouTubeCommentsCount?: number;
  YouTubeLikesCount?: number;
  AudienceRetention?: string;
  AverageViewsByUser?: string;
  ReleaseDate?: string;
  YouTubeReleaseDate?: string;
  Season?: number;
  YouTubeID?: string;
  id?: number;
  project_id?: number;
  project_name?: string;
  episode_name?: string;
  season?: number;
  youtube_id?: string;
  youtube_channel?: string;
  youtube_views?: number;
  youtube_comments?: number;
  youtube_likes?: number;
  retention?: string;
  avg_view_by_user?: string;
  release_date?: string;
  youtube_release_date?: string;
  [key: string]: any;
};

export type ProjectInfoApiResponse = {
  count?: number;
  items?: ProjectInfoApiItem[];
  errors?: unknown;
  [key: string]: any;
};
