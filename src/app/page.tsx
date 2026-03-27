"use client";

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { PromptLogModal } from "@/components/PromptLogModal";
import { IndustryBenchmarks } from "@/components/benchmarks/IndustryBenchmarks";
import { AuditDashboard } from "@/components/AuditDashboard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { AuditResult, AuditState } from "@/types/audit";
import { AuditJobEvent } from "@/lib/schemas";
import { getAuditJobStatus, startAuditJob } from "@/lib/ai-analyze";
import { ScrollText } from "lucide-react";

const snowflakes = [
  { left: "4%", size: 3, duration: 20, delay: -2, drift: 18, opacity: 0.32 },
  { left: "11%", size: 5, duration: 24, delay: -8, drift: 26, opacity: 0.46 },
  { left: "15%", size: 2, duration: 16, delay: -10, drift: 12, opacity: 0.22 },
  { left: "18%", size: 2, duration: 18, delay: -4, drift: 14, opacity: 0.28 },
  { left: "24%", size: 4, duration: 26, delay: -11, drift: 22, opacity: 0.38 },
  { left: "27%", size: 3, duration: 19, delay: -1, drift: 16, opacity: 0.3 },
  { left: "31%", size: 3, duration: 21, delay: -6, drift: 20, opacity: 0.34 },
  { left: "35%", size: 4, duration: 30, delay: -16, drift: 28, opacity: 0.36 },
  { left: "39%", size: 5, duration: 29, delay: -14, drift: 28, opacity: 0.44 },
  { left: "47%", size: 2, duration: 17, delay: -9, drift: 12, opacity: 0.24 },
  { left: "50%", size: 3, duration: 20, delay: -6, drift: 18, opacity: 0.29 },
  { left: "54%", size: 4, duration: 23, delay: -3, drift: 18, opacity: 0.35 },
  { left: "58%", size: 2, duration: 15, delay: -12, drift: 10, opacity: 0.2 },
  { left: "62%", size: 3, duration: 27, delay: -12, drift: 24, opacity: 0.33 },
  { left: "68%", size: 5, duration: 31, delay: -18, drift: 30, opacity: 0.42 },
  { left: "71%", size: 4, duration: 22, delay: -4, drift: 19, opacity: 0.34 },
  { left: "74%", size: 2, duration: 19, delay: -5, drift: 14, opacity: 0.26 },
  { left: "78%", size: 3, duration: 24, delay: -14, drift: 21, opacity: 0.32 },
  { left: "81%", size: 4, duration: 25, delay: -15, drift: 20, opacity: 0.37 },
  { left: "85%", size: 2, duration: 18, delay: -7, drift: 13, opacity: 0.24 },
  { left: "88%", size: 3, duration: 22, delay: -7, drift: 16, opacity: 0.31 },
  { left: "94%", size: 5, duration: 28, delay: -13, drift: 24, opacity: 0.4 },
  { left: "97%", size: 3, duration: 21, delay: -9, drift: 17, opacity: 0.28 },
];

