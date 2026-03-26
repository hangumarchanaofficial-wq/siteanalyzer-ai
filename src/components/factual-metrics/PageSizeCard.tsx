"use client";

import { HardDrive } from "lucide-react";
import clsx from "clsx";
import { PageSizeMetrics } from "@/types/extended-metrics";

interface PageSizeCardProps {
  data: PageSizeMetrics;
  className?: string;
}

interface SizeSegment {
  label: string;
  kb: number;
  color: string;
  barColor: string;
}

/**
 * Page Size card with total weight prominently displayed and a
 * horizontal stacked bar + breakdown legend beneath.
 *
 * Card shell identical to MetricCard: glass, rounded-2xl, p-5.
 */
export function PageSizeCard({ data, className }: PageSizeCardProps) {
  // Build segments from whatever is available.
  const segments: SizeSegment[] = [];
  if (data.images_kb !== undefined)
    segments.push({
      label: "Images",
      kb: data.images_kb,
      color: "text-accent-blue",
      barColor: "bg-accent-blue",
    });
  if (data.js_kb !== undefined)
    segments.push({
      label: "JS",
      kb: data.js_kb,
      color: "text-amber-400",
      barColor: "bg-amber-400",
    });
  if (data.html_kb !== undefined)
    segments.push({
      label: "HTML",
      kb: data.html_kb,
      color: "text-accent-cyan",
      barColor: "bg-accent-cyan",
    });
  if (data.css_kb !== undefined)
    segments.push({
      label: "CSS",
      kb: data.css_kb,
      color: "text-accent-violet",
      barColor: "bg-accent-violet",
    });

  const segmentTotal = segments.reduce((sum, s) => sum + s.kb, 0);

  // Semantic rating for total size.
  const sizeRating: "good" | "warn" | "bad" =
    data.total_mb <= 2 ? "good" : data.total_mb <= 5 ? "warn" : "bad";

  const SIZE_VALUE_COLOR: Record<string, string> = {
    good: "text-emerald-400",
    warn: "text-amber-400",
    bad: "text-red-400",
  };

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
            <HardDrive className="w-4 h-4" />
          </span>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-white/40">
            Page Size
          </h3>
        </div>

        {/* Primary value */}
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span
              className={clsx(
                "text-3xl font-bold tracking-tight",
                SIZE_VALUE_COLOR[sizeRating],
              )}
            >
              {data.total_mb}
            </span>
            <span className="text-xs text-white/40">MB total</span>
          </div>
        </div>

        {/* Stacked bar */}
        {segments.length > 0 && (
          <div className="mt-4">
            <div className="h-2 flex rounded-full overflow-hidden bg-white/[0.04]">
              {segments.map((seg) => {
                const pct = segmentTotal > 0 ? (seg.kb / segmentTotal) * 100 : 0;
                return (
                  <div
                    key={seg.label}
                    className={clsx("transition-all duration-700", seg.barColor)}
                    style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              {segments.map((seg) => (
                <div key={seg.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={clsx("w-2 h-2 rounded-full", seg.barColor)} />
                    <span className="text-[10px] uppercase tracking-wider text-white/30">
                      {seg.label}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-white/60 tabular-nums">
                    {formatKb(seg.kb)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatKb(kb: number): string {
  if (kb >= 1000) return `${(kb / 1000).toFixed(1)} MB`;
  return `${kb} KB`;
}
