"use client";

import { ReactNode } from "react";

interface GlowBadgeProps {
    children: ReactNode;
    variant: "success" | "critical" | "high" | "medium" | "low";
}

const variantStyles: Record<string, string> = {
    success:
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.15)]",
    critical:
        "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(248,113,113,0.15)]",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_8px_rgba(251,146,60,0.15)]",
    medium:
        "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.15)]",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_8px_rgba(96,165,250,0.15)]",
};

export function GlowBadge({ children, variant }: GlowBadgeProps) {
    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider border ${variantStyles[variant]}`}
        >
      {children}
    </span>
    );
}
