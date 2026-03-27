"use client";

import { useEffect, useMemo, useState } from "react";
import { Braces, FileCode2, FileJson2, ScrollText, Sparkles, X } from "lucide-react";
import { getPromptLogs } from "@/lib/ai-analyze";
import { PromptLogsResponse } from "@/lib/schemas";

interface PromptLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = "summary" | "input" | "prompt" | "output";

const TABS: Array<{ id: TabId; label: string; icon: typeof ScrollText }> = [
  { id: "summary", label: "Overview", icon: ScrollText },
  { id: "input", label: "Input", icon: FileJson2 },
  { id: "prompt", label: "Prompt", icon: FileCode2 },
  { id: "output", label: "Raw Output", icon: Braces },
];

export function PromptLogModal({ isOpen, onClose }: PromptLogModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [logs, setLogs] = useState<PromptLogsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadLogs = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await getPromptLogs();
        if (!cancelled) {
          setLogs(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load prompt logs.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLogs();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const activeContent = useMemo(() => {
    if (!logs) return "";
    if (activeTab === "summary") return logs.summary;
    if (activeTab === "input") return logs.sampleInput;
    if (activeTab === "prompt") return logs.samplePrompt;
    return logs.sampleRawOutput;
  }, [activeTab, logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-6 sm:py-10">
      <button
        aria-label="Close prompt logs"
        className="absolute inset-0 bg-[rgba(5,7,10,0.78)] backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0b0d11]/95 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
        <div className="absolute -top-24 right-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-12 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative border-b border-white/[0.06] px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/12 bg-cyan-300/8 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-100/70">
                <Sparkles className="h-3.5 w-3.5" />
                AI Orchestration Trace
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-white">
                Prompt Logs
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/45">
                Inspect the exact structured input, prompts, and raw model output used for the latest audit run.
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] p-2 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/45">
              Required deliverable
            </span>
            <span className="rounded-full border border-cyan-300/12 bg-cyan-300/8 px-3 py-1 text-[11px] text-cyan-100/70">
              {logs?.updatedAt
                ? `Updated ${new Date(logs.updatedAt).toLocaleString()}`
                : "Awaiting first prompt write"}
            </span>
          </div>
        </div>

        <div className="grid min-h-[min(72vh,760px)] grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-white/[0.06] bg-white/[0.02] p-4 xl:border-b-0 xl:border-r">
            <div className="space-y-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
                    activeTab === id
                      ? "border border-cyan-300/20 bg-cyan-300/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      : "border border-transparent bg-transparent text-white/45 hover:border-white/[0.06] hover:bg-white/[0.03] hover:text-white/75"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">
                      {id === "summary"
                        ? "Trace guide"
                        : id === "input"
                          ? "Structured facts"
                          : id === "prompt"
                            ? "Model instructions"
                            : "Unrepaired model text"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <div className="relative flex min-h-[420px] flex-col">
            {loading ? (
              <div className="flex flex-1 items-center justify-center px-8">
                <div className="space-y-3 text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-cyan-200/70" />
                  <p className="text-sm text-white/45">Loading prompt artifacts…</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-1 items-center justify-center px-8">
                <div className="max-w-md rounded-3xl border border-red-400/16 bg-red-400/[0.05] px-6 py-6 text-center">
                  <p className="text-sm font-medium text-red-200">Prompt logs unavailable</p>
                  <p className="mt-2 text-sm leading-6 text-white/45">{error}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col">
                <div className="border-b border-white/[0.06] px-6 py-4 text-[11px] uppercase tracking-[0.16em] text-white/28 sm:px-8">
                  {activeTab === "summary"
                    ? "Prompt orchestration summary"
                    : activeTab === "input"
                      ? "JSON snapshot"
                      : activeTab === "prompt"
                        ? "System and user prompts"
                        : "Raw model output"}
                </div>

                <div className="max-h-[calc(100vh-260px)] flex-1 overflow-auto px-6 py-6 sm:px-8">
                  <div className="rounded-[24px] border border-white/[0.06] bg-black/30 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <pre className="overflow-x-auto rounded-[20px] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-5 py-5 text-sm leading-7 text-white/72">
                      <code>{activeContent || "No log content available yet."}</code>
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
