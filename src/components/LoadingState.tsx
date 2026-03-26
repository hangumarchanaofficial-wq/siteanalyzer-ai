"use client";

import { useEffect, useState } from "react";
import { Bot, Clock3, Loader2, Radar, Server, TimerReset } from "lucide-react";
import { AuditJobEvent } from "@/lib/schemas";

interface LoadingStateProps {
    url: string;
    percent?: number;
    detail?: string;
    stage?: string;
    events?: AuditJobEvent[];
    createdAt?: string;
    updatedAt?: string;
    backend?: "ollama" | "openrouter";
    jobId?: string;
}

const STAGE_LABELS: Record<string, string> = {
    "audit:queued": "Queued",
    "audit:start": "Starting audit",
    "audit:fetch": "Rendering page",
    "fetch:init": "Starting browser",
    "fetch:page": "Preparing tab",
    "fetch:navigate": "Loading target URL",
    "fetch:settle": "Waiting for late scripts",
    "fetch:scroll": "Capturing lazy-loaded content",
    "fetch:finalize": "Finalizing page snapshot",
    "fetch:done": "Rendered HTML captured",
    "audit:fetch_done": "Page fetch complete",
    "audit:parse": "Parsing DOM",
    "audit:metrics": "Extracting page metrics",
    "audit:ai_prepare": "Preparing AI input",
    "audit:ai_start": "Running AI analysis",
    "ai:prompt": "Prompt built",
    "ai:attempt": "Submitting model request",
    "ai:request": "Waiting for model response",
    "ai:ollama_wait": "Model still generating",
    "ai:openrouter_wait": "Provider still generating",
    "ai:response": "Model response received",
    "ai:parse": "Parsing model JSON",
    "ai:validate": "Validating AI output",
    "ai:repair": "Repairing invalid AI output",
    "ai:retry": "Retrying AI generation",
    "audit:ai_done": "AI analysis complete",
    "audit:done": "Audit complete",
};

const PHASES = [
    {
        id: "fetch",
        label: "Render",
        matches: ["audit:fetch", "fetch:init", "fetch:page", "fetch:navigate", "fetch:settle", "fetch:scroll", "fetch:finalize", "fetch:done", "audit:fetch_done"],
    },
    {
        id: "parse",
        label: "Parse",
        matches: ["audit:parse", "audit:metrics"],
    },
    {
        id: "ai",
        label: "Analyze",
        matches: ["audit:ai_prepare", "audit:ai_start", "ai:prompt", "ai:attempt", "ai:request", "ai:ollama_wait", "ai:openrouter_wait", "ai:response", "ai:parse", "ai:validate", "ai:repair", "ai:retry", "audit:ai_done"],
    },
    {
        id: "finish",
        label: "Finalize",
        matches: ["audit:done"],
    },
];

