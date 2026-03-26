"use client";

interface TooltipEntry {
  color?: string;
  name?: string;
  dataKey?: string;
  value?: number | string;
}

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  variant?: "trend" | "bar" | "donut";
  suffix?: string;
}

export function CustomChartTooltip({
  active,
  payload,
  label,
  variant = "trend",
  suffix = "",
}: CustomChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-surface-1/95 backdrop-blur-xl border border-white/[0.08] rounded-xl px-4 py-3 shadow-2xl shadow-black/40">
      {label && (
        <p className="text-[11px] text-white/40 font-medium mb-2 uppercase tracking-wider">
          {label}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2.5 min-w-[140px]">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: entry.color,
                boxShadow: `0 0 6px ${entry.color}60`,
              }}
            />
            <span className="text-[11px] text-white/50 flex-1 truncate">
              {entry.name || entry.dataKey}
            </span>
            <span className="text-[12px] font-semibold text-white tabular-nums">
              {typeof entry.value === "number"
                ? entry.value.toFixed(variant === "donut" ? 0 : 1)
                : entry.value}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
