"use client";

import { AuditResult } from "@/types/audit";
import { MetricsGrid } from "@/components/MetricsGrid";
import { InsightsPanel } from "@/components/insights-panel";
import { RecommendationsSection } from "@/components/RecommendationsSection";
import { AttentionHeatmap } from "@/components/AttentionHeatmap";
import { ScoreRing } from "@/components/ScoreRing";
import {
    Globe,
    Clock,
    Download,
    MoreHorizontal,
    RotateCcw,
    ExternalLink,
} from "lucide-react";
import { GlowBadge } from "@/components/GlowBadge";

interface AuditDashboardProps {
    result: AuditResult;
    onReset: () => void;
}

export function AuditDashboard({ result, onReset }: AuditDashboardProps) {
    const timeAgo = getTimeAgo(result.timestamp);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Dashboard header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                            Audit Report
                        </h2>
                        <GlowBadge variant="success">Live Results</GlowBadge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/40">
                        <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5" />
                            <span className="text-white/60 font-mono text-xs">
                {result.url}
              </span>
                            <ExternalLink className="w-3 h-3 opacity-40" />
                        </div>
                        <span className="text-white/20">·</span>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Generated {timeAgo}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white/50 bg-surface-3 border border-border-subtle rounded-xl hover:bg-surface-4 hover:text-white/70 transition-all duration-200"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        New Audit
                    </button>
                    <button className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-black bg-white rounded-xl hover:bg-[#f1f3f5] transition-all duration-200">
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </button>
                    <button className="p-2 text-white/40 bg-surface-3 border border-border-subtle rounded-xl hover:bg-surface-4 hover:text-white/60 transition-all duration-200">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Overall Score + Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Overall Score Card */}
                <div className="lg:col-span-1 glass rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <ScoreRing score={result.overallScore} size={120} />
                    <p className="mt-4 text-sm font-medium text-white/80">
                        Overall Score
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                        Based on 6 audit categories
                    </p>
                </div>

                {/* Metrics Grid */}
                <div className="lg:col-span-3">
                    <MetricsGrid metrics={result.metrics} />
                </div>
            </div>

            {/* AI Insights */}
            <InsightsPanel insights={result.insights} />

            {/* Recommendations */}
            <RecommendationsSection recommendations={result.recommendations} />

            {/* Attention Heatmap */}
            <AttentionHeatmap />
        </div>
    );
}

function getTimeAgo(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}
