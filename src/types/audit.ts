import { FactualAdvancedDiagnostics } from "@/types/factual-metrics";

export interface AuditMetrics {
    wordCount: number;
    headings: {
        h1: number;
        h2: number;
        h3: number;
    };
    ctaCount: number;
    links: {
        internal: number;
        external: number;
    };
    images: {
        total: number;
        missingAlt: number;
        missingAltPercent: number;
    };
    meta: {
        title: string | null;
        titleLength: number;
        description: string | null;
        descriptionLength: number;
        hasOgTags: boolean;
        hasTwitterCards: boolean;
    };
    performance: {
        activeClusters: number;
        engagementScore: number;
    };
    mediaAssets: number;
}

export interface AuditInsight {
    id: string;
    category:
        | "seo"
        | "messaging"
        | "cta"
        | "content"
        | "ux"
        | "accessibility";
    title: string;
    score: number;
    summary: string;
    details: string[];
    icon: string;
}

export interface AuditRecommendation {
    id: string;
    title: string;
    priority: "critical" | "high" | "medium" | "low";
    category: string;
    explanation: string;
    action: string;
    impact: string;
}

export interface AuditAttentionZone {
    id: string;
    type: string;
    label: string;
    intensity: number;
    level: "high" | "medium" | "low";
    x: number;
    y: number;
    width: number;
    height: number;
    aboveFold: boolean;
    region: string;
}

export interface AuditAttentionModel {
    viewport: {
        width: number;
        height: number;
    };
    zones: AuditAttentionZone[];
    stats: {
        aboveFoldShare: number;
        scannedElements: number;
        dominantRegion: string | null;
        strongestZone: string | null;
    };
}

export interface AuditResult {
    url: string;
    timestamp: string;
    overallScore: number;
    metrics: AuditMetrics;
    advanced?: FactualAdvancedDiagnostics;
    attention?: AuditAttentionModel;
    insights: AuditInsight[];
    recommendations: AuditRecommendation[];
    status: "live" | "cached";
}

export type AuditState = "idle" | "loading" | "success" | "error";
