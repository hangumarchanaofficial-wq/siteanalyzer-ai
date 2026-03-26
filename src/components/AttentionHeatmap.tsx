"use client";

import { useState } from "react";
import { Eye, Layers } from "lucide-react";

export function AttentionHeatmap() {
    const [overlayEnabled, setOverlayEnabled] = useState(false);

    return (
        <section className="space-y-5">
            <div className="glass rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Eye className="w-5 h-5 text-accent-blue" />
                            <h2 className="text-lg font-semibold text-white tracking-tight">
                                Attention Heatmap
                            </h2>
                        </div>
                        <p className="text-sm text-white/35 max-w-md">
                            Advanced saccade simulation analyzing where users will focus within
                            the first 2.4 seconds of landing.
                        </p>
                    </div>

                    <button
                        onClick={() => setOverlayEnabled(!overlayEnabled)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                            overlayEnabled
                                ? "bg-white text-black"
                                : "bg-surface-3 border border-border-subtle text-white/60 hover:bg-surface-4 hover:text-white/80"
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        {overlayEnabled ? "Overlay Active" : "Enable Overlay"}
                    </button>
                </div>

                {overlayEnabled && (
                    <div className="mt-6 relative rounded-xl overflow-hidden bg-surface-2 border border-border-subtle animate-fade-in">
                        {/* Simulated heatmap visualization */}
                        <div className="aspect-video relative">
                            {/* Grid lines */}
                            <div
                                className="absolute inset-0 opacity-[0.05]"
                                style={{
                                    backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`,
                                    backgroundSize: "40px 40px",
                                }}
                            />

                            {/* Heatmap blobs */}
                            <div className="absolute top-[15%] left-[20%] w-40 h-40 bg-red-500/30 rounded-full blur-3xl" />
                            <div className="absolute top-[10%] left-[40%] w-56 h-32 bg-orange-500/25 rounded-full blur-3xl" />
                            <div className="absolute top-[35%] left-[15%] w-32 h-24 bg-yellow-500/20 rounded-full blur-3xl" />
                            <div className="absolute top-[45%] left-[50%] w-48 h-36 bg-orange-500/15 rounded-full blur-3xl" />
                            <div className="absolute top-[60%] left-[30%] w-24 h-20 bg-yellow-500/10 rounded-full blur-3xl" />
                            <div className="absolute bottom-[15%] right-[20%] w-36 h-28 bg-blue-500/15 rounded-full blur-3xl" />

                            {/* Labels */}
                            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-[10px] text-white/60">High Attention</span>
                            </div>
                            <div className="absolute top-4 left-44 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                <span className="text-[10px] text-white/60">Medium</span>
                            </div>
                            <div className="absolute top-4 left-72 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[10px] text-white/60">Low</span>
                            </div>

                            {/* Center info */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center bg-black/50 backdrop-blur-sm rounded-2xl px-6 py-4">
                                    <p className="text-xs text-white/40 mb-1">
                                        First 2.4s Focus Zone
                                    </p>
                                    <p className="text-2xl font-bold text-white">
                                        73%{" "}
                                        <span className="text-sm font-normal text-white/40">
                      above fold
                    </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Saccade integrations note */}
                <div className="mt-4 flex items-center gap-2 text-white/20">
                    <div className="w-4 h-4 rounded-full border border-white/10 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    </div>
                    <span className="text-xs">Saccade integrations</span>
                </div>
            </div>
        </section>
    );
}
