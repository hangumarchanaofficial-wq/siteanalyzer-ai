"use client";

import { AuditRecommendation } from "@/types/audit";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Lightbulb } from "lucide-react";

interface RecommendationsSectionProps {
    recommendations: AuditRecommendation[];
}

export function RecommendationsSection({
                                           recommendations,
                                       }: RecommendationsSectionProps) {
    return (
        <section className="space-y-5">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="w-5 h-5 text-accent-cyan" />
                    <h2 className="text-lg font-semibold text-white tracking-tight">
                        Critical Recommendations
                    </h2>
                </div>
                <p className="text-sm text-white/35">
                    Actionable optimizations curated by AI prioritization models.
                </p>
            </div>

            <div className="space-y-3">
                {recommendations.map((rec, i) => (
                    <RecommendationCard key={rec.id} recommendation={rec} index={i} />
                ))}
            </div>
        </section>
    );
}
