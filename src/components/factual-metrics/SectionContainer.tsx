"use client";

import { ReactNode } from "react";

interface SectionContainerProps {
  /** Main heading text. */
  title: string;
  /** Smaller subtitle beneath the heading. */
  subtitle?: string;
  /** Icon element rendered before the title. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable section wrapper that provides the standard heading treatment,
 * spacing, and optional subtitle used throughout the dashboard.
 */
export function SectionContainer({
  title,
  subtitle,
  icon,
  children,
  className = "",
}: SectionContainerProps) {
  return (
    <section className={`space-y-6 ${className}`}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-accent-blue/70">{icon}</span>}
          <h2 className="text-lg font-semibold text-white tracking-tight">
            {title}
          </h2>
        </div>
        {subtitle && (
          <p className="mt-1.5 text-[13px] text-white/35 leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      {children}
    </section>
  );
}
