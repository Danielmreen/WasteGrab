export type StatCardTone =
  | 'brand'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export type StatTrendDirection = 'up' | 'down' | 'flat';

export type StatCardTrend = {
  value: string;
  label: string;
  direction: StatTrendDirection;
};

export type StatCardItem = {
  label: string;
  value: string | number | null;
  unit?: string;
  icon: string;
  tone?: StatCardTone;
  trend?: StatCardTrend;
  spanClass?: string;
};
