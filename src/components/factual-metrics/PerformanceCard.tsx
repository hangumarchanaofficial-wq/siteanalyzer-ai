"use client";

import { Gauge } from "lucide-react";
import clsx from "clsx";
import { PerformanceMetrics } from "@/types/extended-metrics";

interface PerformanceCardProps {
  data: PerformanceMetrics;
  className?: string;
}

// ── Threshold helpers (Web Vitals good / needs-improvement / poor) ───

type Rating = "good" | "warn" | "bad";

function rateLoadTime(ms: number): Rating {
  if (ms <= 2500) return "good";
  if (ms <= 5000) return "warn";
  return "bad";
}

function rateLcp(ms: number): Rating {
  if (ms <= 2500) return "good";
  if (ms <= 4000) return "warn";
  return "bad";
}

function rateCls(score: number): Rating {
  if (score <= 0.1) return "good";
  if (score <= 0.25) return "warn";
  return "bad";
}

const RATING_DOT: Record<Rating, string> = {
  good: "bg-emerald-400",
  warn: "bg-amber-400",
  bad: "bg-red-400",
};

const RATING_TEXT: Record<Rating, string> = {
  good: "text-emerald-400",
  warn: "text-amber-400",
  bad: "text-red-400",
};

const RATING_LABEL: Record<Rating, string> = {
  good: "Good",
  warn: "Needs Work",
  bad: "Poor",
};

const RATING_BG: Record<Rating, string> = {
  good: "bg-emerald-400/[0.08] border-emerald-400/10",
  warn: "bg-amber-400/[0.08] border-amber-400/10",
  bad: "bg-red-400/[0.08] border-red-400/10",
};

// ── Gauge bar: maps a value to a 0–100% fill within a known range ───

function gaugePercent(value: number, goodMax: number, poorMin: number): number {
  // Invert so that lower values → higher fill (better).
  // Clamp to 5–100%.
  const pct = Math.max(5, Math.min(100, 100 - ((value - goodMax) / (poorMin - goodMax)) * 100));
  return Math.round(pct);
}

/**
 * Performance card showing Load Time, LCP, and CLS with colour-coded
 * status indicators and mini gauge bars.
 *
 * Card shell mirrors MetricCard: glass, rounded-2xl, p-5, group hover
 * glow, identical header treatment.
 */
export function PerformanceCard({ data, className }: PerformanceCardProps) {
  const loadRating = rateLoadTime(data.load_time_ms);
  const lcpRating = data.lcp_ms !== undefined ? rateLcp(data.lcp_ms) : null;
  const clsRating = data.cls !== undefined ? rateCls(data.cls) : null;

  // Determine the worst rating for the header accent.
  const ratings = [loadRating, lcpRating, clsRating].filter(Boolean) as Rating[];
  const worstRating: Rating = ratings.includes("bad")
    ? "bad"
    : ratings.includes("warn")
      ? "warn"
      : "good";

  return (
    <div
      className={clsx(
        "group relative glass rounded-2xl p-5 hover:shadow-card-hover transition-all duration-300",
        "hover:border-white/[0.08] hover:bg-surface-2/80",
        className,
      )}
    >
      {/* Hover glow — accent matches worst rating */}
      <div
        className={clsx(
          "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
          worstRating === "good"
            ? "bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.08),transparent_60%)]"
            : worstRating === "warn"
              ? "bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_60%)]"
              : "bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.08),transparent_60%)]",
        )}
      />

      <div className="relative">
        {/* Header — identical pattern to MetricCard */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white/30">
            <Gauge className="w-4 h-4" />
          </span>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-white/40">
            Performance
          </h3>
        </div>

        {/* Primary value: Load Time */}
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span
              className={clsx(
                "text-3xl font-bold tracking-tight",
                RATING_TEXT[loadRating],
              )}
            >
              {(data.load_time_ms / 1000).toFixed(1)}
            </span>
            <span className="text-xs text-white/40">sec load time</span>
          </div>
        </div>

        {/* Sub-metrics: LCP + CLS */}
        <div className="mt-4 space-y-3">
          {/* LCP */}
          {data.lcp_ms !== undefined && lcpRating && (
            <PerfRow
              label="LCP"
              value={`${(data.lcp_ms / 1000).toFixed(1)}s`}
              rating={lcpRating}
              barPercent={gaugePercent(data.lcp_ms, 2500, 6000)}
            />
          )}

          {/* CLS */}
          {data.cls !== undefined && clsRating && (
            <PerfRow
              label="CLS"
              value={data.cls.toFixed(2)}
              rating={clsRating}
              barPercent={gaugePercent(data.cls, 0.1, 0.4)}
            />
          )}
        </div>

        {/* Overall badge */}
        <div className={clsx("mt-4 px-3 py-2 rounded-xl border", RATING_BG[worstRating])}>
          <div className="flex items-center gap-2">
            <div className={clsx("w-1.5 h-1.5 rounded-full", RATING_DOT[worstRating])} />
            <p className={clsx("text-xs font-medium", RATING_TEXT[worstRating])}>
              {RATING_LABEL[worstRating]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Internal sub-row ─────────────────────────────────────────────────

function PerfRow({
  label,
  value,
  rating,
  barPercent,
}: {
  label: string;
  value: string;
  rating: Rating;
  barPercent: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={clsx("w-1.5 h-1.5 rounded-full", RATING_DOT[rating])} />
          <span className="text-[10px] uppercase tracking-wider text-white/30">
            {label}
          </span>
        </div>
        <span className={clsx("text-xs font-semibold tabular-nums", RATING_TEXT[rating])}>
          {value}
        </span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-1000",
            rating === "good"
              ? "bg-emerald-400"
              : rating === "warn"
                ? "bg-amber-400"
                : "bg-red-400",
          )}
          style={{ width: `${barPercent}%` }}
        />
      </div>
    </div>
  );
}
