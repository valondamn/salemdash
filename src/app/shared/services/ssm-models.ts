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
  [key: string]: any;
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
