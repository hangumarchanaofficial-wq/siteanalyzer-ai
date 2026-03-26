"use client";

import { Tag, AlertCircle, Check } from "lucide-react";
import clsx from "clsx";
import { FactualMeta } from "@/types/factual-metrics";

interface MetaInfoCardProps {
  meta: FactualMeta;
  className?: string;
}

// SEO best-practice character ranges.
const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 120;
const DESC_MAX = 160;

function charLengthStatus(
  length: number,
  min: number,
  max: number,
): { label: string; color: string } {
  if (length === 0) return { label: "Missing", color: "text-red-400" };
  if (length < min) return { label: "Short", color: "text-amber-400" };
  if (length > max) return { label: "Long", color: "text-amber-400" };
  return { label: "Good", color: "text-emerald-400" };
}

/**
 * Wide card that displays the meta title and meta description with
 * character counts, length-status badges, and truncation handling.
 */
export function MetaInfoCard({ meta, className }: MetaInfoCardProps) {
  const titleLen = meta.title?.length ?? 0;
  const descLen = meta.description?.length ?? 0;

  const titleStatus = charLengthStatus(titleLen, TITLE_MIN, TITLE_MAX);
  const descStatus = charLengthStatus(descLen, DESC_MIN, DESC_MAX);

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

      <div className="relative space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-white/30" />
          <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
            Meta Tags
          </h3>
        </div>

        {/* Title */}
        <MetaRow
          label="Title"
          value={meta.title}
          charCount={titleLen}
          rangeLabel={`${TITLE_MIN}–${TITLE_MAX} chars`}
          status={titleStatus}
        />

        {/* Divider */}
        <div className="h-px bg-white/[0.05]" />

        {/* Description */}
        <MetaRow
          label="Description"
          value={meta.description}
          charCount={descLen}
          rangeLabel={`${DESC_MIN}–${DESC_MAX} chars`}
          status={descStatus}
          multiline
        />
      </div>
    </div>
  );
}

/* ── Internal sub-component ──────────────────────────────────────── */

interface MetaRowProps {
  label: string;
  value: string | null;
  charCount: number;
  rangeLabel: string;
  status: { label: string; color: string };
  multiline?: boolean;
}

function MetaRow({
  label,
  value,
  charCount,
  rangeLabel,
  status,
  multiline = false,
}: MetaRowProps) {
  const missing = !value;

  return (
    <div className="space-y-2">
      {/* Row header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.1em] text-white/30 font-medium">
            {label}
          </span>
          <span
            className={clsx(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/[0.04]",
              status.color,
            )}
          >
            {status.label === "Good" ? (
              <Check className="w-2.5 h-2.5" />
            ) : status.label === "Missing" ? (
              <AlertCircle className="w-2.5 h-2.5" />
            ) : null}
            {status.label}
          </span>
        </div>
        <span className="text-[10px] text-white/25 tabular-nums">
          {charCount} chars · optimal {rangeLabel}
        </span>
      </div>

      {/* Content */}
      {missing ? (
        <div className="rounded-xl bg-red-500/[0.06] border border-red-500/10 px-3.5 py-2.5">
          <p className="text-xs text-red-400/80 italic">
            No {label.toLowerCase()} tag found
          </p>
        </div>
      ) : (
        <p
          className={clsx(
            "text-[13px] text-white/55 font-mono leading-relaxed",
            "bg-white/[0.025] rounded-xl px-3.5 py-2.5",
            "border border-white/[0.04]",
            multiline ? "line-clamp-3" : "truncate",
          )}
        >
          {value}
        </p>
      )}
    </div>
  );
}
