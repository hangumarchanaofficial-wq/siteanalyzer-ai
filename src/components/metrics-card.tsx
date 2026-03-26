"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface MetricCardProps {
    title: string;
    icon: ReactNode;
    children: ReactNode;
    className?: string;
}

export function MetricCard({
                               title,
                               icon,
                               children,
                               className,
                           }: MetricCardProps) {
    return (
        <div
            className={clsx(
                "group relative glass rounded-2xl p-5 hover:shadow-card-hover transition-all duration-300",
                "hover:border-white/[0.08] hover:bg-surface-2/80",
                className
            )}
        >
            {/* Subtle hover glow */}
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(167,239,255,0.08),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-white/30">{icon}</span>
                    <h3 className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                        {title}
                    </h3>
                </div>
                {children}
            </div>
        </div>
    );
}
