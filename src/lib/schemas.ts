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
    };
    issues: BackendAuditIssue[];
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
