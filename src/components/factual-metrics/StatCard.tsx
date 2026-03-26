"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface StatCardProps {
  /** Uppercase label above the value. */
  label: string;
  /** The primary metric value to display. */
  value: string | number;
  /** Unit or context label shown beside the value. */
  unit?: string;
  /** Icon rendered in the card header. */
  icon?: ReactNode;
  /** Semantic status — drives subtle accent colouring. */
  status?: "neutral" | "good" | "warn" | "bad";
  /** Additional Tailwind classes (e.g. col-span overrides). */
  className?: string;
  children?: ReactNode;
}

const STATUS_ACCENT: Record<string, string> = {
  neutral: "from-accent-blue/10 to-transparent",
  good: "from-emerald-400/10 to-transparent",
  warn: "from-amber-400/10 to-transparent",
  bad: "from-red-400/10 to-transparent",
};

const VALUE_COLOR: Record<string, string> = {
  neutral: "text-white",
  good: "text-emerald-400",
  warn: "text-amber-400",
  bad: "text-red-400",
};

/**
 * Generic metric card used for single-value stats throughout the
 * Factual Metrics dashboard.  Supports semantic colouring via `status`.
 */
export function StatCard({
  label,
  value,
  unit,
  icon,
  status = "neutral",
  className,
  children,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "group relative glass rounded-2xl p-5",
        "hover:shadow-card-hover hover:border-white/[0.08] hover:bg-surface-2/80",
        "transition-all duration-300",
        className,
      )}
    >
      {/* Subtle top-edge gradient glow on hover */}
      <div
        className={clsx(
          "absolute inset-0 rounded-2xl bg-gradient-to-b opacity-0 group-hover:opacity-100",
          "transition-opacity duration-500 pointer-events-none",
          STATUS_ACCENT[status],
        )}
      />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3">
          {icon && <span className="text-white/30">{icon}</span>}
          <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
            {label}
          </h3>
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-2">
          <span
            className={clsx(
              "text-3xl font-bold tracking-tight",
              VALUE_COLOR[status],
            )}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {unit && (
            <span className="text-xs text-white/35 font-medium">{unit}</span>
          )}
        </div>

        {/* Optional child content (sub-rows, mini-charts, etc.) */}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
