"use client";

import clsx from "clsx";
import { ExtendedMetricsData } from "@/types/extended-metrics";
import { PerformanceCard } from "./PerformanceCard";
import { PageSizeCard } from "./PageSizeCard";
import { ResourceBreakdownCard } from "./ResourceBreakdownCard";
import { AccessibilityCard } from "./AccessibilityCard";

interface ExtendedMetricsRowProps {
  data: ExtendedMetricsData;
  className?: string;
}

export function ExtendedMetricsRow({
  data,
  className = "",
}: ExtendedMetricsRowProps) {
  const cards = [
    data.performance ? <PerformanceCard key="performance" data={data.performance} /> : null,
    data.page_size ? <PageSizeCard key="page-size" data={data.page_size} /> : null,
    data.resources ? <ResourceBreakdownCard key="resources" data={data.resources} /> : null,
    data.accessibility ? <AccessibilityCard key="accessibility" data={data.accessibility} /> : null,
  ].filter(Boolean);

  if (cards.length === 0) return null;

  const gridClassName =
    cards.length === 1
      ? "grid-cols-1"
      : cards.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : cards.length === 3
          ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
          : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4";

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-white tracking-tight">
          Extended Metrics
        </h3>
        <p className="mt-1 text-sm text-white/40">
          Additional technical signals extracted from the rendered page and network lifecycle.
        </p>
      </div>

      <div className={clsx("grid gap-4 auto-rows-fr", gridClassName)}>
        {cards}
      </div>
    </div>
  );
}
