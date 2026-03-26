"use client";

import { Accessibility, AlertTriangle, Check } from "lucide-react";
import { AccessibilityMetrics } from "@/types/extended-metrics";
import { MultiMetricCard } from "./MultiMetricCard";

interface AccessibilityCardProps {
  data: AccessibilityMetrics;
  className?: string;
}

export function AccessibilityCard({
  data,
  className,
}: AccessibilityCardProps) {
  const hasIssue = data.unlabelled_inputs > 0;

  return (
    <MultiMetricCard
      title="Accessibility"
      icon={<Accessibility className="w-4 h-4" />}
      className={className}
      glowClassName={
        hasIssue
          ? "bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.08),transparent_60%)]"
          : "bg-[radial-gradient(circle_at_top,rgba(167,239,255,0.08),transparent_60%)]"
      }
      items={[
        {
          label: "ARIA Roles",
          value: `${data.aria_roles}`,
          tone: "neutral",
          helper:
            data.aria_roles > 0
              ? `${data.aria_roles} role${data.aria_roles !== 1 ? "s" : ""} detected in DOM`
              : "No ARIA roles detected",
          barPercent: Math.min(100, Math.max(8, (data.aria_roles / 50) * 100)),
        },
        {
          label: "Unlabelled Inputs",
          value: `${data.unlabelled_inputs}`,
          tone: hasIssue ? "bad" : "good",
          barPercent: hasIssue
            ? Math.min(100, Math.max(12, data.unlabelled_inputs * 16))
            : 100,
        },
      ]}
      footer={
        hasIssue ? (
          <div className="px-3 py-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-400/80">
                {data.unlabelled_inputs} input{data.unlabelled_inputs !== 1 ? "s" : ""} missing associated labels
              </p>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/10">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-400/80">All inputs have associated labels</p>
            </div>
          </div>
        )
      }
    />
  );
}
