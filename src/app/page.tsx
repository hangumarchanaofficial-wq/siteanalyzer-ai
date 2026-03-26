"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { IndustryBenchmarks } from "@/components/benchmarks/IndustryBenchmarks";
import { AuditDashboard } from "@/components/AuditDashboard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { AuditResult, AuditState } from "@/types/audit";
import { AuditJobEvent } from "@/lib/schemas";
import { getAuditJobStatus, startAuditJob } from "@/lib/ai-analyze";

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
        <IndustryBenchmarks />

        {/* Footer */}
        <footer className="relative z-10 border-t border-border-subtle">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row items-start justify-between gap-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-accent flex items-center justify-center">
                    <span className="text-white text-xs font-bold">S</span>
                  </div>
                  <span className="text-sm font-semibold text-white/80">
                    SiteInsight AI
                  </span>
                </div>
                <p className="text-xs text-white/40">
                  Built for precise digital experiences. &copy; 2024
                </p>
              </div>
              <div className="flex gap-16 text-xs">
                <div className="space-y-3">
                  <p className="text-white/60 font-medium uppercase tracking-wider text-[10px]">
                    Product
                  </p>
                  <p className="text-white/40 hover:text-white/60 cursor-pointer transition-colors">
                    Features
                  </p>
                  <p className="text-white/40 hover:text-white/60 cursor-pointer transition-colors">
                    API
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-white/60 font-medium uppercase tracking-wider text-[10px]">
                    Company
                  </p>
                  <p className="text-white/40 hover:text-white/60 cursor-pointer transition-colors">
                    Privacy
                  </p>
                  <p className="text-white/40 hover:text-white/60 cursor-pointer transition-colors">
                    Legal
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-white/60 font-medium uppercase tracking-wider text-[10px]">
                    Connect
                  </p>
                  <p className="text-white/40 hover:text-white/60 cursor-pointer transition-colors">
                    Twitter
                  </p>
                  <p className="text-white/40 hover:text-white/60 cursor-pointer transition-colors">
                    Support
                  </p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
