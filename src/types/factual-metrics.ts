// ─────────────────────────────────────────────────────────────────────
// factual-metrics.ts — Type definitions for the Factual Metrics section.
//
// These types represent the raw, scraper-extracted data shape.
// They are intentionally separate from AuditMetrics (which includes
// computed/AI-derived fields like engagementScore and activeClusters).
// ─────────────────────────────────────────────────────────────────────

export interface FactualHeadings {
  h1: number;
  h2: number;
  h3: number;
}

export interface FactualLinks {
  internal: number;
  external: number;
  total: number;
}

export interface FactualMeta {
  title: string | null;
  description: string | null;
}

export interface FactualAdvancedDiagnostics {
  load_time_ms?: number;
  status_code?: number;
  dom_elements?: number;
  inline_styles?: number;
  external_stylesheets?: number;
  external_scripts?: number;
  forms?: number;
  videos?: number;
  aria_roles?: number;
  social_links?: number;
  https?: boolean;
  favicon?: boolean;
  html_lang?: string;
  unlabelled_inputs?: number;
}

export interface FactualMetricsData {
  word_count: number;
  headings: FactualHeadings;
  cta_count: number;
  links: FactualLinks;
  image_count: number;
  missing_alt_percent: number;
  meta: FactualMeta;
  advanced?: FactualAdvancedDiagnostics;
}

export interface FactualMetricsPayload {
  url: string;
  metrics: FactualMetricsData;
}