export default function Home() {
  const [auditState, setAuditState] = useState<AuditState>("idle");
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [inputUrl, setInputUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [auditJobId, setAuditJobId] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressDetail, setProgressDetail] = useState("");
  const [progressStage, setProgressStage] = useState("");
  const [progressEvents, setProgressEvents] = useState<AuditJobEvent[]>([]);
  const [jobCreatedAt, setJobCreatedAt] = useState("");
  const [jobUpdatedAt, setJobUpdatedAt] = useState("");
  const [jobBackend, setJobBackend] = useState<"ollama" | "openrouter" | "">("");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const handleRunAudit = useCallback(async (url: string) => {
    if (!url.trim()) return;
    stopPolling();
    setInputUrl(url);
    setAuditState("loading");
    setAuditResult(null);
    setErrorMessage("");
    setProgressPercent(0);
    setProgressDetail("Submitting audit job...");
    setProgressStage("audit:queued");
    setProgressEvents([]);
    setJobCreatedAt("");
    setJobUpdatedAt("");
    setJobBackend("");

    try {
      const job = await startAuditJob(url);
      setAuditJobId(job.job_id);
      setJobBackend(job.backend);
      setProgressPercent(job.percent ?? 0);
      setProgressDetail(job.detail ?? "Audit started");
      setProgressStage(job.stage ?? "audit:start");
      setProgressEvents(job.events ?? []);
      setJobCreatedAt(job.created_at ?? "");
      setJobUpdatedAt(job.updated_at ?? "");

      pollingRef.current = setInterval(async () => {
        try {
          const status = await getAuditJobStatus(job.job_id);
          setJobBackend(status.backend);
          setProgressPercent(status.percent ?? 0);
          setProgressDetail(status.detail ?? "");
          setProgressStage(status.stage ?? "");
          setProgressEvents(status.events ?? []);
          setJobCreatedAt(status.created_at ?? "");
          setJobUpdatedAt(status.updated_at ?? "");

          if (status.status === "success" && status.normalizedResult) {
            stopPolling();
            setAuditJobId("");
            setAuditResult(status.normalizedResult);
            setAuditState("success");
          } else if (status.status === "error") {
            stopPolling();
            setAuditJobId("");
            setErrorMessage(status.error || status.detail || "Audit failed unexpectedly.");
            setAuditState("error");
          }
        } catch (error) {
          stopPolling();
          setAuditJobId("");
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to fetch audit progress."
          );
          setAuditState("error");
        }
      }, 1000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Audit failed unexpectedly."
      );
      setAuditState("error");
    }
  }, [stopPolling]);

  const handleTryDemo = useCallback(() => {
    handleRunAudit("https://siteinsight.ai/landing");
  }, [handleRunAudit]);

  const handleReset = useCallback(() => {
    stopPolling();
    setAuditState("idle");
    setAuditResult(null);
    setInputUrl("");
    setAuditJobId("");
    setProgressPercent(0);
    setProgressDetail("");
    setProgressStage("");
    setProgressEvents([]);
    setJobCreatedAt("");
    setJobUpdatedAt("");
    setJobBackend("");
  }, [stopPolling]);

  return (
    <main className="relative min-h-screen">
      {/* Background effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-surface-0" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-accent-blue/[0.07] via-accent-violet/[0.03] to-transparent" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[400px] bg-gradient-radial from-accent-violet/[0.05] to-transparent" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {snowflakes.map((flake, index) => (
            <span
              key={index}
              className="snowflake"
              style={
                {
                  left: flake.left,
                  width: `${flake.size}px`,
                  height: `${flake.size}px`,
                  animationDuration: `${flake.duration}s`,
                  animationDelay: `${flake.delay}s`,
                  ["--snow-drift" as string]: `${flake.drift}px`,
                  ["--snow-opacity" as string]: flake.opacity,
                } as CSSProperties
              }
            />
          ))}
        </div>
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative z-10">
        <Navbar />
        <HeroSection
          onRunAudit={handleRunAudit}
          onTryDemo={handleTryDemo}
          isLoading={auditState === "loading"}
          currentUrl={inputUrl}
        />

        <div className="mx-auto -mt-8 flex max-w-7xl justify-center px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/16 bg-cyan-300/[0.08] px-4 py-2.5 text-xs font-medium tracking-[0.12em] text-cyan-100/80 transition-all duration-200 hover:border-cyan-200/24 hover:bg-cyan-300/[0.14] hover:text-white"
          >
            <ScrollText className="h-3.5 w-3.5" />
            VIEW PROMPT LOGS
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          {auditState === "idle" && <EmptyState />}
          {auditState === "loading" && (
            <LoadingState
              url={inputUrl}
              percent={progressPercent}
              detail={progressDetail}
              stage={progressStage}
              events={progressEvents}
              createdAt={jobCreatedAt}
              updatedAt={jobUpdatedAt}
              backend={jobBackend || undefined}
              jobId={auditJobId || undefined}
            />
          )}
          {auditState === "error" && (
            <ErrorState
              message={errorMessage}
              onRetry={() => handleRunAudit(inputUrl)}
            />
          )}
          {auditState === "success" && auditResult && (
            <AuditDashboard result={auditResult} onReset={handleReset} />
          )}
        </div>

        {/* ========================================= */}
        {/* INDUSTRY BENCHMARKS — always visible      */}
        {/* ========================================= */}
        <IndustryBenchmarks result={auditResult} />

        {/* Footer */}
        <footer className="relative z-10 border-t border-border-subtle">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <p className="text-center text-sm tracking-[0.08em] text-white/40">
              &copy; Hangum Archana
            </p>
          </div>
        </footer>
        <PromptLogModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
        />
      </div>
    </main>
  );
}
