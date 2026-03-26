export interface TrendDataPoint {
  month: string;
  seo: number;
  performance: number;
  accessibility: number;
  conversion: number;
}

export interface IssueDataPoint {
  issue: string;
  shortLabel: string;
  percentage: number;
  color: string;
}

export interface HealthSegment {
  name: string;
  value: number;
  color: string;
  gradient: string;
}

export interface BenchmarkStat {
  id: string;
  label: string;
  value: string;
  subLabel: string;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  icon: string;
  accentColor: string;
}
