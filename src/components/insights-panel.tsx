"use client";

import { useState } from "react";
import { AuditInsight } from "@/types/audit";
import { InsightCard } from "@/components/InsightCard";
import { Brain } from "lucide-react";

interface InsightsPanelProps {
    insights: AuditInsight[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
    const [selectedInsight, setSelectedInsight] = useState<string>(
        insights[0]?.id || ""
    );

    const selected = insights.find((i) => i.id === selectedInsight);

    return (
        <section className="space-y-5">
            <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-accent-violet" />
                <h2 className="text-lg font-semibold text-white tracking-tight">
                    AI Insights
                </h2>
                <span className="text-xs text-white/30 ml-1">
          Powered by deep content analysis
        </span>
            </div>

            {/* Insight category tabs */}
            <div className="flex flex-wrap gap-2">
                {insights.map((insight) => (
                    <button
                        key={insight.id}
                        onClick={() => setSelectedInsight(insight.id)}
                        className={clsx(
                            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200",
                            selectedInsight === insight.id
                                ? "bg-gradient-accent-subtle border border-accent-blue/20 text-white shadow-glow"
                                : "bg-surface-3 border border-border-subtle text-white/50 hover:text-white/70 hover:bg-surface-4"
                        )}
                    >
                        <span>{insight.title}</span>
                        <ScoreBadge score={insight.score} />
                    </button>
                ))}
            </div>

            {/* Selected insight detail */}
            {selected && <InsightCard insight={selected} />}
        </section>
    );
}

function ScoreBadge({ score }: { score: number }) {
    const color =
        score >= 80
            ? "text-emerald-400 bg-emerald-400/10"
            : score >= 60
                ? "text-amber-400 bg-amber-400/10"
                : "text-red-400 bg-red-400/10";

    return (
        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${color}`}>
      {score}
    </span>
    );
}

function clsx(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(" ");
}
