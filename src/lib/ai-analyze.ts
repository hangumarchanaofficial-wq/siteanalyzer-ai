import { AuditInsight, AuditRecommendation, AuditResult } from "@/types/audit";
import {
    AuditJobEvent,
    AuditJobStatusResponse,
    BackendAiReport,
    BackendAuditIssue,
    BackendAuditResponse,
} from "@/lib/schemas";

const CATEGORY_META: Record<
    string,
    { title: string; category: AuditInsight["category"]; icon: string }
> = {
    seo_structure: { title: "SEO Structure", category: "seo", icon: "search" },
    messaging_clarity: {
        title: "Messaging Clarity",
        category: "messaging",
        icon: "message-circle",
    },
    cta_usage: { title: "CTA Usage", category: "cta", icon: "mouse-pointer-click" },
    content_depth: { title: "Content Depth", category: "content", icon: "file-text" },
    ux_concerns: { title: "UX Concerns", category: "ux", icon: "layout" },
    accessibility: {
        title: "Accessibility",
        category: "accessibility",
        icon: "eye",
    },
};

function clampScore(score: number) {
    return Math.max(35, Math.min(96, Math.round(score)));
}

function severityPenalty(severity: BackendAuditIssue["severity"]) {
    if (severity === "high") return 18;
    if (severity === "medium") return 10;
    return 4;
}

function splitInsightDetails(summary: string, rawIssue?: BackendAuditIssue, metricLine?: string) {
    const details = summary
        .split(/(?<=[.!?])\s+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 3);

    if (metricLine) {
        details.unshift(metricLine);
    }

    if (rawIssue) {
        details.push(rawIssue.suggested_fix);
    }

    return Array.from(new Set(details)).slice(0, 5);
}

function calculateScores(data: BackendAuditResponse) {
    const issuesByCategory = data.ai_report.issues.reduce<Record<string, BackendAuditIssue[]>>(
        (acc, issue) => {
            acc[issue.category] ??= [];
            acc[issue.category].push(issue);
            return acc;
        },
        {}
    );

    const seoBase =
        88 -
        (data.metrics.meta.description ? 0 : 10) -
        (data.metrics.headings.h1 === 1 ? 0 : 8) -
        (issuesByCategory.seo ?? []).reduce((sum, issue) => sum + severityPenalty(issue.severity), 0);

    const messagingBase =
        76 +
        Math.min(data.metrics.word_count / 250, 8) -
        ((data.metrics.headings.h2 === 0 ? 8 : 0) + (data.metrics.word_count < 300 ? 10 : 0));

    const ctaBase =
        68 +
        Math.min(data.metrics.cta_count * 6, 18) -
        (data.metrics.cta_count === 0 ? 18 : 0);

    const contentBase =
        78 +
        Math.min(data.metrics.word_count / 180, 12) -
        (issuesByCategory.content ?? []).reduce(
            (sum, issue) => sum + severityPenalty(issue.severity),
            0
        );

    const uxBase =
        82 -
        (issuesByCategory.ux ?? []).reduce((sum, issue) => sum + severityPenalty(issue.severity), 0) -
        (data.metrics.links.external > data.metrics.links.internal ? 6 : 0);

    const accessibilityBase =
        88 -
        Math.round(data.metrics.missing_alt_percent / 3) -
        (issuesByCategory.accessibility ?? []).reduce(
            (sum, issue) => sum + severityPenalty(issue.severity),
            0
        );

    return {
        seo: clampScore(seoBase),
        messaging: clampScore(messagingBase),
        cta: clampScore(ctaBase),
        content: clampScore(contentBase),
        ux: clampScore(uxBase),
        accessibility: clampScore(accessibilityBase),
    };
}

