// ─────────────────────────────────────────────────────────────────────
// schemas.ts — TypeScript interfaces matching backend JSON payloads.
// ─────────────────────────────────────────────────────────────────────

export interface BackendAuditIssue {
    category: "seo" | "ux" | "content" | "accessibility";
    severity: "low" | "medium" | "high";
    metric_reference: string;
    issue: string;
    why_it_matters: string;
    suggested_fix: string;
}

export interface BackendAiReport {
    summary: string;
    insights: {
        seo_structure: string;
        messaging_clarity: string;
        cta_usage: string;
        content_depth: string;
        ux_concerns: string;
        performance_health?: string;
        accessibility_audit?: string;
    };
    issues: BackendAuditIssue[];
}

export interface BackendAdvancedDiagnostics {
    load_time_ms?: number;
    lcp_ms?: number;
    cls?: number;
    total_kb?: number;
    html_kb?: number;
    js_kb?: number;
    css_kb?: number;
    images_kb?: number;
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
    html_lang?: string | null;
    unlabelled_inputs?: number;
}

export interface BackendAttentionZone {
    id: string;
    type: string;
    label: string;
    intensity: number;
    level: "high" | "medium" | "low";
    x: number;
    y: number;
    width: number;
    height: number;
    above_fold: boolean;
    region: string;
}

export interface BackendAttentionModel {
    viewport: {
        width: number;
        height: number;
    };
    zones: BackendAttentionZone[];
    stats: {
        above_fold_share: number;
        scanned_elements: number;
        dominant_region: string | null;
        strongest_zone: string | null;
    };
}

export interface AuditJobEvent {
    timestamp: string;
    stage: string;
    detail: string;
    percent: number;
}

export interface BackendAuditResponse {
    url: string;
    page_type_hint: string;
    attention?: BackendAttentionModel;
    metrics: {
        word_count: number;
        headings: {
            h1: number;
            h2: number;
            h3: number;
        };
        cta_count: number;
        links: {
            internal: number;
            external: number;
        };
        image_count: number;
        missing_alt_percent: number;
        meta: {
            title: string | null;
            description: string | null;
        };
        advanced?: BackendAdvancedDiagnostics;
    };
    content_signals: {
        h2_texts: string[];
        h3_texts: string[];
        cta_texts: string[];
        main_text_excerpt: string;
    };
    ai_report: BackendAiReport;
}

export interface AuditJobStatusResponse {
    job_id: string;
    status: "running" | "success" | "error";
    url: string;
    backend: "ollama" | "openrouter";
    stage: string;
    detail: string;
    percent: number;
    created_at: string;
    updated_at: string;
    events: AuditJobEvent[];
    result: BackendAuditResponse | null;
    error: string | null;
}
