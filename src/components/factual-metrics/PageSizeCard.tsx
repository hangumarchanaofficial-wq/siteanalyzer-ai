"use client";

import { HardDrive } from "lucide-react";
import { PageSizeMetrics } from "@/types/extended-metrics";
import { BreakdownCard, BreakdownSegment } from "./BreakdownCard";

interface PageSizeCardProps {
  data: PageSizeMetrics;
  className?: string;
}

export function PageSizeCard({ data, className }: PageSizeCardProps) {
  const rawSegments: Array<BreakdownSegment | null> = [
    data.images_kb !== undefined
      ? {
          label: "Images",
          value: formatKb(data.images_kb),
          rawValue: data.images_kb,
          barClassName: "bg-accent-blue",
          textClassName: "text-accent-blue",
        }
      : null,
    data.js_kb !== undefined
      ? {
          label: "JS",
          value: formatKb(data.js_kb),
          rawValue: data.js_kb,
          barClassName: "bg-amber-400",
          textClassName: "text-amber-400",
        }
      : null,
    data.html_kb !== undefined
      ? {
          label: "HTML",
          value: formatKb(data.html_kb),
          rawValue: data.html_kb,
          barClassName: "bg-accent-cyan",
          textClassName: "text-accent-cyan",
        }
      : null,
    data.css_kb !== undefined
      ? {
          label: "CSS",
          value: formatKb(data.css_kb),
          rawValue: data.css_kb,
          barClassName: "bg-accent-violet",
          textClassName: "text-accent-violet",
        }
      : null,
  ];

  const segments = rawSegments.filter(
    (segment): segment is BreakdownSegment => segment !== null,
  );

  return (
    <BreakdownCard
      title="Page Size"
      icon={<HardDrive className="w-4 h-4" />}
      className={className}
      totalLabel="Total page weight"
      totalValue={
        typeof data.total_mb === "number" ? `${data.total_mb.toFixed(1)} MB` : "Unknown"
      }
      segments={segments}
      stacked
    />
  );
}

function formatKb(kb: number): string {
  if (kb >= 1000) return `${(kb / 1000).toFixed(1)} MB`;
  return `${kb.toFixed(0)} KB`;
}
