"use client";

import { useState } from "react";
import { Search, ArrowRight, Sparkles, Loader2 } from "lucide-react";

interface HeroSectionProps {
    onRunAudit: (url: string) => void;
    onTryDemo: () => void;
    isLoading: boolean;
    currentUrl: string;
}

export function HeroSection({
                                onRunAudit,
                                onTryDemo,
                                isLoading,
                                currentUrl: _currentUrl,
                            }: HeroSectionProps) {
    const [url, setUrl] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            onRunAudit(url.trim());
        }
    };

    return (
        <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center">
                    {/* Version badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.07] mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
                        <span className="text-xs text-white/50 font-medium">
              Engine v4.2 now live
            </span>
                    </div>

                    {/* Main heading */}
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
                        <span className="text-white">Web audits for the</span>
                        <br />
                        <span className="text-gradient-accent">modern digital age.</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-base sm:text-lg text-white/40 max-w-xl mx-auto mb-10 leading-relaxed">
                        Deep SEO, content clarity, and UX analysis in seconds. Designed for
                        teams who obsess over the finer details of the user journey.
                    </p>

                    {/* Search input */}
                    <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
                        <div className="relative group">
                            {/* Glow effect behind input */}
                            <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-lg transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(167,239,255,0.18),transparent_65%)]" />

                            <div className="relative flex items-center bg-surface-2 border border-white/[0.08] rounded-2xl overflow-hidden transition-all duration-300 group-focus-within:border-white/[0.16] group-focus-within:shadow-glow">
                                <div className="pl-5 pr-2">
                                    <Search className="w-5 h-5 text-white/30" />
                                </div>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="Enter landing page URL..."
                                    className="flex-1 bg-transparent py-4 px-2 text-[15px] text-white placeholder-white/25 outline-none"
                                    disabled={isLoading}
                                />
                                <div className="pr-2.5">
                                    <button
                                        type="submit"
                                        disabled={isLoading || !url.trim()}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black bg-white hover:bg-[#f1f3f5] disabled:opacity-40 transition-all duration-200"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                Analyze
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Try demo link */}
                    <button
                        onClick={onTryDemo}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 mt-5 text-xs text-white/30 hover:text-white/60 transition-colors duration-200 disabled:opacity-40"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Try with demo URL
                    </button>
                </div>
            </div>
        </section>
    );
}
