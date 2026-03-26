"use client";

import {
  BarChart3,
  FileText,
  MousePointerClick,
  Layers,
} from "lucide-react";
import { FactualMetricsData } from "@/types/factual-metrics";
import { SectionContainer } from "./SectionContainer";
import { StatCard } from "./StatCard";
import { HeadingBreakdownCard } from "./HeadingBreakdownCard";
import { MetaInfoCard } from "./MetaInfoCard";
import { LinksSummaryCard } from "./LinksSummaryCard";
import { ImageDiagnosticsCard } from "./ImageDiagnosticsCard";
import { AdvancedDiagnosticsGrid } from "./AdvancedDiagnosticsGrid";

interface FactualMetricsSectionProps {
  metrics: FactualMetricsData;
  className?: string;
}

/**
 * Top-level orchestrator component for the Factual Metrics dashboard
 * section.  Renders core extracted metrics in a responsive grid and
 * optionally shows the Advanced Diagnostics sub-section when the data
 * includes the `advanced` payload.
 */
export function FactualMetricsSection({
  metrics,
  className = "",
}: FactualMetricsSectionProps) {
  const hasAdvanced =
    metrics.advanced && Object.keys(metrics.advanced).length > 0;

  return (
    <div className={`space-y-10 ${className}`}>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          CORE METRICS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <SectionContainer
        title="Factual Metrics"
        subtitle="Directly extracted page diagnostics from the rendered webpage"
        icon={<BarChart3 className="w-5 h-5" />}
      >
        {/* ── Row 1: primary stat cards ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Word Count"
            value={metrics.word_count}
            unit="words"
            icon={<FileText className="w-4 h-4" />}
            status={
              metrics.word_count >= 800
                ? "good"
                : metrics.word_count >= 300
                  ? "neutral"
                  : "warn"
            }
          />

          <HeadingBreakdownCard headings={metrics.headings} />

          <StatCard
            label="CTAs Found"
            value={metrics.cta_count}
            unit="actions"
            icon={<MousePointerClick className="w-4 h-4" />}
            status={
              metrics.cta_count >= 2 && metrics.cta_count <= 8
                ? "good"
                : metrics.cta_count === 0
                  ? "bad"
                  : "warn"
            }
          />

          <ImageDiagnosticsCard
            imageCount={metrics.image_count}
            missingAltPercent={metrics.missing_alt_percent}
          />
        </div>

        {/* ── Row 2: links card + meta card (wider) ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <LinksSummaryCard links={metrics.links} />

          <MetaInfoCard
            meta={metrics.meta}
            className="lg:col-span-2"
          />
        </div>
      </SectionContainer>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ADVANCED DIAGNOSTICS (only when data is present)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {hasAdvanced && (
        <SectionContainer
          title="Advanced Diagnostics"
          subtitle="Extended page-level technical signals detected during rendering"
          icon={<Layers className="w-5 h-5" />}
        >
          <AdvancedDiagnosticsGrid advanced={metrics.advanced!} />
        </SectionContainer>
      )}
    </div>
  );
}