function mapInsights(data: BackendAuditResponse, scores: ReturnType<typeof calculateScores>): AuditInsight[] {
    const firstIssueByCategory = data.ai_report.issues.reduce<Record<string, BackendAuditIssue | undefined>>(
        (acc, issue) => {
            acc[issue.category] ??= issue;
            return acc;
        },
        {}
    );

    return [
        {
            id: "seo-structure",
            category: "seo",
            title: CATEGORY_META.seo_structure.title,
            score: scores.seo,
            icon: CATEGORY_META.seo_structure.icon,
            summary: data.ai_report.insights.seo_structure,
            details: splitInsightDetails(
                data.ai_report.insights.seo_structure,
                firstIssueByCategory.seo,
                `Heading structure: H1 ${data.metrics.headings.h1}, H2 ${data.metrics.headings.h2}, H3 ${data.metrics.headings.h3}.`
            ),
        },
        {
            id: "messaging-clarity",
            category: "messaging",
            title: CATEGORY_META.messaging_clarity.title,
            score: scores.messaging,
            icon: CATEGORY_META.messaging_clarity.icon,
            summary: data.ai_report.insights.messaging_clarity,
            details: splitInsightDetails(
                data.ai_report.insights.messaging_clarity,
                undefined,
                `Content excerpt: ${data.content_signals.main_text_excerpt || "No main text excerpt extracted."}`
            ),
        },
        {
            id: "cta-usage",
            category: "cta",
            title: CATEGORY_META.cta_usage.title,
            score: scores.cta,
            icon: CATEGORY_META.cta_usage.icon,
            summary: data.ai_report.insights.cta_usage,
            details: splitInsightDetails(
                data.ai_report.insights.cta_usage,
                firstIssueByCategory.ux,
                `CTA count: ${data.metrics.cta_count}. Extracted labels: ${data.content_signals.cta_texts.slice(0, 4).join(", ") || "none"}.`
            ),
        },
        {
            id: "content-depth",
            category: "content",
            title: CATEGORY_META.content_depth.title,
            score: scores.content,
            icon: CATEGORY_META.content_depth.icon,
            summary: data.ai_report.insights.content_depth,
            details: splitInsightDetails(
                data.ai_report.insights.content_depth,
                firstIssueByCategory.content,
                `Word count: ${data.metrics.word_count}.`
            ),
        },
        {
            id: "ux-concerns",
            category: "ux",
            title: CATEGORY_META.ux_concerns.title,
            score: scores.ux,
            icon: CATEGORY_META.ux_concerns.icon,
            summary: data.ai_report.insights.ux_concerns,
            details: splitInsightDetails(
                data.ai_report.insights.ux_concerns,
                firstIssueByCategory.ux,
                `Link mix: ${data.metrics.links.internal} internal, ${data.metrics.links.external} external.`
            ),
        },
        {
            id: "accessibility",
            category: "accessibility",
            title: CATEGORY_META.accessibility.title,
            score: scores.accessibility,
            icon: CATEGORY_META.accessibility.icon,
            summary: `Images missing alt text: ${data.metrics.missing_alt_percent}% of ${data.metrics.image_count}. ${data.ai_report.insights.ux_concerns}`,
            details: splitInsightDetails(
                data.ai_report.insights.ux_concerns,
                firstIssueByCategory.accessibility,
                `Missing alt text: ${data.metrics.missing_alt_percent}% across ${data.metrics.image_count} images.`
            ),
        },
    ];
}

function mapPriority(severity: BackendAuditIssue["severity"]): AuditRecommendation["priority"] {
    if (severity === "high") return "critical";
    if (severity === "medium") return "high";
    return "medium";
}

function mapRecommendations(aiReport: BackendAiReport): AuditRecommendation[] {
    return aiReport.issues.map((issue, index) => ({
        id: `issue-${index + 1}`,
        title: issue.issue,
        priority: mapPriority(issue.severity),
        category: issue.category.toUpperCase(),
        explanation: issue.why_it_matters,
        action: issue.suggested_fix,
        impact:
            issue.severity === "high"
                ? "High impact on visibility, experience, or accessibility."
                : issue.severity === "medium"
                  ? "Meaningful improvement opportunity with moderate product impact."
                  : "Incremental quality improvement for the audited page.",
    }));
}

export function normalizeAuditResult(data: BackendAuditResponse): AuditResult {
    const scores = calculateScores(data);
    const insights = mapInsights(data, scores);
    const overallScore = clampScore(
        Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.values(scores).length
    );

    return {
        url: data.url,
        timestamp: new Date().toISOString(),
        overallScore,
        status: "live",
        metrics: {
            wordCount: data.metrics.word_count,
            headings: data.metrics.headings,
            ctaCount: data.metrics.cta_count,
            links: data.metrics.links,
            images: {
                total: data.metrics.image_count,
                missingAlt: Math.round((data.metrics.image_count * data.metrics.missing_alt_percent) / 100),
                missingAltPercent: data.metrics.missing_alt_percent,
            },
            meta: {
                title: data.metrics.meta.title,
                titleLength: data.metrics.meta.title?.length ?? 0,
                description: data.metrics.meta.description,
                descriptionLength: data.metrics.meta.description?.length ?? 0,
                hasOgTags: false,
                hasTwitterCards: false,
            },
            performance: {
                activeClusters: Math.max(1, Math.min(data.metrics.cta_count, 6)),
                engagementScore: clampScore((scores.cta + scores.messaging + scores.ux) / 3),
            },
            mediaAssets: data.metrics.image_count,
        },
        insights,
        recommendations: mapRecommendations(data.ai_report),
    };
}

export async function requestAudit(url: string, backend?: "ollama" | "openrouter") {
    const response = await fetch("/api/audit", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(backend ? { url, backend } : { url }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const message =
            payload?.error ||
            payload?.detail ||
            payload?.message ||
            "Audit request failed.";
        throw new Error(message);
    }

    return payload as AuditResult;
}

export async function startAuditJob(url: string, backend?: "ollama" | "openrouter") {
    const response = await fetch("/api/audit/start", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(backend ? { url, backend } : { url }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(payload?.error || payload?.detail || "Failed to start audit.");
    }

    return payload as AuditJobStatusResponse;
}

export async function getAuditJobStatus(jobId: string) {
    const response = await fetch(`/api/audit/status/${jobId}`, {
        cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(payload?.error || payload?.detail || "Failed to fetch audit status.");
    }

    const status = payload as AuditJobStatusResponse & { normalizedResult?: AuditResult };

    if (status.status === "success" && status.result && !status.normalizedResult) {
        return {
            ...status,
            normalizedResult: normalizeAuditResult(status.result),
        };
    }

    return {
        ...status,
        events: Array.isArray(status.events) ? (status.events as AuditJobEvent[]) : [],
    };
}
