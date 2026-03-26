"use client";

import { ReactNode } from "react";
import clsx from "clsx";
import { MetricCard } from "./MetricCard";

export interface MultiMetricItem {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad" | "neutral";
  helper?: string;
  barPercent?: number;
}

interface MultiMetricCardProps {
  title: string;
  icon: ReactNode;
  items: MultiMetricItem[];
  className?: string;
  primaryValue?: string;
  primaryUnit?: string;
  primaryTone?: MultiMetricItem["tone"];
  footer?: ReactNode;
  glowClassName?: string;
}

const TONE_TEXT = {
  good: "text-emerald-400",
  warn: "text-amber-400",
  bad: "text-red-400",
  neutral: "text-accent-blue",
};

const TONE_BAR = {
  good: "bg-emerald-400",
  warn: "bg-amber-400",
  bad: "bg-red-400",
  neutral: "bg-accent-blue",
};

export function MultiMetricCard({
  title,
  icon,
  items,
  className,
  primaryValue,
  primaryUnit,
  primaryTone = "neutral",
  footer,
  glowClassName,
}: MultiMetricCardProps) {
  return (
    <MetricCard
      title={title}
      icon={icon}
      className={className}
      glowClassName={glowClassName}
    >
      {primaryValue && (
        <div className="mt-3 flex items-baseline gap-2">
          <span className={clsx("text-3xl font-bold tracking-tight", TONE_TEXT[primaryTone])}>
            {primaryValue}
          </span>
          {primaryUnit && <span className="text-xs text-white/40">{primaryUnit}</span>}
        </div>
      )}

      <div className={clsx("space-y-3", primaryValue ? "mt-4" : "mt-3")}>
        {items.map((item) => {
          const tone = item.tone ?? "neutral";
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-white/30">
                  {item.label}
                </span>
                <span className={clsx("text-xs font-semibold tabular-nums", TONE_TEXT[tone])}>
                  {item.value}
                </span>
              </div>
              {typeof item.barPercent === "number" && (
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full transition-all duration-1000", TONE_BAR[tone])}
                    style={{ width: `${item.barPercent}%` }}
                  />
                </div>
              )}
              {item.helper && (
                <p className="mt-1.5 text-[10px] text-white/25">{item.helper}</p>
              )}
            </div>
          );
        })}
      </div>

      {footer && <div className="mt-4">{footer}</div>}
    </MetricCard>
  );
}
