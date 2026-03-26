"use client";

import { Image as ImageIcon, AlertTriangle } from "lucide-react";
import clsx from "clsx";

interface ImageDiagnosticsCardProps {
  imageCount: number;
  missingAltPercent: number;
  className?: string;
}

/**
 * Card showing total image count and a visual indicator for
 * the missing-alt-text percentage.
 */
export function ImageDiagnosticsCard({
  imageCount,
  missingAltPercent,
  className,
}: ImageDiagnosticsCardProps) {
  const missingCount = Math.round((imageCount * missingAltPercent) / 100);

  // Semantic status based on missing alt %.
  const status: "good" | "warn" | "bad" =
    missingAltPercent <= 10
      ? "good"
      : missingAltPercent <= 35
        ? "warn"
        : "bad";

  const ringColor: Record<string, string> = {
    good: "stroke-emerald-400",
    warn: "stroke-amber-400",
    bad: "stroke-red-400",
  };

  const textColor: Record<string, string> = {
    good: "text-emerald-400",
    warn: "text-amber-400",
    bad: "text-red-400",
  };

  // SVG ring dimensions.
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (missingAltPercent / 100) * circumference;

  return (
    <div
      className={clsx(
        "group relative glass rounded-2xl p-5",
        "hover:shadow-card-hover hover:border-white/[0.08] hover:bg-surface-2/80",
        "transition-all duration-300",
        className,
      )}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-accent-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="w-4 h-4 text-white/30" />
          <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
            Images
          </h3>
        </div>

        <div className="flex items-start justify-between gap-4">
          {/* Left: counts */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight tabular-nums">
                {imageCount.toLocaleString()}
              </span>
              <span className="text-xs text-white/35 font-medium">images</span>
            </div>

            {/* Missing-alt callout */}
            <div className="mt-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <div className="flex items-center gap-2">
                {missingAltPercent > 0 && (
                  <AlertTriangle className={clsx("w-3.5 h-3.5", textColor[status])} />
                )}
                <span className="text-xs text-white/50">
                  <span className={clsx("font-semibold", textColor[status])}>
                    {missingCount}
                  </span>{" "}
                  missing alt text
                </span>
              </div>
            </div>
          </div>

          {/* Right: mini ring */}
          <div className="flex flex-col items-center shrink-0">
            <svg width="68" height="68" className="-rotate-90">
              <circle
                cx="34"
                cy="34"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="5"
              />
              <circle
                cx="34"
                cy="34"
                r={radius}
                fill="none"
                className={ringColor[status]}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
              />
            </svg>
            <span
              className={clsx(
                "text-sm font-bold -mt-[46px] tabular-nums",
                textColor[status],
              )}
            >
              {missingAltPercent}%
            </span>
            <span className="text-[9px] text-white/25 mt-[22px]">
              missing alt
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
