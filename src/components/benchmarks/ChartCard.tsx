"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  headerRight,
}: ChartCardProps) {
  return (
    <div
      className={clsx(
        "group relative rounded-2xl overflow-hidden transition-all duration-500",
        "bg-[rgba(14,14,16,0.72)] backdrop-blur-2xl",
        "border border-white/[0.06]",
        "hover:border-white/[0.10] hover:shadow-[0_8px_40px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      {/* Subtle top-edge gradient highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(167,239,255,0.08),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-[14px] font-semibold text-white/90 tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-white/30 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerRight && <div>{headerRight}</div>}
        </div>

        {/* Chart area */}
        {children}
      </div>
    </div>
  );
}
