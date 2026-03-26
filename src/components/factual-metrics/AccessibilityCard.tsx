"use client";

import { Accessibility, AlertTriangle, Check } from "lucide-react";
import clsx from "clsx";
import { AccessibilityMetrics } from "@/types/extended-metrics";

interface AccessibilityCardProps {
  data: AccessibilityMetrics;
  className?: string;
}

/**
 * Accessibility card showing Unlabelled Inputs and ARIA Roles.
 *
 * Unlabelled inputs > 0 triggers a warning callout (same pattern as
 * the "missing alt descriptions" callout in the existing Media Assets
 * card).  ARIA roles always use the neutral blue accent.
 *
 * Card shell identical to MetricCard: glass, rounded-2xl, p-5.
 */
export function AccessibilityCard({
  data,
  className,
}: AccessibilityCardProps) {
  const hasIssue = data.unlabelled_inputs > 0;

  return (
    <div
      className={clsx(
        "group relative glass rounded-2xl p-5 hover:shadow-card-hover transition-all duration-300",
        "hover:border-white/[0.08] hover:bg-surface-2/80",
        className,
      )}
    >
      {/* Hover glow — red-tinted if there are issues */}
      <div
        className={clsx(
          "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
          hasIssue
            ? "bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.08),transparent_60%)]"
            : "bg-[radial-gradient(circle_at_top,rgba(167,239,255,0.08),transparent_60%)]",
        )}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white/30">
            <Accessibility className="w-4 h-4" />
          </span>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-white/40">
            Accessibility
          </h3>
        </div>

        <div className="mt-3 space-y-4">
          {/* ── ARIA Roles (neutral info) ─────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-white/30">
                ARIA Roles
              </span>
              <span className="text-xs font-medium text-accent-blue tabular-nums">
                {data.aria_roles}
              </span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-blue/60 rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(100, Math.max(8, (data.aria_roles / 50) * 100))}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-white/25">
              {data.aria_roles > 0
                ? `${data.aria_roles} role${data.aria_roles !== 1 ? "s" : ""} detected in DOM`
                : "No ARIA roles detected"}
            </p>
          </div>

          {/* Divider — matches Links card separator */}
          <div className="h-px bg-border-subtle" />

          {/* ── Unlabelled Inputs ─────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-white/30">
                Unlabelled Inputs
              </span>
              <span
                className={clsx(
                  "text-sm font-semibold tabular-nums",
                  hasIssue ? "text-red-400" : "text-emerald-400",
                )}
              >
                {data.unlabelled_inputs}
              </span>
            </div>

            {/* Status callout — mirrors Media Assets card's alert box */}
            {hasIssue ? (
              <div className="px-3 py-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/10">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-400/80">
                    {data.unlabelled_inputs} input{data.unlabelled_inputs !== 1 ? "s" : ""} missing
                    associated labels
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-3 py-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/10">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-400/80">
                    All inputs have associated labels
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
