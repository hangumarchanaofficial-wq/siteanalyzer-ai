"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Crosshair,
  Gauge,
  Layers3,
  Radar,
  ScanSearch,
} from "lucide-react";
import { AuditRecommendation, AuditResult } from "@/types/audit";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar as RechartsRadar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/benchmarks/ChartCard";

interface IndustryBenchmarksProps {
  result?: AuditResult | null;
}

interface PriorityPoint {
  id: string;
  title: string;
  priority: AuditRecommendation["priority"];
  category: string;
  impact: number;
  effort: number;
}

interface LaidOutPriorityPoint extends PriorityPoint {
  left: number;
  top: number;
}

interface LoadMetric {
  label: string;
  value: string;
  raw: number;
  color: string;
  helper: string;
}

type Tone = "good" | "warn" | "bad" | "info";

interface StructuralMetric {
  title: string;
  value: string;
  helper: string;
  score: number;
  tone: Tone;
}

interface ScoreDatum {
  label: string;
  score: number;
}

interface RiskDatum {
  label: string;
  value: number;
  helper: string;
}

function priorityToImpact(priority: AuditRecommendation["priority"]) {
  if (priority === "critical") return 88;
  if (priority === "high") return 72;
  if (priority === "medium") return 54;
  return 36;
}

function categoryToEffort(category: string) {
  const key = category.toLowerCase();
  if (key.includes("accessibility")) return 42;
  if (key.includes("seo")) return 48;
  if (key.includes("ux")) return 58;
  if (key.includes("content")) return 64;
  return 52;
}

function buildPriorityPoints(result: AuditResult): PriorityPoint[] {
  return result.recommendations.slice(0, 6).map((recommendation, index) => ({
    id: recommendation.id,
    title: recommendation.title,
    priority: recommendation.priority,
    category: recommendation.category,
    impact: Math.min(94, priorityToImpact(recommendation.priority) + index * 2),
    effort: Math.max(12, Math.min(88, categoryToEffort(recommendation.category) + index * 4)),
  }));
}

function layoutPriorityPoints(points: PriorityPoint[]): LaidOutPriorityPoint[] {
  const sorted = [...points].sort((a, b) => {
    const topDelta = (100 - b.impact) - (100 - a.impact);
    if (Math.abs(topDelta) > 16) return topDelta;
    return a.effort - b.effort;
  });

  const placed: LaidOutPriorityPoint[] = [];

  for (const point of sorted) {
    const baseLeft = Math.max(18, Math.min(82, point.effort));
    const baseTop = Math.max(14, Math.min(86, 100 - point.impact));
    let left = baseLeft;
    let top = baseTop;

    for (let pass = 0; pass < 8; pass += 1) {
      const collision = placed.some(
        (existing) =>
          Math.abs(existing.left - left) < 20 && Math.abs(existing.top - top) < 12,
      );

      if (!collision) break;

      const verticalDirection = baseTop < 50 ? 1 : -1;
      const horizontalDirection = baseLeft < 50 ? 1 : -1;

      top = Math.max(14, Math.min(86, top + verticalDirection * 8));
      left = Math.max(18, Math.min(82, left + horizontalDirection * 4));
    }

    placed.push({ ...point, left, top });
  }

  return placed;
}

