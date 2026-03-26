"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorStateProps {
    onRetry: () => void;
}

export function ErrorState({ onRetry }: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
                Audit Failed
            </h3>
            <p className="text-sm text-white/40 max-w-sm text-center mb-6">
                We couldn&apos;t reach the target URL or an unexpected error occurred
                during analysis. Please verify the URL and try again.
            </p>
            <button
                onClick={onRetry}
                className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-xl text-sm font-semibold text-black hover:bg-[#f1f3f5] transition-all"
            >
                <RotateCcw className="w-4 h-4" />
                Retry Audit
            </button>
        </div>
    );
}
