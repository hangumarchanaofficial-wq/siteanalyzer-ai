"use client";

import { ReactNode } from "react";
import clsx from "clsx";
import { MetricCard } from "./MetricCard";

export interface BreakdownSegment {
  label: string;
  value: string;
  rawValue?: number;
  barClassName: string;
  textClassName?: string;
}

interface BreakdownCardProps {
  title: string;
  icon: ReactNode;
  className?: string;
  totalLabel?: string;
  totalValue?: string;
  segments: BreakdownSegment[];
  stacked?: boolean;
}

export function BreakdownCard({
  title,
  icon,
  className,
  totalLabel,
  totalValue,
  segments,
  stacked = false,
}: BreakdownCardProps) {
  const rawTotal = segments.reduce((sum, segment) => sum + (segment.rawValue ?? 0), 0);
  const maxRaw = Math.max(...segments.map((segment) => segment.rawValue ?? 0), 1);

  return (
    <MetricCard title={title} icon={icon} className={className}>
      {(totalLabel || totalValue) && (
        <div className="mt-3 flex items-baseline justify-between gap-3">
          {totalLabel ? <span className="text-xs text-white/40">{totalLabel}</span> : <span />}
          {totalValue && <span className="text-3xl font-bold tracking-tight text-white">{totalValue}</span>}
        </div>
      )}

      {stacked && rawTotal > 0 && (
        <div className="mt-4 h-2 flex rounded-full overflow-hidden bg-white/[0.04]">
          {segments.map((segment) => {
            const percent = ((segment.rawValue ?? 0) / rawTotal) * 100;
            return (
              <div
                key={segment.label}
                className={clsx("transition-all duration-700", segment.barClassName)}
                style={{ width: `${Math.max(percent, percent > 0 ? 2 : 0)}%` }}
              />
            );
          })}
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        {segments.map((segment) => {
          const percent =
            rawTotal > 0 && stacked
              ? Math.round(((segment.rawValue ?? 0) / rawTotal) * 100)
              : Math.round(((segment.rawValue ?? 0) / maxRaw) * 100);

          return (
            <div key={segment.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-white/30">
                  {segment.label}
                </span>
                <span className={clsx("text-xs font-semibold tabular-nums text-white/60", segment.textClassName)}>
                  {segment.value}
                </span>
              </div>
              {!stacked && (
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full transition-all duration-700 ease-out", segment.barClassName)}
                    style={{ width: `${Math.max(percent, (segment.rawValue ?? 0) > 0 ? 6 : 0)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </MetricCard>
  );
}