function buildLoadMetrics(result: AuditResult): LoadMetric[] {
  const advanced = result.advanced;
  const metrics = [
    {
      label: "Images",
      value:
        advanced?.images_kb !== undefined
          ? formatKilobytes(advanced.images_kb)
          : `${result.metrics.images.total} assets`,
      raw: advanced?.images_kb ?? result.metrics.images.total * 24,
      color: "bg-accent-blue",
      helper: `${result.metrics.images.total} image resources`,
    },
    {
      label: "JavaScript",
      value:
        advanced?.js_kb !== undefined
          ? formatKilobytes(advanced.js_kb)
          : `${advanced?.external_scripts ?? 0} files`,
      raw: advanced?.js_kb ?? (advanced?.external_scripts ?? 0) * 35,
      color: "bg-amber-400",
      helper: `${advanced?.external_scripts ?? 0} external scripts`,
    },
    {
      label: "HTML",
      value:
        advanced?.html_kb !== undefined ? formatKilobytes(advanced.html_kb) : "Unknown",
      raw: advanced?.html_kb ?? 0,
      color: "bg-accent-cyan",
      helper: `${advanced?.dom_elements ?? 0} DOM elements`,
    },
    {
      label: "CSS",
      value:
        advanced?.css_kb !== undefined
          ? formatKilobytes(advanced.css_kb)
          : `${advanced?.external_stylesheets ?? 0} files`,
      raw: advanced?.css_kb ?? (advanced?.external_stylesheets ?? 0) * 10,
      color: "bg-accent-violet",
      helper: `${advanced?.external_stylesheets ?? 0} stylesheets`,
    },
  ];

  return metrics.filter((metric) => metric.raw > 0 || metric.value !== "Unknown");
}

function buildQualityProfile(result: AuditResult): ScoreDatum[] {
  const totalLinks = Math.max(1, result.metrics.links.internal + result.metrics.links.external);
  const internalRatio = result.metrics.links.internal / totalLinks;
  const trustCount =
    Number(Boolean(result.advanced?.https)) +
    Number(Boolean(result.advanced?.favicon)) +
    Number(Boolean(result.advanced?.html_lang));

  return [
    {
      label: "Content",
      score: clampPercent(Math.min(100, (result.metrics.wordCount / 1200) * 100)),
    },
    {
      label: "Structure",
      score: clampPercent(
        (result.metrics.headings.h1 === 1 ? 45 : 20) +
          Math.min(result.metrics.headings.h2 * 8, 35) +
          Math.min(result.metrics.headings.h3 * 4, 20),
      ),
    },
    {
      label: "CTA",
      score: clampPercent(Math.min(result.metrics.ctaCount, 4) * 25),
    },
    {
      label: "Links",
      score: clampPercent(internalRatio * 100),
    },
    {
      label: "Trust",
      score: clampPercent((trustCount / 3) * 100),
    },
    {
      label: "Access",
      score: clampPercent(
        100 -
          Math.min(result.metrics.images.missingAltPercent, 70) -
          Math.min((result.advanced?.unlabelled_inputs ?? 0) * 10, 30),
      ),
    },
  ];
}

function buildRiskBreakdown(result: AuditResult): RiskDatum[] {
  const loadTimeMs = result.advanced?.load_time_ms ?? 0;
  const scriptCount = result.advanced?.external_scripts ?? 0;
  const inlineStyles = result.advanced?.inline_styles ?? 0;
  const unlabeledInputs = result.advanced?.unlabelled_inputs ?? 0;

  return [
    {
      label: "Alt text",
      value: clampPercent(result.metrics.images.missingAltPercent),
      helper: `${result.metrics.images.missingAlt} images missing alt`,
    },
    {
      label: "Forms",
      value: clampPercent(Math.min(unlabeledInputs * 22, 100)),
      helper: `${unlabeledInputs} inputs without labels`,
    },
    {
      label: "Load delay",
      value: clampPercent((loadTimeMs / 8000) * 100),
      helper:
        loadTimeMs > 0 ? `${(loadTimeMs / 1000).toFixed(1)}s total load time` : "Load time unavailable",
    },
    {
      label: "Scripts",
      value: clampPercent((scriptCount / 20) * 100),
      helper: `${scriptCount} external scripts found`,
    },
    {
      label: "Inline CSS",
      value: clampPercent((inlineStyles / 600) * 100),
      helper: `${inlineStyles} inline style blocks`,
    },
  ];
}

function formatKilobytes(value: number) {
  if (value >= 1024) return `${(value / 1024).toFixed(1)} MB`;
  return `${value.toFixed(0)} KB`;
}

function priorityTone(priority: AuditRecommendation["priority"]) {
  if (priority === "critical") return "bg-red-500";
  if (priority === "high") return "bg-amber-400";
  if (priority === "medium") return "bg-sky-400";
  return "bg-emerald-400";
}

function humanizeCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
}

