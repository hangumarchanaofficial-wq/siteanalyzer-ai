"use client";

import { BenchmarkStat } from "@/types/benchmark";
import {
  Search,
  Image,
  MousePointerClick,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface BenchmarkStatCardProps {
  stat: BenchmarkStat;
  index: number;
}

const iconMap: Record<string, React.ReactNode> = {
  search: <Search className="w-4 h-4" />,
  image: <Image className="w-4 h-4" />,
  "mouse-pointer-click": <MousePointerClick className="w-4 h-4" />,
  smartphone: <Smartphone className="w-4 h-4" />,
};

export function BenchmarkStatCard({ stat, index }: BenchmarkStatCardProps) {
  const TrendIcon =
    stat.trend === "up"
      ? TrendingUp
      : stat.trend === "down"
      ? TrendingDown
      : Minus;

  const trendColor =
    stat.id === "missing-alt"
      ? stat.trend === "down"
        ? "text-emerald-400"
        : "text-red-400"
      : stat.trend === "up"
      ? "text-emerald-400"
      : stat.trend === "down"
      ? "text-red-400"
      : "text-white/40";

  return (
    <div
      className="group relative rounded-2xl overflow-hidden transition-all duration-500 bg-[rgba(16,16,20,0.6)] backdrop-blur-2xl border border-white/[0.06] hover:border-white/[0.10] hover:shadow-[0_8px_40px_rgba(0,0,0,0.35)] p-5"
      style={{
        animationDelay: `${index * 80}ms`,
        animationFillMode: "both",
      }}
    >
      {/* Top edge highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Accent glow */}
      <div
        className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-[0.06] blur-2xl transition-opacity duration-500 group-hover:opacity-[0.12]"
        style={{ backgroundColor: stat.accentColor }}
      />

      <div className="relative">
        {/* Icon + Trend */}
        <div className="flex items-center justify-between mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: `${stat.accentColor}12`,
              border: `1px solid ${stat.accentColor}20`,
            }}
          >
            <span style={{ color: stat.accentColor }}>
              {iconMap[stat.icon]}
            </span>
          </div>

          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold tabular-nums">
              {stat.trendValue}
            </span>
          </div>
        </div>

        {/* Value */}
        <p className="text-3xl font-bold text-white tracking-tight mb-1">
          {stat.value}
        </p>

        {/* Label */}
        <p className="text-[12px] font-medium text-white/50 mb-0.5">
          {stat.label}
        </p>
        <p className="text-[10px] text-white/25">{stat.subLabel}</p>
      </div>
    </div>
  );
}
