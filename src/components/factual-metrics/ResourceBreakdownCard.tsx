"use client";

import { Blocks } from "lucide-react";
import clsx from "clsx";
import { ResourceMetrics } from "@/types/extended-metrics";

interface ResourceBreakdownCardProps {
  data: ResourceMetrics;
  className?: string;
}

/**
 * Resource Breakdown card — compact 3-column layout mirroring
 * the H1/H2/H3 treatment inside the existing Content Breakdown card.
 * Shows JS files, CSS files, and images in a visually balanced grid.
 *
 * Card shell identical to MetricCard: glass, rounded-2xl, p-5.
 */
export function ResourceBreakdownCard({
  data,
  className,
}: ResourceBreakdownCardProps) {
  const total = data.js_files + data.css_files + data.images;
  const maxCount = Math.max(data.js_files, data.css_files, data.images, 1);

  const resources = [
    {
      label: "JS Files",
      count: data.js_files,
      color: "bg-amber-400",
      textColor: "text-amber-400",
    },
    {
      label: "CSS Files",
      count: data.css_files,
      color: "bg-accent-cyan",
      textColor: "text-accent-cyan",
    },
    {
      label: "Images",
      count: data.images,
      color: "bg-accent-blue",
      textColor: "text-accent-blue",
    },
  ];

  return (
    <div
      className={clsx(
        "group relative glass rounded-2xl p-5 hover:shadow-card-hover transition-all duration-300",
        "hover:border-white/[0.08] hover:bg-surface-2/80",
        className,
      )}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(167,239,255,0.08),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white/30">
            <Blocks className="w-4 h-4" />
          </span>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-white/40">
            Resources
          </h3>
          <span className="ml-auto text-xs text-white/25 font-medium tabular-nums">
            {total} total
          </span>
        </div>

        {/* 3-column count display — mirrors Headings card pattern */}
        <div className="mt-3">
          <div className="grid grid-cols-3 gap-3">
            {resources.map((r) => (
              <div key={r.label} className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">
                  {r.label}
                </p>
                <p className={clsx("text-lg font-semibold", r.textColor)}>
                  {r.count}
                </p>
              </div>
            ))}
          </div>

          {/* Proportional bars — mirrors Headings card bar treatment */}
          <div className="mt-4 space-y-2.5">
            {resources.map((r) => {
              const widthPct = maxCount > 0 ? (r.count / maxCount) * 100 : 0;
              return (
                <div key={r.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/25">{r.label}</span>
                    <span className="text-[10px] text-white/25 tabular-nums">
                      {total > 0 ? Math.round((r.count / total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        r.color,
                      )}
                      style={{
                        width: `${Math.max(widthPct, r.count > 0 ? 6 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