function formatElapsed(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatRelativeTime(timestamp: string, nowMs: number) {
    const value = Date.parse(timestamp);
    if (Number.isNaN(value)) return "just now";
    const deltaSeconds = Math.max(0, Math.floor((nowMs - value) / 1000));
    if (deltaSeconds < 2) return "just now";
    if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
    const minutes = Math.floor(deltaSeconds / 60);
    return `${minutes}m ago`;
}

export function LoadingState({
    url,
    percent = 0,
    detail,
    stage,
    events = [],
    createdAt,
    updatedAt,
    backend,
    jobId,
}: LoadingStateProps) {
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const startedAt = createdAt ? Date.parse(createdAt) : Number.NaN;
    const elapsed =
        Number.isNaN(startedAt) ? "0:00" : formatElapsed(nowMs - startedAt);
    const activePhaseIndex = stage
        ? Math.max(
              0,
              PHASES.findIndex((phase) => phase.matches.includes(stage))
          )
        : 0;
    const recentEvents = events.slice(-8).reverse();
    const stageLabel = stage ? STAGE_LABELS[stage] || stage : "Waiting for backend";
    const lastUpdated = updatedAt ? formatRelativeTime(updatedAt, nowMs) : "waiting";

    return (
        <div className="space-y-8 pt-8 animate-fade-in">
            <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2">
                            <Loader2 className="h-4 w-4 animate-spin text-[#8FE3FF]" />
                            <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/55">
                                Live audit stream
                            </span>
                        </div>

                        <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-white/35">Current phase</p>
                            <h2 className="mt-2 text-2xl font-semibold text-white">{stageLabel}</h2>
                            <p className="mt-2 max-w-2xl text-sm text-white/55">
                                {detail || "Waiting for the backend to publish the next event."}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-white/50">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-black/20 px-3 py-1.5">
                                <Radar className="h-3.5 w-3.5 text-[#8FE3FF]" />
                                <span>{url}</span>
                            </div>
                            {backend && (
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-black/20 px-3 py-1.5">
                                    <Bot className="h-3.5 w-3.5 text-[#A7F3D0]" />
                                    <span>{backend}</span>
                                </div>
                            )}
                            {jobId && (
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-black/20 px-3 py-1.5">
                                    <Server className="h-3.5 w-3.5 text-white/65" />
                                    <span className="font-mono">{jobId.slice(0, 10)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
                        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/35">
                                <Clock3 className="h-3.5 w-3.5" />
                                Elapsed
                            </div>
                            <p className="mt-3 text-2xl font-semibold text-white">{elapsed}</p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/35">
                                <TimerReset className="h-3.5 w-3.5" />
                                Last update
                            </div>
                            <p className="mt-3 text-2xl font-semibold text-white">{lastUpdated}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/35">
                        <span>Backend completion</span>
                        <span>{percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#8FE3FF_0%,#F6F3EF_100%)] transition-all duration-700"
                            style={{ width: `${Math.max(6, percent)}%` }}
                        />
                    </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-4">
                    {PHASES.map((phase, index) => {
                        const isActive = index === activePhaseIndex;
                        const isDone = index < activePhaseIndex || stage === "audit:done";

                        return (
                            <div
                                key={phase.id}
                                className={`rounded-2xl border px-4 py-3 transition-colors ${
                                    isActive
                                        ? "border-[#8FE3FF]/40 bg-[#8FE3FF]/10"
                                        : isDone
                                          ? "border-emerald-400/25 bg-emerald-400/10"
                                          : "border-white/[0.06] bg-white/[0.02]"
                                }`}
                            >
                                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                                    Phase {index + 1}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <div
                                        className={`h-2 w-2 rounded-full ${
                                            isDone ? "bg-emerald-400" : isActive ? "animate-pulse bg-[#8FE3FF]" : "bg-white/15"
                                        }`}
                                    />
                                    <span className="text-sm font-medium text-white/80">{phase.label}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-white/35">Event feed</p>
                            <h3 className="mt-2 text-lg font-semibold text-white">Live backend timeline</h3>
                        </div>
                        <span className="text-xs text-white/35">{events.length} event{events.length === 1 ? "" : "s"}</span>
                    </div>

                    <div className="mt-5 space-y-3">
                        {recentEvents.length > 0 ? (
                            recentEvents.map((event, index) => (
                                <div
                                    key={`${event.timestamp}-${event.stage}-${index}`}
                                    className="flex items-start gap-3 rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3"
                                >
                                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#8FE3FF]" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            <p className="text-sm font-medium text-white/85">
                                                {STAGE_LABELS[event.stage] || event.stage}
                                            </p>
                                            <span className="text-[11px] uppercase tracking-[0.16em] text-white/30">
                                                {event.percent}%
                                            </span>
                                            <span className="text-[11px] text-white/30">
                                                {formatRelativeTime(event.timestamp, nowMs)}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-white/50">{event.detail}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-5 text-sm text-white/45">
                                Waiting for the first backend event.
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/35">Current activity</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">What the system is doing now</h3>

                    <div className="mt-5 rounded-2xl border border-white/[0.05] bg-black/20 p-4">
                        <p className="text-sm font-medium text-white/80">{stageLabel}</p>
                        <p className="mt-2 text-sm leading-6 text-white/50">
                            {detail || "No active detail yet."}
                        </p>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">Tracking</p>
                            <p className="mt-2 text-sm text-white/55">
                                This panel updates from the backend job state, not a client-side timer.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">Refresh cadence</p>
                            <p className="mt-2 text-sm text-white/55">
                                The frontend polls the audit job repeatedly and reflects every recorded stage change.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