function formatRegion(region: string | null | undefined) {
  if (!region) return "Unknown";
  return region
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toneClasses(tone: Tone) {
  if (tone === "good") {
    return {
      text: "text-emerald-300",
      chip: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
      bar: "bg-emerald-400",
      glow: "shadow-[0_0_0_1px_rgba(16,185,129,0.06)]",
    };
  }
  if (tone === "warn") {
    return {
      text: "text-amber-300",
      chip: "border-amber-400/20 bg-amber-400/10 text-amber-300",
      bar: "bg-amber-400",
      glow: "shadow-[0_0_0_1px_rgba(251,191,36,0.06)]",
    };
  }
  if (tone === "bad") {
    return {
      text: "text-red-300",
      chip: "border-red-400/20 bg-red-400/10 text-red-300",
      bar: "bg-red-400",
      glow: "shadow-[0_0_0_1px_rgba(248,113,113,0.06)]",
    };
  }
  return {
    text: "text-sky-300",
    chip: "border-sky-400/20 bg-sky-400/10 text-sky-300",
    bar: "bg-sky-400",
    glow: "shadow-[0_0_0_1px_rgba(56,189,248,0.06)]",
  };
}

export function IndustryBenchmarks({ result }: IndustryBenchmarksProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const priorityPoints = useMemo(
    () => (result ? buildPriorityPoints(result) : []),
    [result],
  );
  const laidOutPriorityPoints = useMemo(
    () => layoutPriorityPoints(priorityPoints),
    [priorityPoints],
  );
  const loadMetrics = useMemo(() => (result ? buildLoadMetrics(result) : []), [result]);
  const qualityProfile = useMemo(() => (result ? buildQualityProfile(result) : []), [result]);
  const riskBreakdown = useMemo(() => (result ? buildRiskBreakdown(result) : []), [result]);
  const strongestAttention = result?.attention?.zones[0];
  const topCtaInsight = result?.insights.find((item) => item.category === "cta");
  const aboveFoldShare = result?.attention?.stats.aboveFoldShare ?? 0;
  const alignmentScore = useMemo(() => {
    if (!result || !strongestAttention) return 24;
    let score = strongestAttention.aboveFold ? 34 : 14;
    if (strongestAttention.type === "button") score += 34;
    else if (strongestAttention.type === "a") score += 26;
    else if (strongestAttention.type === "form") score += 18;
    else score += 8;
    if (result.metrics.ctaCount > 0) score += 16;
    return clampPercent(score);
  }, [result, strongestAttention]);

  const structuralMetrics = useMemo<StructuralMetric[]>(() => {
    if (!result) return [];

    const headingScore =
      result.metrics.headings.h1 === 1
        ? clampPercent(72 + Math.min(result.metrics.headings.h2 * 5, 18))
        : clampPercent(28 + Math.min(result.metrics.headings.h2 * 3, 12));
    const headingTone: Tone =
      result.metrics.headings.h1 === 1 ? "good" : result.metrics.headings.h2 > 0 ? "warn" : "bad";

    const totalLinks = Math.max(
      1,
      result.metrics.links.internal + result.metrics.links.external,
    );
    const internalRatio = result.metrics.links.internal / totalLinks;
    const linkScore = clampPercent(internalRatio * 100);
    const linkTone: Tone =
      internalRatio >= 0.75 ? "good" : internalRatio >= 0.5 ? "warn" : "bad";

    const unlabeled = result.advanced?.unlabelled_inputs ?? 0;
    const labelingScore = clampPercent(100 - Math.min(unlabeled * 22, 88));
    const labelingTone: Tone =
      unlabeled === 0 ? "good" : unlabeled <= 2 ? "warn" : "bad";

    const trustCount =
      Number(Boolean(result.advanced?.https)) +
      Number(Boolean(result.advanced?.favicon)) +
      Number(Boolean(result.advanced?.html_lang));
    const trustScore = clampPercent((trustCount / 3) * 100);
    const trustTone: Tone =
      trustCount === 3 ? "good" : trustCount === 2 ? "warn" : "bad";

    return [
      {
        title: "Heading hierarchy",
        value: `${result.metrics.headings.h1}/${result.metrics.headings.h2}/${result.metrics.headings.h3}`,
        helper: "H1 / H2 / H3 distribution",
        score: headingScore,
        tone: headingTone,
      },
      {
        title: "Link balance",
        value: `${result.metrics.links.internal}:${result.metrics.links.external}`,
        helper: "Internal to external links",
        score: linkScore,
        tone: linkTone,
      },
      {
        title: "Labeling risk",
        value: `${unlabeled}`,
        helper: "Inputs missing accessible labels",
        score: labelingScore,
        tone: labelingTone,
      },
      {
        title: "Trust markers",
        value: `${result.advanced?.https ? "HTTPS" : "HTTP"} · ${result.advanced?.favicon ? "Favicon" : "No icon"}`,
        helper: `${result.advanced?.html_lang ?? "No"} html lang attribute`,
        score: trustScore,
        tone: trustTone,
      },
    ];
  }, [result]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-20 sm:py-28">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 h-[500px] w-[500px] rounded-full bg-accent-blue/[0.03] blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 h-[400px] w-[400px] rounded-full bg-accent-violet/[0.04] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={clsx(
            "mb-14 text-center transition-all duration-700",
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
          )}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.04] px-3.5 py-1.5">
            <ScanSearch className="h-3.5 w-3.5 text-accent-blue" />
            <span className="text-[11px] font-medium tracking-wide text-white/50">
              Decision Intelligence
            </span>
          </div>

          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Unique Audit <span className="text-gradient-accent">Signals</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/35">
            Action-oriented views built from this audit run: what to fix first, what is
            weighing the page down, and whether attention is landing on the right elements.
          </p>
        </div>

        {result ? (
          <>
            <div
              className={clsx(
                "mb-8 grid grid-cols-1 gap-4 transition-all duration-700 delay-150 md:grid-cols-3",
                isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
              )}
            >
              <SignalCard
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Primary Risk"
                value={result.recommendations[0]?.title ?? "No urgent issue detected"}
                helper={
                  result.recommendations[0]
                    ? `${result.recommendations[0].priority.toUpperCase()} · ${humanizeCategory(result.recommendations[0].category)}`
                    : "The current audit produced no prioritized recommendation"
                }
                tone={
                  result.recommendations[0]?.priority === "critical"
                    ? "bad"
                    : result.recommendations[0]?.priority === "high"
                      ? "warn"
                      : "info"
                }
              />
              <SignalCard
                icon={<Layers3 className="h-4 w-4" />}
                label="Load Composition"
                value={
                  result.advanced?.total_kb !== undefined
                    ? formatKilobytes(result.advanced.total_kb)
                    : `${result.metrics.images.total + (result.advanced?.external_scripts ?? 0)} tracked assets`
                }
                helper={`Images ${result.metrics.images.total} · Scripts ${result.advanced?.external_scripts ?? 0} · DOM ${result.advanced?.dom_elements ?? 0}`}
                tone="info"
              />
              <SignalCard
                icon={<Crosshair className="h-4 w-4" />}
                label="Attention Alignment"
                value={strongestAttention?.label ?? "No focal zone"}
                helper={
                  strongestAttention
                    ? `${formatRegion(strongestAttention.region)} · ${strongestAttention.aboveFold ? "Above fold" : "Below fold"}`
                    : "No attention model returned for this audit"
                }
                tone={alignmentScore >= 70 ? "good" : alignmentScore >= 45 ? "warn" : "bad"}
              />
            </div>

            <div
              className={clsx(
                "grid grid-cols-1 gap-6 transition-all duration-700 delay-300 xl:grid-cols-2",
                isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
              )}
            >
              <section className="glass rounded-2xl p-6">
                <div className="mb-2 flex items-center gap-2">
                  <Radar className="h-5 w-5 text-accent-blue" />
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    Issue Priority Matrix
                  </h3>
                </div>
                <p className="text-sm text-white/35">
                  Recommendations positioned by likely impact and implementation effort.
                </p>

                <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="relative h-[360px]">
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px">
                      {[
                        ["Quick wins", "High impact / low effort"],
                        ["Strategic bets", "High impact / higher effort"],
                        ["Light polish", "Lower impact / low effort"],
                        ["Backlog", "Lower impact / higher effort"],
                      ].map(([title, subtitle]) => (
                        <div
                          key={title}
                          className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-3"
                        >
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/28">
                            {title}
                          </p>
                          <p className="mt-1 text-[11px] text-white/18">{subtitle}</p>
                        </div>
                      ))}
                    </div>

                    <div className="absolute inset-0">
                      {laidOutPriorityPoints.map((point) => (
                        <div
                          key={point.id}
                          className="absolute -translate-x-1/2 -translate-y-1/2"
                          style={{
                            left: `${point.left}%`,
                            top: `${point.top}%`,
                          }}
                        >
                          <div className="max-w-[220px] rounded-2xl border border-white/[0.08] bg-surface-3/95 px-3 py-2 backdrop-blur-sm shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
                            <div className="flex items-center gap-2">
                              <div className={clsx("h-2 w-2 rounded-full", priorityTone(point.priority))} />
                              <span className="line-clamp-1 text-xs font-medium text-white/78">
                                {point.title}
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] text-white/30">
                              {point.priority.toUpperCase()} · {humanizeCategory(point.category)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 -translate-x-full rotate-[-90deg] text-[11px] uppercase tracking-[0.12em] text-white/25">
                      Impact
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.12em] text-white/25">
                      Effort
                    </div>
                  </div>
                </div>
              </section>

              <section className="glass rounded-2xl p-6">
                <div className="mb-2 flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-accent-cyan" />
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    Technical Load Composition
                  </h3>
                </div>
                <p className="text-sm text-white/35">
                  Live resource weighting from the rendered page instead of a generic trend line.
                </p>

                <div className="mt-6 space-y-4">
                  {loadMetrics.map((metric) => {
                    const maxRaw = Math.max(...loadMetrics.map((item) => item.raw), 1);
                    const width = Math.max(8, Math.round((metric.raw / maxRaw) * 100));

                    return (
                      <div
                        key={metric.label}
                        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.12em] text-white/28">
                              {metric.label}
                            </p>
                            <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                              {metric.value}
                            </p>
                          </div>
                          <p className="max-w-[180px] text-right text-xs text-white/30">
                            {metric.helper}
                          </p>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                          <div className={clsx("h-full rounded-full", metric.color)} style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <div
              className={clsx(
                "mt-6 grid grid-cols-1 gap-6 transition-all duration-700 delay-[450ms] xl:grid-cols-2",
                isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
              )}
            >
              <section className="glass rounded-2xl p-6">
                <div className="mb-2 flex items-center gap-2">
                  <Crosshair className="h-5 w-5 text-accent-blue" />
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    Attention vs CTA Alignment
                  </h3>
                </div>
                <p className="text-sm text-white/35">
                  Checks whether the strongest attention zone matches an actionable conversion target.
                </p>

                <div className="mt-6 space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-white/28">
                        Strongest focus target
                      </p>
                      <p className="mt-2 text-xl font-semibold text-white">
                        {strongestAttention?.label ?? "No target captured"}
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        {strongestAttention
                          ? `${strongestAttention.type.toUpperCase()} · ${formatRegion(strongestAttention.region)} · ${strongestAttention.aboveFold ? "Above fold" : "Below fold"}`
                          : "The attention model did not return any focus zones."}
                      </p>
                    </div>
                    <div
                      className={clsx(
                        "rounded-xl border px-3 py-2",
                        alignmentScore >= 70
                          ? "border-emerald-400/18 bg-emerald-400/8"
                          : alignmentScore >= 45
                            ? "border-amber-400/18 bg-amber-400/8"
                            : "border-red-400/18 bg-red-400/8",
                      )}
                    >
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">
                        CTA score
                      </p>
                      <p
                        className={clsx(
                          "mt-1 text-lg font-semibold",
                          alignmentScore >= 70
                            ? "text-emerald-300"
                            : alignmentScore >= 45
                              ? "text-amber-300"
                              : "text-red-300",
                        )}
                      >
                        {topCtaInsight?.score ?? alignmentScore}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-white/28">
                          Alignment graph
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          Focus concentration vs CTA visibility in the first viewport
                        </p>
                      </div>
                      <div
                        className={clsx(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                          alignmentScore >= 70
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                            : alignmentScore >= 45
                              ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                              : "border-red-400/20 bg-red-400/10 text-red-300",
                        )}
                      >
                        {alignmentScore >= 70 ? "Well aligned" : alignmentScore >= 45 ? "Needs tuning" : "Misaligned"}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <MetricRail
                        label="Focus above fold"
                        value={`${aboveFoldShare}%`}
                        percent={aboveFoldShare}
                        tone={aboveFoldShare >= 70 ? "good" : aboveFoldShare >= 40 ? "warn" : "bad"}
                      />
                      <MetricRail
                        label="CTA visibility"
                        value={`${Math.min(result.metrics.ctaCount, 4)}/4`}
                        percent={clampPercent((Math.min(result.metrics.ctaCount, 4) / 4) * 100)}
                        tone={result.metrics.ctaCount >= 2 ? "good" : result.metrics.ctaCount === 1 ? "warn" : "bad"}
                      />
                      <MetricRail
                        label="Attention fit"
                        value={`${alignmentScore}%`}
                        percent={alignmentScore}
                        tone={alignmentScore >= 70 ? "good" : alignmentScore >= 45 ? "warn" : "bad"}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <MiniPanel
                      title="Observed CTA count"
                      value={`${result.metrics.ctaCount}`}
                      helper="Detected call-to-action elements on this page"
                      tone={result.metrics.ctaCount >= 2 ? "good" : result.metrics.ctaCount === 1 ? "warn" : "bad"}
                      percent={clampPercent((Math.min(result.metrics.ctaCount, 4) / 4) * 100)}
                    />
                    <MiniPanel
                      title="Focus above fold"
                      value={`${aboveFoldShare}%`}
                      helper="Share of strongest heuristic zones in the first viewport"
                      tone={aboveFoldShare >= 70 ? "good" : aboveFoldShare >= 40 ? "warn" : "bad"}
                      percent={aboveFoldShare}
                    />
                  </div>

                  <div
                    className={clsx(
                      "rounded-xl border px-4 py-4",
                      strongestAttention?.type === "button" || strongestAttention?.type === "a"
                        ? "border-emerald-400/16 bg-emerald-400/[0.05]"
                        : "border-amber-400/16 bg-amber-400/[0.05]",
                    )}
                  >
                    <p className="text-[11px] uppercase tracking-[0.12em] text-white/38">
                      Alignment read
                    </p>
                    <p
                      className={clsx(
                        "mt-2 text-sm leading-6",
                        strongestAttention?.type === "button" || strongestAttention?.type === "a"
                          ? "text-emerald-100/85"
                          : "text-amber-100/85",
                      )}
                    >
                      {strongestAttention?.type === "button" || strongestAttention?.type === "a"
                        ? "Attention is landing on an actionable element, which is good. The next optimization is to improve clarity and follow-through around that focal target."
                        : "Attention is not landing on a clear CTA first. Consider bringing the primary action higher in the hierarchy or increasing its visual contrast near the strongest focus zone."}
                    </p>
                  </div>
                </div>
              </section>

              <section className="glass rounded-2xl p-6">
                <div className="mb-2 flex items-center gap-2">
                  <Layers3 className="h-5 w-5 text-accent-violet" />
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    Structural Snapshot
                  </h3>
                </div>
                <p className="text-sm text-white/35">
                  A compact read on technical trust, hierarchy density, and content balance.
                </p>

                <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-white/28">
                        Snapshot graph
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        Relative health across structure, balance, accessibility, and trust.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">
                        Average structural health
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {clampPercent(
                          structuralMetrics.reduce((sum, item) => sum + item.score, 0) /
                            Math.max(structuralMetrics.length, 1),
                        )}
                        %
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {structuralMetrics.map((metric) => (
                      <MetricRail
                        key={metric.title}
                        label={metric.title}
                        value={metric.value}
                        percent={metric.score}
                        tone={metric.tone}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {structuralMetrics.map((metric) => (
                    <MiniPanel
                      key={metric.title}
                      title={metric.title}
                      value={metric.value}
                      helper={metric.helper}
                      tone={metric.tone}
                      percent={metric.score}
                    />
                  ))}
                </div>
              </section>
            </div>

            <div
              className={clsx(
                "mt-6 grid grid-cols-1 gap-6 transition-all duration-700 delay-[600ms] xl:grid-cols-2",
                isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
              )}
            >
              <ChartCard
                title="Quality Profile"
                subtitle="Normalized health across the page's most important audit dimensions."
                headerRight={
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/40">
                    Live audit
                  </span>
                }
              >
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={qualityProfile} outerRadius="72%">
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis
                        dataKey="label"
                        tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                      />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "rgba(255,255,255,0.85)" }} />
                      <RechartsRadar
                        dataKey="score"
                        stroke="#7dd3fc"
                        fill="#38bdf8"
                        fillOpacity={0.26}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard
                title="Risk Concentration"
                subtitle="Where the current page is accumulating the most implementation pressure."
                headerRight={
                  <span className="rounded-full border border-red-400/18 bg-red-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-red-200/80">
                    Hotspots
                  </span>
                }
              >
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskBreakdown} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={74}
                        tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                        contentStyle={tooltipStyle}
                        formatter={(value) => `${value ?? 0}%`}
                        labelFormatter={(label, payload) =>
                          payload?.[0]?.payload?.helper
                            ? `${label} - ${payload[0].payload.helper}`
                            : `${label}`
                        }
                      />
                      <Bar dataKey="value" radius={[999, 999, 999, 999]} fill="#f87171" barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
          </>
        ) : (
          <div
            className={clsx(
              "glass rounded-2xl p-8 text-center transition-all duration-700 delay-150",
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
            )}
          >
            <p className="text-lg font-semibold text-white">
              Run an audit to unlock decision intelligence
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-white/38">
              This space will turn your audit into priority mapping, technical load analysis,
              and attention alignment instead of generic trend charts.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

const tooltipStyle = {
  backgroundColor: "rgba(10,10,12,0.92)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "14px",
  boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
  color: "rgba(255,255,255,0.82)",
};

function SignalCard({
  icon,
  label,
  value,
  helper,
  tone = "info",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  tone?: Tone;
}) {
  const toneClass = toneClasses(tone);

  return (
    <div className={clsx("glass rounded-2xl p-5", toneClass.glow)}>
      <div className="flex items-center gap-2 text-white/35">
        {icon}
        <span className="text-[11px] uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className={clsx("mt-4 text-2xl font-semibold tracking-tight", toneClass.text)}>
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-white/35">{helper}</p>
    </div>
  );
}

function MiniPanel({
  title,
  value,
  helper,
  tone = "info",
  percent,
}: {
  title: string;
  value: string;
  helper: string;
  tone?: Tone;
  percent?: number;
}) {
  const toneClass = toneClasses(tone);

  return (
    <div className={clsx("rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4", toneClass.glow)}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-white/28">{title}</p>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className={clsx("text-lg font-semibold", toneClass.text)}>{value}</p>
        {percent !== undefined ? (
          <span className={clsx("rounded-full border px-2 py-0.5 text-[10px] font-medium", toneClass.chip)}>
            {clampPercent(percent)}%
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-white/35">{helper}</p>
      {percent !== undefined ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className={clsx("h-full rounded-full", toneClass.bar)}
            style={{ width: `${clampPercent(percent)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function MetricRail({
  label,
  value,
  percent,
  tone,
}: {
  label: string;
  value: string;
  percent: number;
  tone: Tone;
}) {
  const toneClass = toneClasses(tone);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] uppercase tracking-[0.12em] text-white/28">{label}</p>
        <p className={clsx("text-sm font-medium", toneClass.text)}>{value}</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className={clsx("h-full rounded-full", toneClass.bar)}
          style={{ width: `${clampPercent(percent)}%` }}
        />
      </div>
    </div>
  );
}
