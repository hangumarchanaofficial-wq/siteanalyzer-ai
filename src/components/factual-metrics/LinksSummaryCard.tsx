"use client";

import { Link2 } from "lucide-react";
import clsx from "clsx";
import { FactualLinks } from "@/types/factual-metrics";

interface LinksSummaryCardProps {
  links: FactualLinks;
  className?: string;
}

/**
 * Compact card showing internal / external / total link counts
 * with a proportional bar visualisation.
 */
export function LinksSummaryCard({ links, className }: LinksSummaryCardProps) {
  const total = links.total || links.internal + links.external;
  const internalPct = total > 0 ? (links.internal / total) * 100 : 0;
  const externalPct = total > 0 ? (links.external / total) * 100 : 0;

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
          <Link2 className="w-4 h-4 text-white/30" />
          <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
            Links
          </h3>
        </div>

        {/* Total */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-white tracking-tight tabular-nums">
            {total.toLocaleString()}
          </span>
          <span className="text-xs text-white/35 font-medium">total links</span>
        </div>

        {/* Breakdown rows */}
        <div className="space-y-2.5">
          <LinkRow
            label="Internal"
            count={links.internal}
            color="bg-accent-blue"
          />
          <LinkRow
            label="External"
            count={links.external}
            color="bg-accent-cyan/60"
          />
        </div>

        {/* Ratio bar */}
        <div className="mt-4 h-1.5 flex rounded-full overflow-hidden bg-white/[0.04]">
          <div
            className="bg-accent-blue transition-all duration-700"
            style={{ width: `${internalPct}%` }}
          />
          <div
            className="bg-accent-cyan/60 transition-all duration-700"
            style={{ width: `${externalPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-white/25">
            {internalPct.toFixed(0)}% internal
          </span>
          <span className="text-[10px] text-white/25">
            {externalPct.toFixed(0)}% external
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-row ──────────────────────────────────────────────────────── */

function LinkRow({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={clsx("w-2 h-2 rounded-full", color)} />
        <span className="text-xs text-white/45">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white/80 tabular-nums">
        {count.toLocaleString()}
      </span>
    </div>
  );
}
