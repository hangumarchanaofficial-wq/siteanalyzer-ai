"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { CustomChartTooltip } from "./CustomTooltip";
import { trendData } from "@/lib/benchmark-data";

const seriesConfig = [
  {
    key: "seo",
    label: "SEO Score",
    color: "#a7efff",
    gradientId: "gradSeo",
  },
  {
    key: "performance",
    label: "Performance",
    color: "#d7d9de",
    gradientId: "gradPerf",
  },
  {
    key: "accessibility",
    label: "Accessibility",
    color: "#8bf0cf",
    gradientId: "gradA11y",
  },
  {
    key: "conversion",
    label: "Conversion",
    color: "#f4c27a",
    gradientId: "gradConv",
  },
];

export function PerformanceTrendsChart() {
  const [activeSeries, setActiveSeries] = useState<Set<string>>(
    new Set(seriesConfig.map((s) => s.key))
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSeries = useCallback((key: string) => {
    setActiveSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return (
    <ChartCard
      title="Global Website Performance Trends"
      subtitle="12-month rolling average across all analyzed pages"
      headerRight={
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {seriesConfig.map((series) => {
            const isActive = activeSeries.has(series.key);
            return (
              <button
                key={series.key}
                onClick={() => toggleSeries(series.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white/[0.06] text-white/70"
                    : "text-white/25 hover:text-white/40"
                }`}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full transition-opacity"
                  style={{
                    backgroundColor: series.color,
                    opacity: isActive ? 1 : 0.3,
                    boxShadow: isActive
                      ? `0 0 6px ${series.color}50`
                      : "none",
                  }}
                />
                <span className="hidden sm:inline">{series.label}</span>
              </button>
            );
          })}
        </div>
      }
    >
      <div className="w-full h-[280px] sm:h-[320px]">
        {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={trendData}
            margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
          >
            <defs>
              {seriesConfig.map((series) => (
                <linearGradient
                  key={series.gradientId}
                  id={series.gradientId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={series.color}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor={series.color}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.03)"
              vertical={false}
            />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "rgba(255,255,255,0.25)",
                fontSize: 11,
                fontFamily: "inherit",
              }}
              dy={8}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "rgba(255,255,255,0.2)",
                fontSize: 11,
                fontFamily: "inherit",
              }}
              domain={[30, 90]}
              tickCount={5}
              dx={-4}
            />

            <Tooltip
              content={<CustomChartTooltip variant="trend" suffix="%" />}
              cursor={{
                stroke: "rgba(255,255,255,0.06)",
                strokeWidth: 1,
              }}
            />

            {seriesConfig.map((series) => (
              <Area
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.label}
                stroke={
                  activeSeries.has(series.key) ? series.color : "transparent"
                }
                strokeWidth={2}
                fill={
                  activeSeries.has(series.key)
                    ? `url(#${series.gradientId})`
                    : "transparent"
                }
                dot={false}
                activeDot={
                  activeSeries.has(series.key)
                    ? {
                        r: 4,
                        fill: series.color,
                        stroke: "#0f0f12",
                        strokeWidth: 2,
                        style: {
                          filter: `drop-shadow(0 0 4px ${series.color}60)`,
                        },
                      }
                    : false
                }
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        ) : (
          <div className="w-full h-full rounded-xl bg-white/[0.03]" />
        )}
      </div>
    </ChartCard>
  );
}
