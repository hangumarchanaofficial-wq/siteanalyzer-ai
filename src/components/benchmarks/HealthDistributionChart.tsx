"use client";

import { useState, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { ChartCard } from "./ChartCard";
import { healthData } from "@/lib/benchmark-data";

export function HealthDistributionChart() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onMouseEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const onMouseLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const total = healthData.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartCard
      title="Average Website Health Distribution"
      subtitle="Weighted category breakdown"
    >
      <div className="flex flex-col items-center">
        {/* Donut */}
        <div className="relative w-full h-[220px] sm:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {healthData.map((entry, i) => (
                  <filter
                    key={`glow-${i}`}
                    id={`pieGlow-${i}`}
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="0"
                      stdDeviation="3"
                      floodColor={entry.color}
                      floodOpacity="0.4"
                    />
                  </filter>
                ))}
              </defs>

              <Pie
                data={healthData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={activeIndex !== null ? 95 : 90}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                animationBegin={200}
                animationDuration={800}
              >
                {healthData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    style={{
                      filter:
                        activeIndex === index
                          ? `url(#pieGlow-${index})`
                          : "none",
                      transition: "all 0.3s ease",
                      opacity: activeIndex === null || activeIndex === index ? 1 : 0.4,
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {activeIndex !== null ? (
              <>
                <span
                  className="text-2xl font-bold transition-colors duration-200"
                  style={{ color: healthData[activeIndex].color }}
                >
                  {healthData[activeIndex].value}%
                </span>
                <span className="text-[11px] text-white/40 mt-0.5">
                  {healthData[activeIndex].name}
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-white">{total}%</span>
                <span className="text-[11px] text-white/30 mt-0.5">
                  Total Health
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-2 w-full max-w-[280px]">
          {healthData.map((segment, i) => (
            <div
              key={segment.name}
              className={`flex items-center gap-2.5 cursor-pointer transition-opacity duration-200 ${
                activeIndex !== null && activeIndex !== i
                  ? "opacity-40"
                  : "opacity-100"
              }`}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="relative">
                <div
                  className="w-3 h-3 rounded-[3px]"
                  style={{ backgroundColor: segment.color }}
                />
                {activeIndex === i && (
                  <div
                    className="absolute -inset-1 rounded-[5px] opacity-30 blur-sm"
                    style={{ backgroundColor: segment.color }}
                  />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] text-white/60 font-medium">
                  {segment.name}
                </span>
                <span className="text-[11px] text-white/30 tabular-nums">
                  {segment.value}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
