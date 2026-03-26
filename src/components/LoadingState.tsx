"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
    url: string;
}

const steps = [
    "Connecting to target URL...",
    "Extracting page content and structure...",
    "Analyzing SEO signals and metadata...",
    "Running AI content evaluation...",
    "Generating recommendations...",
    "Compiling audit report...",
];

export function LoadingState({ url }: LoadingStateProps) {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
        }, 450);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-8 pt-8 animate-fade-in">
            {/* Loading header */}
            <div className="text-center">
                <div className="inline-flex items-center gap-3 mb-4">
                    <Loader2 className="w-5 h-5 text-accent-blue animate-spin" />
                    <span className="text-sm font-medium text-white/60">
            Analyzing{" "}
                        <span className="text-white/80 font-mono text-xs">{url}</span>
          </span>
                </div>

                {/* Steps */}
                <div className="max-w-sm mx-auto space-y-2.5 mt-6">
                    {steps.map((step, i) => (
                        <div
                            key={step}
                            className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${
                                i <= currentStep ? "opacity-100" : "opacity-20"
                            }`}
                        >
                            <div
                                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                                    i < currentStep
                                        ? "bg-emerald-400"
                                        : i === currentStep
                                            ? "bg-accent-blue animate-pulse"
                                            : "bg-white/20"
                                }`}
                            />
                            <span
                                className={
                                    i <= currentStep ? "text-white/60" : "text-white/20"
                                }
                            >
                {step}
              </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Skeleton cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="glass rounded-2xl p-5">
                        <div className="h-3 w-24 bg-white/[0.06] rounded-md shimmer-bg mb-4" />
                        <div className="h-8 w-16 bg-white/[0.06] rounded-lg shimmer-bg mb-3" />
                        <div className="space-y-2">
                            <div className="h-2 w-full bg-white/[0.04] rounded shimmer-bg" />
                            <div className="h-2 w-3/4 bg-white/[0.04] rounded shimmer-bg" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
