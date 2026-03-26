// ─────────────────────────────────────────────────────────────────────
// extended-metrics.ts — Type definitions for the four new metric cards.
//
// Every field is optional at the top level so the UI degrades
// gracefully when the backend does not yet provide a given section.
// ─────────────────────────────────────────────────────────────────────

export interface PerformanceMetrics {
  load_time_ms: number;
  lcp_ms?: number;
  cls?: number;
}

export interface PageSizeMetrics {
  total_mb: number;
  html_kb?: number;
  js_kb?: number;
  css_kb?: number;
  images_kb?: number;
}

export interface ResourceMetrics {
  js_files: number;
  css_files: number;
  images: number;
}

export interface AccessibilityMetrics {
  unlabelled_inputs: number;
  aria_roles: number;
}

/** Combined shape — every section is optional. */
export interface ExtendedMetricsData {
  performance?: PerformanceMetrics;
  page_size?: PageSizeMetrics;
  resources?: ResourceMetrics;
  accessibility?: AccessibilityMetrics;
}
