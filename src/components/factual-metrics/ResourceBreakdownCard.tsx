"use client";

import { Blocks } from "lucide-react";
import { ResourceMetrics } from "@/types/extended-metrics";
import { BreakdownCard } from "./BreakdownCard";

interface ResourceBreakdownCardProps {
  data: ResourceMetrics;
  className?: string;
}

export function ResourceBreakdownCard({
  data,
  className,
}: ResourceBreakdownCardProps) {
  const total = data.js_files + data.css_files + data.images;

  return (
    <BreakdownCard
      title="Resources"
      icon={<Blocks className="w-4 h-4" />}
      className={className}
      totalLabel="Total assets"
      totalValue={`${total}`}
      segments={[
        {
          label: "JS Files",
          value: `${data.js_files}`,
          rawValue: data.js_files,
          barClassName: "bg-amber-400",
          textClassName: "text-amber-400",
        },
        {
          label: "CSS Files",
          value: `${data.css_files}`,
          rawValue: data.css_files,
          barClassName: "bg-accent-cyan",
          textClassName: "text-accent-cyan",
        },
        {
          label: "Images",
          value: `${data.images}`,
          rawValue: data.images,
          barClassName: "bg-accent-blue",
          textClassName: "text-accent-blue",
        },
      ]}
    />
  );
}
