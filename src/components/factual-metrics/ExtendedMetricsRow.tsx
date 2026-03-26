"use client";

import { ExtendedMetricsData } from "@/types/extended-metrics";
import { PerformanceCard } from "./PerformanceCard";
import { PageSizeCard } from "./PageSizeCard";
import { ResourceBreakdownCard } from "./ResourceBreakdownCard";
import { AccessibilityCard } from "./AccessibilityCard";

interface ExtendedMetricsRowProps {
  data: ExtendedMetricsData;
  className?: string;
}

/**
 * Grid orchestrator for the four new metric cards.
 *
 * Renders only the cards whose data sections exist — the grid
 * adapts from 1 to 4 columns based on how many are present.
 *
 * Grid breakpoints mirror the existing MetricsGrid:
 *   mobile → 1 col
 *   sm     → 2 col
 *   lg     → 4 col  (or fewer, auto-filled)
 */
export function ExtendedMetricsRow({
  data,
  className = "",
}: ExtendedMetricsRowProps) {
  const hasPerf = !!data.performance;
  const hasSize = !!data.page_size;
  const hasRes = !!data.resources;
  const hasA11y = !!data.accessibility;

  // Don't render anything if the entire section is empty.
  if (!hasPerf && !hasSize && !hasRes && !hasA11y) return null;

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
    >
      {hasPerf && <PerformanceCard data={data.performance!} />}
      {hasSize && <PageSizeCard data={data.page_size!} />}
      {hasRes && <ResourceBreakdownCard data={data.resources!} />}
      {hasA11y && <AccessibilityCard data={data.accessibility!} />}
    </div>
  );
}
