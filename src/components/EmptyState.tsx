"use client";

import { Search, ArrowRight, Zap, Shield, BarChart3 } from "lucide-react";

export function EmptyState() {
    return (
        <div className="pt-8 animate-fade-in">
            {/* Feature cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <FeatureCard
                    icon={<Search className="w-5 h-5" />}
                    title="SEO Analysis"
                    description="Deep crawl of meta tags, heading hierarchy, keyword density, and search engine visibility factors."
                    gradient="from-blue-500/10 to-indigo-500/10"
                    iconColor="text-blue-400"
                />
                <FeatureCard
                    icon={<Zap className="w-5 h-5" />}
                    title="Content Intelligence"
                    description="AI-powered evaluation of messaging clarity, content depth, CTA effectiveness, and conversion potential."
                    gradient="from-violet-500/10 to-purple-500/10"
                    iconColor="text-violet-400"
                />
                <FeatureCard
                    icon={<Shield className="w-5 h-5" />}
                    title="UX & Accessibility"
                    description="WCAG compliance checks, navigation analysis, mobile responsiveness, and user journey optimization."
                    gradient="from-cyan-500/10 to-teal-500/10"
                    iconColor="text-cyan-400"
                />
            </div>

            {/* Subtle CTA */}
            <div className="text-center mt-12">
                <p className="text-sm text-white/25">
                    Enter a URL above to begin your first audit
                </p>
                <div className="mt-4 flex items-center justify-center gap-6 text-xs text-white/15">
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> 50+ metrics analyzed
          </span>
                    <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Results in seconds
          </span>
                    <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> WCAG 2.1 checks
          </span>
                </div>
            </div>
        </div>
    );
}

function FeatureCard({
                         icon,
                         title,
                         description,
                         gradient,
                         iconColor,
                     }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: string;
    iconColor: string;
}) {
    return (
        <div className="group relative glass rounded-2xl p-6 hover:shadow-card-hover transition-all duration-300 hover:border-white/[0.08]">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}
            >
                <span className={iconColor}>{icon}</span>
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
            <p className="text-xs text-white/40 leading-relaxed">{description}</p>
        </div>
    );
}
