import { EpisodeInfo, InstagramAccount, YandexProjectAnalytics, YandexProjectUrlMetric } from '../../shared/services/ssm-models';

export type Mode = 'single' | 'compare';
export type Source = 'youtube' | 'yandex' | 'instagram' | 'tiktok';
export type MetricFormat = 'number' | 'percent' | 'decimal';
export type MetricTone = 'positive' | 'negative' | 'neutral';
export type MetricWinner = 'a' | 'b' | 'tie';

export type CompareMetricRow = {
  key: string;
  label: string;
  a: number;
  b: number;
  format: MetricFormat;
  delta: number | null;
  tone: MetricTone;
  winner: MetricWinner;
};

export type YoutubeSingleStatsInputs = {
  headline: string;
  episodes: EpisodeInfo[];
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgViews: number;
  engagementRate: number;
  topEpisodes: EpisodeInfo[];
  loadingInfo: boolean;
};

export type YoutubeCompareStatsInputs = {
  rows: CompareMetricRow[];
  labels: string[];
  viewSeriesA: Array<number | null>;
  viewSeriesB: Array<number | null>;
  engagementSeriesA: Array<number | null>;
  engagementSeriesB: Array<number | null>;
  primaryLabel: string;
  secondaryLabel: string;
  summary: string;
};

export type YandexSingleStatsInputs = {
  headline: string;
  totalCount: number;
  totalKzCount: number;
  urlCount: number;
  items: YandexProjectUrlMetric[];
  projectName: string;
};

export type YandexCompareStatsInputs = {
  rows: CompareMetricRow[];
  labels: string[];
  totalSeriesA: Array<number | null>;
  totalSeriesB: Array<number | null>;
  kzSeriesA: Array<number | null>;
  kzSeriesB: Array<number | null>;
  primaryLabel: string;
  secondaryLabel: string;
  summary: string;
};

export type InstagramSingleStatsInputs = {
  headline: string;
  account: InstagramAccount;
};

export type InstagramCompareStatsInputs = {
  rows: CompareMetricRow[];
  accountA: InstagramAccount | null;
  accountB: InstagramAccount | null;
  perPostLabels: string[];
  perPostSeriesA: Array<number | null>;
  perPostSeriesB: Array<number | null>;
  primaryLabel: string;
  secondaryLabel: string;
  summary: string;
};
