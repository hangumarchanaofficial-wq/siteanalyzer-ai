import { ExtendedMetricsData } from "@/types/extended-metrics";

export const mockExtendedMetrics: ExtendedMetricsData = {
  performance: {
    load_time_ms: 10130,
    lcp_ms: 2500,
    cls: 0.02,
  },
  page_size: {
    total_mb: 9,
    html_kb: 200,
    js_kb: 1960,
    css_kb: 70,
    images_kb: 5590,
  },
  resources: {
    js_files: 70,
    css_files: 8,
    images: 234,
  },
  accessibility: {
    unlabelled_inputs: 5,
    aria_roles: 31,
  },
};

export const mockExtendedMetricsPartial: ExtendedMetricsData = {
  performance: {
    load_time_ms: 1840,
    lcp_ms: 1320,
    cls: 0.01,
  },
  accessibility: {
    unlabelled_inputs: 1,
    aria_roles: 12,
  },
};
