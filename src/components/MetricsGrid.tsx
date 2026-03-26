"use client";

import { AuditMetrics } from "@/types/audit";
import { MetricCard } from "@/components/metrics-card";
import {
    FileText,
    Heading,
    MousePointerClick,
    Link2,
    Image,
    Tag,
    Monitor,
    Film,
} from "lucide-react";

interface MetricsGridProps {
    metrics: AuditMetrics;
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Content Breakdown */}
            <MetricCard
                title="Content Breakdown"
                icon={<FileText className="w-4 h-4" />}
                className="sm:col-span-2 lg:col-span-1"
            >
                <div className="mt-3">
                    <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {metrics.wordCount.toLocaleString()}
            </span>
                        <span className="text-xs text-white/40">total words</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">
                                H1 Tags
                            </p>
                            <p className="text-lg font-semibold text-white/80">
                                {String(metrics.headings.h1).padStart(2, "0")}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">
                                H2 Tags
                            </p>
                            <p className="text-lg font-semibold text-white/80">
                                {String(metrics.headings.h2).padStart(2, "0")}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">
                                H3 Tags
                            </p>
                            <p className="text-lg font-semibold text-white/80">
                                {String(metrics.headings.h3).padStart(2, "0")}
                            </p>
                        </div>
                    </div>
                    {/* Mini bar chart */}
                    <div className="mt-3 flex items-end gap-1 h-8 justify-center">
                        {[40, 65, 85, 55, 75, 90, 45].map((h, i) => (
                            <div
                                key={i}
                                className="w-2.5 rounded-sm bg-accent-blue/30"
                                style={{ height: `${h}%` }}
                            />
                        ))}
                    </div>
                </div>
            </MetricCard>

            {/* Media Assets */}
            <MetricCard
                title="Media Assets"
                icon={<Film className="w-4 h-4" />}
            >
                <div className="mt-3">
                    <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {metrics.mediaAssets}
            </span>
                        <span className="text-xs text-white/40">resources identified</span>
                    </div>
                    <div className="mt-4 px-3 py-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/10">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <p className="text-xs text-red-400/80">
                                {metrics.images.missingAlt} images missing alt descriptions
                            </p>
                        </div>
                    </div>
                </div>
            </MetricCard>

            {/* Performance */}
            <MetricCard
                title="Performance"
                icon={<Monitor className="w-4 h-4" />}
            >
                <div className="mt-3">
                    <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {String(metrics.performance.activeClusters).padStart(2, "0")}
            </span>
                        <span className="text-xs text-white/40">active CTA clusters</span>
                    </div>
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-white/30">
                Engagement Rate
              </span>
                            <span className="text-xs font-medium text-accent-blue">
                {metrics.performance.engagementScore}%
              </span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-accent rounded-full transition-all duration-1000"
                                style={{
                                    width: `${metrics.performance.engagementScore}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </MetricCard>

            {/* Links */}
            <MetricCard title="Links" icon={<Link2 className="w-4 h-4" />}>
                <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">Internal</span>
                        <span className="text-sm font-semibold text-white/80">
              {metrics.links.internal}
            </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">External</span>
                        <span className="text-sm font-semibold text-white/80">
              {metrics.links.external}
            </span>
                    </div>
                    <div className="h-px bg-border-subtle" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">CTAs Detected</span>
                        <span className="text-sm font-semibold text-accent-blue">
              {metrics.ctaCount}
            </span>
                    </div>
                </div>
            </MetricCard>

            {/* Meta Tags */}
            <MetricCard
                title="Meta Tags"
                icon={<Tag className="w-4 h-4" />}
                className="sm:col-span-2 lg:col-span-2"
            >
                <div className="mt-3 space-y-3">
                    <div>
                        <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-white/30">
                Title
              </span>
                            <span className="text-[10px] text-white/30">
                {metrics.meta.titleLength} chars
              </span>
                        </div>
                        <p className="text-xs text-white/60 font-mono bg-white/[0.03] rounded-lg px-3 py-2 truncate">
                            {metrics.meta.title}
                        </p>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-white/30">
                Description
              </span>
                            <span className="text-[10px] text-white/30">
                {metrics.meta.descriptionLength} chars
              </span>
                        </div>
                        <p className="text-xs text-white/60 font-mono bg-white/[0.03] rounded-lg px-3 py-2 line-clamp-2">
                            {metrics.meta.description}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex items-center gap-1.5">
                            <div
                                className={`w-2 h-2 rounded-full ${
                                    metrics.meta.hasOgTags ? "bg-emerald-400" : "bg-red-400"
                                }`}
                            />
                            <span className="text-[11px] text-white/40">OG Tags</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div
                                className={`w-2 h-2 rounded-full ${
                                    metrics.meta.hasTwitterCards
                                        ? "bg-emerald-400"
                                        : "bg-red-400"
                                }`}
                            />
                            <span className="text-[11px] text-white/40">Twitter Cards</span>
                        </div>
                    </div>
                </div>
            </MetricCard>
        </div>
    );
}
