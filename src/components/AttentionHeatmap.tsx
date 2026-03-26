"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Eye, Layers } from "lucide-react";
import { AuditAttentionModel } from "@/types/audit";

interface AttentionHeatmapProps {
  attention?: AuditAttentionModel;
}

const LEVEL_STYLES = {
  high: {
    dot: "bg-red-500",
    glow: "from-red-500/35 via-orange-400/18 to-transparent",
    border: "border-red-400/25",
    label: "High Attention",
  },
  medium: {
    dot: "bg-amber-400",
    glow: "from-amber-400/28 via-yellow-300/14 to-transparent",
    border: "border-amber-300/20",
    label: "Medium",
  },
  low: {
    dot: "bg-blue-500",
    glow: "from-blue-500/24 via-cyan-400/10 to-transparent",
    border: "border-blue-400/15",
    label: "Low",
  },
} as const;

export function AttentionHeatmap({ attention }: AttentionHeatmapProps) {
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const attentionData = attention ?? null;
  const hasAttention = Boolean(attentionData && attentionData.zones.length > 0);
  const maxIntensity = useMemo(
    () => Math.max(...(attentionData?.zones.map((zone) => zone.intensity) ?? [1])),
    [attentionData],
  );

  const topZones = useMemo(
    () =>
      (attentionData?.zones ?? [])
        .slice()
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 3),
    [attentionData],
  );

  const legendLevels = ["high", "medium", "low"] as const;

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
            <p className="text-sm text-white/35 max-w-2xl">
              Heuristic focus model based on rendered visual hierarchy, interactive targets,
              media prominence, and above-the-fold placement.
            </p>
          </div>

          <button
            onClick={() => setOverlayEnabled((value) => !value)}
            disabled={!hasAttention}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
              overlayEnabled && hasAttention
                ? "bg-white text-black"
                : "bg-surface-3 border border-border-subtle text-white/60 hover:bg-surface-4 hover:text-white/80",
              !hasAttention && "opacity-50 cursor-not-allowed hover:bg-surface-3 hover:text-white/60",
            )}
          >
            <Layers className="w-4 h-4" />
            {overlayEnabled && hasAttention ? "Overlay Active" : "Enable Overlay"}
          </button>
        </div>

        {hasAttention && attentionData ? (
          <>
            {overlayEnabled && (
              <div className="mt-6 relative rounded-xl overflow-hidden bg-surface-2 border border-border-subtle animate-fade-in">
                <div className="aspect-video relative">
                  <div
                    className="absolute inset-0 opacity-[0.05]"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
                      backgroundSize: "40px 40px",
                    }}
                  />

                  {attentionData.zones.map((zone) => {
                    const style = LEVEL_STYLES[zone.level];
                    const normalizedOpacity = zone.intensity / maxIntensity;
                    return (
                      <div
                        key={zone.id}
                        className="absolute transition-all duration-500"
                        style={{
                          left: `${zone.x * 100}%`,
                          top: `${Math.min(zone.y, 0.94) * 100}%`,
                          width: `${Math.max(zone.width * 100, 8)}%`,
                          height: `${Math.max(zone.height * 100, 6)}%`,
                        }}
                      >
                        <div
                          className={clsx(
                            "absolute inset-0 rounded-[28px] blur-2xl bg-gradient-to-br",
                            style.glow,
                          )}
                          style={{ opacity: Math.min(0.85, normalizedOpacity) }}
                        />
                        <div
                          className={clsx(
                            "absolute inset-0 rounded-[24px] border bg-white/[0.01]",
                            style.border,
                          )}
                          style={{ opacity: Math.min(0.55, normalizedOpacity * 0.75) }}
                        />
                      </div>
                    );
                  })}

                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    {legendLevels.map((level) => (
                      <div
                        key={level}
                        className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5"
                      >
                        <div className={clsx("w-2 h-2 rounded-full", LEVEL_STYLES[level].dot)} />
                        <span className="text-[10px] text-white/60">
                          {LEVEL_STYLES[level].label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center bg-black/55 backdrop-blur-sm rounded-2xl px-6 py-4">
                      <p className="text-xs text-white/40 mb-1">Attention Bias</p>
                      <p className="text-2xl font-bold text-white">
                        {attentionData.stats.aboveFoldShare}%
                        <span className="ml-2 text-sm font-normal text-white/40">
                          above fold
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatTile
                label="Strongest Zone"
                value={attentionData.stats.strongestZone ?? "Unknown"}
                helper="Most visually dominant element label"
              />
              <StatTile
                label="Dominant Region"
                value={formatRegion(attentionData.stats.dominantRegion)}
                helper="Where attention clusters most strongly"
              />
              <StatTile
                label="Elements Scanned"
                value={`${attentionData.stats.scannedElements}`}
                helper="Visible candidates considered in viewport model"
              />
            </div>

            {topZones.length > 0 && (
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-white/35 mb-3">
                  Top Focus Targets
                </p>
                <div className="space-y-2">
                  {topZones.map((zone) => (
                    <div
                      key={zone.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] border border-white/[0.05] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={clsx("w-2 h-2 rounded-full", LEVEL_STYLES[zone.level].dot)} />
                          <p className="text-sm font-medium text-white truncate">{zone.label}</p>
                        </div>
                        <p className="mt-1 text-xs text-white/35">
                          {zone.type.toUpperCase()} · {formatRegion(zone.region)} ·{" "}
                          {zone.aboveFold ? "Above fold" : "Below fold"}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-white/55 tabular-nums">
                        {Math.round((zone.intensity / maxIntensity) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <p className="text-sm text-white/55">
              Attention data was not captured for this audit. Re-run the backend after the
              latest update to generate real focus zones from the rendered page.
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-white/20">
          <div className="w-4 h-4 rounded-full border border-white/10 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
          <span className="text-xs">Heuristic viewport model</span>
        </div>
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/35">{helper}</p>
    </div>
  );
}

function formatRegion(region: string | null) {
  if (!region) return "Unknown";
  return region
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
