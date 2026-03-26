"use client";

import { AuditResult } from "@/types/audit";
import { FactualMetricsSection } from "@/components/factual-metrics/FactualMetricsSection";
import { FactualMetricsData } from "@/types/factual-metrics";
import { ExtendedMetricsData } from "@/types/extended-metrics";
import { ExtendedMetricsRow } from "@/components/factual-metrics/ExtendedMetricsRow";
import { InsightsPanel } from "@/components/insights-panel";
import { RecommendationsSection } from "@/components/RecommendationsSection";
import { AttentionHeatmap } from "@/components/AttentionHeatmap";
import { ScoreRing } from "@/components/ScoreRing";
import {
  Globe,
  Clock,
  Download,
  RotateCcw,
  ExternalLink,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { GlowBadge } from "@/components/GlowBadge";

interface AuditDashboardProps {
  result: AuditResult;
  onReset: () => void;
}

function toFactualMetrics(result: AuditResult): FactualMetricsData {
  const m = result.metrics;
  return {
    word_count: m.wordCount,
    headings: m.headings,
    cta_count: m.ctaCount,
    links: {
      internal: m.links.internal,
      external: m.links.external,
      total: m.links.internal + m.links.external,
    },
    image_count: m.images.total,
    missing_alt_percent: m.images.missingAltPercent,
    meta: {
      title: m.meta.title,
      description: m.meta.description,
    },
    advanced: result.advanced,
  };
}

function toExtendedMetrics(result: AuditResult): ExtendedMetricsData {
  const advanced = result.advanced;

  if (!advanced) {
    return {};
  }

  return {
    performance:
      advanced.load_time_ms !== undefined ||
      advanced.lcp_ms !== undefined ||
      advanced.cls !== undefined
        ? {
            load_time_ms: advanced.load_time_ms ?? 0,
            lcp_ms: advanced.lcp_ms,
            cls: advanced.cls,
          }
        : undefined,
    page_size:
      advanced.total_kb !== undefined ||
      advanced.html_kb !== undefined ||
      advanced.js_kb !== undefined ||
      advanced.css_kb !== undefined ||
      advanced.images_kb !== undefined
        ? {
            total_mb: (advanced.total_kb ?? 0) / 1024,
            html_kb: advanced.html_kb,
            js_kb: advanced.js_kb,
            css_kb: advanced.css_kb,
            images_kb: advanced.images_kb,
          }
        : undefined,
    resources:
      advanced.external_scripts !== undefined ||
      advanced.external_stylesheets !== undefined
        ? {
            js_files: advanced.external_scripts ?? 0,
            css_files: advanced.external_stylesheets ?? 0,
            images: result.metrics.images.total,
          }
        : undefined,
    accessibility:
      advanced.unlabelled_inputs !== undefined || advanced.aria_roles !== undefined
        ? {
            unlabelled_inputs: advanced.unlabelled_inputs ?? 0,
            aria_roles: advanced.aria_roles ?? 0,
          }
        : undefined,
  };
}

export function AuditDashboard({ result, onReset }: AuditDashboardProps) {
  const timeAgo = getTimeAgo(result.timestamp);
  const factualMetrics = toFactualMetrics(result);
  const extendedMetrics = toExtendedMetrics(result);
  const topRecommendation = result.recommendations[0];
  const topInsight = result.insights[0];

  const quickStats = [
    {
      label: "Top Priority",
      value: topRecommendation?.priority?.toUpperCase() ?? "NONE",
      helper: topRecommendation?.title ?? "No critical recommendation generated",
      icon: <ShieldAlert className="w-4 h-4" />,
      tone:
        topRecommendation?.priority === "critical"
          ? "text-red-400"
          : topRecommendation?.priority === "high"
            ? "text-amber-400"
            : "text-emerald-400",
    },
    {
      label: "Load Time",
      value:
        result.advanced?.load_time_ms !== undefined
          ? `${(result.advanced.load_time_ms / 1000).toFixed(1)}s`
          : "Unknown",
      helper:
        result.advanced?.lcp_ms !== undefined
          ? `LCP ${(result.advanced.lcp_ms / 1000).toFixed(1)}s`
          : "Largest paint unavailable",
      icon: <Zap className="w-4 h-4" />,
      tone:
        result.advanced?.load_time_ms !== undefined &&
        result.advanced.load_time_ms > 5000
          ? "text-red-400"
          : "text-accent-blue",
    },
    {
      label: "Accessibility Risk",
      value: `${result.metrics.images.missingAltPercent.toFixed(0)}%`,
      helper: `${result.metrics.images.missingAlt} images missing alt text`,
      icon: <AlertTriangle className="w-4 h-4" />,
      tone:
        result.metrics.images.missingAltPercent > 25
          ? "text-red-400"
          : "text-amber-400",
    },
  ];

  const handleExport = () => {
    const url = new URL(result.url);
    const host = url.hostname.replace(/^www\./, "");
    const timestamp = new Date(result.timestamp).toISOString().replace(/[:.]/g, "-");
    const baseName = `${host}-audit-${timestamp}`;

    const markdown = [
      "# Audit Report",
      "",
      `URL: ${result.url}`,
      `Generated: ${new Date(result.timestamp).toLocaleString()}`,
      `Overall Score: ${result.overallScore}/100`,
      "",
      "## Summary",
      topInsight?.summary ?? "No summary available.",
      "",
      "## Metrics",
      `- Word Count: ${result.metrics.wordCount}`,
      `- H1/H2/H3: ${result.metrics.headings.h1}/${result.metrics.headings.h2}/${result.metrics.headings.h3}`,
      `- CTAs: ${result.metrics.ctaCount}`,
      `- Images: ${result.metrics.images.total}`,
      `- Missing Alt: ${result.metrics.images.missingAltPercent}%`,
      `- Internal Links: ${result.metrics.links.internal}`,
      `- External Links: ${result.metrics.links.external}`,
      result.advanced?.load_time_ms !== undefined
        ? `- Load Time: ${(result.advanced.load_time_ms / 1000).toFixed(2)}s`
        : "- Load Time: Unknown",
      "",
      "## Insights",
      ...result.insights.map(
        (insight) => `- ${insight.title} (${insight.score}): ${insight.summary}`,
      ),
      "",
      "## Recommendations",
      ...result.recommendations.map(
        (recommendation) =>
          `- [${recommendation.priority.toUpperCase()}] ${recommendation.title}: ${recommendation.action}`,
      ),
      "",
    ].join("\n");

    downloadFile(
      `${baseName}.md`,
      markdown,
      "text/markdown;charset=utf-8",
    );
    downloadFile(
      `${baseName}.json`,
      JSON.stringify(result, null, 2),
      "application/json;charset=utf-8",
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Audit Report
            </h2>
            <GlowBadge variant="success">Live Results</GlowBadge>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/40">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-white/60 font-mono text-xs">
                {result.url}
              </span>
              <ExternalLink className="w-3 h-3 opacity-40" />
            </div>
            <span className="text-white/20">·</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Generated {timeAgo}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white/50 bg-surface-3 border border-border-subtle rounded-xl hover:bg-surface-4 hover:text-white/70 transition-all duration-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Audit
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-black bg-white rounded-xl hover:bg-[#f1f3f5] transition-all duration-200"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 grid grid-cols-1 xl:grid-cols-[auto_minmax(0,1fr)] gap-6">
        <ScoreRing score={result.overallScore} size={120} />

        <div className="space-y-5 min-w-0">
          <div className="space-y-2">
            <p className="text-sm font-medium text-white/80">
              Overall Score
            </p>
            <p className="text-sm leading-6 text-white/55 max-w-3xl">
              {topInsight?.summary ??
                "Audit completed successfully. Review extracted metrics, AI insights, and recommendations below."}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-medium text-white/55">
                {result.insights.length} insight categories
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-medium text-white/55">
                {result.recommendations.length} prioritized fixes
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-medium text-white/55">
                {result.metrics.wordCount} words extracted
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4"
              >
                <div className="flex items-center gap-2 text-white/35">
                  {stat.icon}
                  <span className="text-[11px] uppercase tracking-[0.12em]">
                    {stat.label}
                  </span>
                </div>
                <p className={`mt-3 text-xl font-semibold tracking-tight ${stat.tone}`}>
                  {stat.value}
                </p>
                <p className="mt-1 text-xs leading-5 text-white/35">
                  {stat.helper}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
            <div className="flex items-center gap-2 text-white/35">
              <FileText className="w-4 h-4" />
              <span className="text-[11px] uppercase tracking-[0.12em]">
                Executive Note
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/55">
              {topRecommendation?.explanation ??
                "No recommendation explanation is available for this run."}
            </p>
            {topRecommendation && (
              <p className="mt-3 text-xs text-white/38">
                Recommended action:{" "}
                <span className="text-white/60">{topRecommendation.action}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <FactualMetricsSection metrics={factualMetrics} />
      <ExtendedMetricsRow data={extendedMetrics} />
      <InsightsPanel insights={result.insights} />
      <RecommendationsSection recommendations={result.recommendations} />
      <AttentionHeatmap attention={result.attention} />
    </div>
  );
}

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
