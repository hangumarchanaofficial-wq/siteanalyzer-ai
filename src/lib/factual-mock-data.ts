// ─────────────────────────────────────────────────────────────────────
// factual-mock-data.ts — Realistic mock payload for the Factual Metrics
// section.  Replace with real backend data when wiring up.
// ─────────────────────────────────────────────────────────────────────

import { FactualMetricsPayload } from "@/types/factual-metrics";

export const mockFactualPayload: FactualMetricsPayload = {
  url: "https://example.com",
  metrics: {
    word_count: 1637,
    headings: { h1: 0, h2: 3, h3: 2 },
    cta_count: 73,
    links: { internal: 370, external: 76, total: 446 },
    image_count: 234,
    missing_alt_percent: 54,
    meta: {
      title: "Example — The Leading Platform for Modern Digital Experiences",
      description:
        "Build, deploy, and scale websites with confidence. Our platform gives teams the tools they need to ship production-grade experiences faster than ever.",
    },
    advanced: {
      load_time_ms: 10130,
      status_code: 200,
      dom_elements: 3508,
      inline_styles: 566,
      external_stylesheets: 8,
      external_scripts: 70,
      forms: 2,
      videos: 0,
      aria_roles: 31,
      social_links: 13,
      https: true,
      favicon: true,
      html_lang: "en",
      unlabelled_inputs: 5,
    },
  },
};

/** Payload with no advanced diagnostics — for testing graceful fallback. */
export const mockFactualPayloadMinimal: FactualMetricsPayload = {
  url: "https://minimal-example.com",
  metrics: {
    word_count: 412,
    headings: { h1: 1, h2: 2, h3: 0 },
    cta_count: 2,
    links: { internal: 8, external: 1, total: 9 },
    image_count: 5,
    missing_alt_percent: 40,
    meta: {
      title: "Minimal Page",
      description: null,
    },
  },
};
