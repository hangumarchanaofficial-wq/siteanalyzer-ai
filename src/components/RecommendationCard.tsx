"use client";

import { useState } from "react";
import { AuditRecommendation } from "@/types/audit";
import { ChevronRight, ArrowUpRight, Zap } from "lucide-react";
import { GlowBadge } from "@/components/GlowBadge";

interface RecommendationCardProps {
    recommendation: AuditRecommendation;
    index: number;
}

export function RecommendationCard({
                                       recommendation,
                                       index,
                                   }: RecommendationCardProps) {
    const [expanded, setExpanded] = useState(false);

    const priorityVariant: Record<string, "critical" | "high" | "medium" | "low"> = {
        critical: "critical",
        high: "high",
        medium: "medium",
        low: "low",
    };

    return (
        <div
            className="group glass rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:border-white/[0.08]"
            style={{ animationDelay: `${index * 100}ms` }}
        >
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left px-6 py-5 flex items-start gap-4"
            >
                <div className="mt-0.5">
                    <GlowBadge variant={priorityVariant[recommendation.priority]}>
                        {recommendation.priority}
                    </GlowBadge>
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold text-white mb-1.5">
                        {recommendation.title}
                    </h3>
                    <p className="text-sm text-white/40 leading-relaxed line-clamp-2">
                        {recommendation.explanation}
                    </p>
                </div>

                <ChevronRight
                    className={`w-5 h-5 text-white/30 transition-transform duration-300 shrink-0 mt-1 ${
                        expanded ? "rotate-90" : ""
                    }`}
                />
            </button>

            {expanded && (
                <div className="px-6 pb-5 border-t border-border-subtle animate-fade-in">
                    <div className="pt-4 space-y-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5">
                                Suggested Action
                            </p>
                            <p className="text-sm text-white/55 leading-relaxed">
                                {recommendation.action}
                            </p>
                        </div>

                        <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-accent-blue/[0.06] border border-accent-blue/10">
                            <Zap className="w-4 h-4 text-accent-blue mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-accent-blue/60 mb-0.5">
                                    Expected Impact
                                </p>
                                <p className="text-xs text-white/50">{recommendation.impact}</p>
                            </div>
                        </div>

                        <button className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-blue hover:text-accent-violet transition-colors">
                            Review pages
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
