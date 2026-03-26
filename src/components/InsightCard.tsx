"use client";

import { AuditInsight } from "@/types/audit";
import { ScoreRing } from "@/components/ScoreRing";
import {
    Search,
    MessageCircle,
    MousePointerClick,
    FileText,
    Layout,
    Eye,
    CheckCircle2,
    AlertTriangle,
    XCircle,
} from "lucide-react";

interface InsightCardProps {
    insight: AuditInsight;
}

const iconMap: Record<string, React.ReactNode> = {
    search: <Search className="w-5 h-5" />,
    "message-circle": <MessageCircle className="w-5 h-5" />,
    "mouse-pointer-click": <MousePointerClick className="w-5 h-5" />,
    "file-text": <FileText className="w-5 h-5" />,
    layout: <Layout className="w-5 h-5" />,
    eye: <Eye className="w-5 h-5" />,
};

export function InsightCard({ insight }: InsightCardProps) {
    return (
        <div className="glass rounded-2xl p-6 animate-scale-in">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Score and icon */}
                <div className="flex flex-col items-center gap-3 md:min-w-[140px]">
                    <ScoreRing score={insight.score} size={80} />
                    <div className="flex items-center gap-2 text-white/40">
                        {iconMap[insight.icon] || <Search className="w-5 h-5" />}
                        <span className="text-xs font-medium">{insight.category.toUpperCase()}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                        {insight.title}
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed mb-5">
                        {insight.summary}
                    </p>

                    {/* Details */}
                    <div className="space-y-2.5">
                        {insight.details.map((detail, i) => {
                            const isPositive =
                                detail.toLowerCase().includes("good") ||
                                detail.toLowerCase().includes("proper") ||
                                detail.toLowerCase().includes("well") ||
                                detail.toLowerCase().includes("healthy") ||
                                detail.toLowerCase().includes("clearly");
                            const isNegative =
                                detail.toLowerCase().includes("missing") ||
                                detail.toLowerCase().includes("lack") ||
                                detail.toLowerCase().includes("fail") ||
                                detail.toLowerCase().includes("generic") ||
                                detail.toLowerCase().includes("break");

                            return (
                                <div
                                    key={i}
                                    className="flex items-start gap-2.5 text-sm"
                                >
                                    {isPositive ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400/70 mt-0.5 shrink-0" />
                                    ) : isNegative ? (
                                        <XCircle className="w-4 h-4 text-red-400/70 mt-0.5 shrink-0" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-amber-400/70 mt-0.5 shrink-0" />
                                    )}
                                    <span className="text-white/50">{detail}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
