import {
  TrendDataPoint,
  IssueDataPoint,
  HealthSegment,
  BenchmarkStat,
} from "@/types/benchmark";

export const trendData: TrendDataPoint[] = [
  { month: "Jul", seo: 62, performance: 55, accessibility: 48, conversion: 41 },
  { month: "Aug", seo: 64, performance: 58, accessibility: 50, conversion: 43 },
  { month: "Sep", seo: 63, performance: 56, accessibility: 53, conversion: 45 },
  { month: "Oct", seo: 67, performance: 61, accessibility: 55, conversion: 44 },
  { month: "Nov", seo: 69, performance: 59, accessibility: 57, conversion: 48 },
  { month: "Dec", seo: 66, performance: 63, accessibility: 56, conversion: 47 },
  { month: "Jan", seo: 71, performance: 65, accessibility: 59, conversion: 50 },
  { month: "Feb", seo: 70, performance: 64, accessibility: 62, conversion: 52 },
  { month: "Mar", seo: 74, performance: 68, accessibility: 61, conversion: 54 },
  { month: "Apr", seo: 73, performance: 67, accessibility: 64, conversion: 53 },
  { month: "May", seo: 76, performance: 71, accessibility: 66, conversion: 56 },
  { month: "Jun", seo: 78, performance: 73, accessibility: 68, conversion: 58 },
];

export const issueData: IssueDataPoint[] = [
  {
    issue: "Missing alt text on images",
    shortLabel: "Missing Alt Text",
    percentage: 67,
    color: "#ff8a80",
  },
  {
    issue: "Weak or absent CTA presence",
    shortLabel: "Weak CTA",
    percentage: 54,
    color: "#ffb86b",
  },
  {
    issue: "Poor heading structure (H1-H3)",
    shortLabel: "Heading Structure",
    percentage: 48,
    color: "#ffe08a",
  },
  {
    issue: "Slow page load speed (>3s)",
    shortLabel: "Slow Load Speed",
    percentage: 43,
    color: "#c9b7ff",
  },
  {
    issue: "Low content depth (<500 words)",
    shortLabel: "Low Content Depth",
    percentage: 38,
    color: "#a7efff",
  },
];

export const healthData: HealthSegment[] = [
  {
    name: "SEO",
    value: 34,
    color: "#a7efff",
    gradient: "from-sky-200 to-cyan-300",
  },
  {
    name: "UX",
    value: 26,
    color: "#d7d9de",
    gradient: "from-zinc-200 to-slate-300",
  },
  {
    name: "Accessibility",
    value: 22,
    color: "#8bf0cf",
    gradient: "from-emerald-200 to-teal-300",
  },
  {
    name: "Performance",
    value: 18,
    color: "#f4c27a",
    gradient: "from-amber-200 to-orange-300",
  },
];

export const benchmarkStats: BenchmarkStat[] = [
  {
    id: "avg-seo",
    label: "Average SEO Score",
    value: "74%",
    subLabel: "Across 12,847 pages",
    trend: "up",
    trendValue: "+3.2%",
    icon: "search",
    accentColor: "#a7efff",
  },
  {
    id: "missing-alt",
    label: "Pages Missing Alt Text",
    value: "42%",
    subLabel: "Down from 51% last quarter",
    trend: "down",
    trendValue: "-9.1%",
    icon: "image",
    accentColor: "#ff8a80",
  },
  {
    id: "avg-cta",
    label: "Average CTA Count",
    value: "2.1",
    subLabel: "Per landing page",
    trend: "up",
    trendValue: "+0.4",
    icon: "mouse-pointer-click",
    accentColor: "#f4c27a",
  },
  {
    id: "mobile-opt",
    label: "Mobile Optimized",
    value: "68%",
    subLabel: "Of analyzed pages",
    trend: "up",
    trendValue: "+5.7%",
    icon: "smartphone",
    accentColor: "#8bf0cf",
  },
];
