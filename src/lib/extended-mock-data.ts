// ─────────────────────────────────────────────────────────────────────
// extended-mock-data.ts — Realistic mock payloads for the new cards.
// ─────────────────────────────────────────────────────────────────────

import { ExtendedMetricsData } from "@/types/extended-metrics";

/** Full payload — all four sections populated. */
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

/** Partial payload — only performance and accessibility. */
export const mockExtendedMetricsPartial: ExtendedMetricsData = {
  performance: {
    load_time_ms: 1