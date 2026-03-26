"use client";

import clsx from "clsx";
import { Gauge } from "lucide-react";
import { PerformanceMetrics } from "@/types/extended-metrics";
import { MultiMetricCard } from "./MultiMetricCard";

interface PerformanceCardProps {
  data: PerformanceMetrics;
  className?: string;
}

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

function gaugePercent(value: number, goodMax: number, poorMin: number): number {
  const pct = Math.max(
    5,
    Math.min(100, 100 - ((value - goodMax) / (poorMin - goodMax)) * 100),
  );
  return Math.round(pct);
}

export function PerformanceCard({ data, className }: PerformanceCardProps) {
  const loadRating =
    typeof data.load_time_ms === "number" ? rateLoadTime(data.load_time_ms) : "warn";
  const lcpRating = data.lcp_ms !== undefined ? rateLcp(data.lcp_ms) : null;
  const clsRating = data.cls !== undefined ? rateCls(data.cls) : null;

  const ratings = [loadRating, lcpRating, clsRating].filter(Boolean) as Rating[];
  const worstRating: Rating = ratings.includes("bad")
    ? "bad"
    : ratings.includes("warn")
      ? "warn"
      : "good";

  return (
    <MultiMetricCard
      title="Performance"
      icon={<Gauge className="w-4 h-4" />}
      className={className}
      glowClassName={
        worstRating === "good"
          ? "bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.08),transparent_60%)]"
          : worstRating === "warn"
            ? "bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_60%)]"
            : "bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.08),transparent_60%)]"
      }
      primaryValue={
        typeof data.load_time_ms === "number"
          ? (data.load_time_ms / 1000).toFixed(1)
          : "Unknown"
      }
      primaryUnit={
        typeof data.load_time_ms === "number" ? "sec load time" : undefined
      }
      primaryTone={loadRating}
      items={[
        {
          label: "Load Time",
          value:
            typeof data.load_time_ms === "number"
              ? `${(data.load_time_ms / 1000).toFixed(1)}s`
              : "Unknown",
          tone: loadRating,
          barPercent:
            typeof data.load_time_ms === "number"
              ? gaugePercent(data.load_time_ms, 2500, 7000)
              : 8,
        },
        {
          label: "LCP",
          value:
            typeof data.lcp_ms === "number"
              ? `${(data.lcp_ms / 1000).toFixed(1)}s`
              : "Unknown",
          tone: lcpRating ?? "neutral",
          barPercent:
            typeof data.lcp_ms === "number"
              ? gaugePercent(data.lcp_ms, 2500, 6000)
              : 8,
        },
        {
          label: "CLS",
          value: typeof data.cls === "number" ? data.cls.toFixed(2) : "Unknown",
          tone: clsRating ?? "neutral",
          barPercent:
            typeof data.cls === "number"
              ? gaugePercent(data.cls, 0.1, 0.4)
              : 8,
        },
      ]}
      footer={
        <div className={clsx("px-3 py-2 rounded-xl border", RATING_BG[worstRating])}>
          <div className="flex items-center gap-2">
            <div className={clsx("w-1.5 h-1.5 rounded-full", RATING_DOT[worstRating])} />
            <p className={clsx("text-xs font-medium", RATING_TEXT[worstRating])}>
              {RATING_LABEL[worstRating]}
            </p>
          </div>
        </div>
      }
    />
  );
}
