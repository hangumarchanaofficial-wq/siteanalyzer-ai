"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { CustomChartTooltip } from "./CustomTooltip";
import { issueData } from "@/lib/benchmark-data";

export function CommonIssuesChart() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <ChartCard
      title="Most Common Website Issues"
      subtitle="Percentage of analyzed pages affected"
    >
      <div className="w-full h-[280px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={issueData}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barCategoryGap="20%"
          >
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "rgba(255,255,255,0.2)",
                fontSize: 11,
                fontFamily: "inherit",
              }}
              domain={[0, 80]}
              tickFormatter={(value: number) => `${value}%`}
            />

            <YAxis
              type="category"
              dataKey="shortLabel"
              axisLine={false}
              tickLine={false}
              width={110}
              tick={{
                fill: "rgba(255,255,255,0.40)",
                fontSize: 11,
                fontFamily: "inherit",
              }}
            />

            <Tooltip
              content={
                <CustomChartTooltip variant="bar" suffix="% of pages" />
              }
              cursor={{ fill: "rgba(255,255,255,0.02)" }}
            />

            <defs>
              {issueData.map((entry, i) => (
                <linearGradient
                  key={`barGrad-${i}`}
                  id={`barGrad-${i}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop
                    offset="0%"
                    stopColor={entry.color}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="100%"
                    stopColor={entry.color}
                    stopOpacity={0.4}
                  />
                </linearGradient>
              ))}
            </defs>

            <Bar
              dataKey="percentage"
              name="Affected Pages"
              radius={[0, 6, 6, 0]}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {issueData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#barGrad-${index})`}
                  style={{
                    filter:
                      hoveredIndex === index
                        ? `drop-shadow(0 0 8px ${entry.color}40)`
                        : "none",
                    transition: "filter 0.3s ease",
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend pills below chart */}
      <div className="mt-4 flex flex-wrap gap-2">
        {issueData.map((entry) => (
          <div
            key={entry.shortLabel}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03]"
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[10px] text-white/35">
              {entry.shortLabel}
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
