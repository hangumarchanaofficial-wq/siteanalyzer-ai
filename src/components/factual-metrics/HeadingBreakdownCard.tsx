"use client";

import { Heading } from "lucide-react";
import clsx from "clsx";
import { FactualHeadings } from "@/types/factual-metrics";

interface HeadingBreakdownCardProps {
  headings: FactualHeadings;
  className?: string;
}

/**
 * Displays H1 / H2 / H3 counts as a visually grouped card with
 * proportional bars and semantic status colouring for the H1 count.
 */
export function HeadingBreakdownCard({
  headings,
  className,
}: HeadingBreakdownCardProps) {
  const total = headings.h1 + headings.h2 + headings.h3;
  const maxCount = Math.max(headings.h1, headings.h2, headings.h3, 1);

  // H1 count drives the semantic colour.
  // Ideal: exactly 1.  0 or 2+ is problematic.
  const h1Status: "good" | "warn" | "bad" =
    headings.h1 === 1 ? "good" : headings.h1 === 0 ? "bad" : "warn";

  const h1StatusColor: Record<string, string> = {
    good: "text-emerald-400",
    warn: "text-amber-400",
    bad: "text-red-400",
  };

  const levels = [
    {
      tag: "H1",
      count: headings.h1,
      color: "bg-accent-blue",
      note:
        headings.h1 === 0
          ? "Missing"
          : headings.h1 === 1
            ? "Correct"
            : "Multiple",
      noteColor: h1StatusColor[h1Status],
    },
    {
      tag: "H2",
      count: headings.h2,
      color: "bg-accent-cyan/70",
      note: null,
      noteColor: "",
    },
    {
      tag: "H3",
      count: headings.h3,
      color: "bg-accent-violet/50",
      note: null,
      noteColor: "",
    },
  ];

  return (
    <div
      className={clsx(
        "group relative glass rounded-2xl p-5",
        "hover:shadow-card-hover hover:border-white/[0.08] hover:bg-surface-2/80",
        "transition-all duration-300",
        className,
      )}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-accent-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Heading className="w-4 h-4 text-white/30" />
          <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
            Headings
          </h3>
          <span className="ml-auto text-xs text-white/25 font-medium">
            {total} total
          </span>
        </div>

        {/* Heading level rows */}
        <div className="space-y-3.5">
          {levels.map((level) => {
            const widthPct = maxCount > 0 ? (level.count / maxCount) * 100 : 0;

            return (
              <div key={level.tag} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-semibold tracking-wider text-white/55 w-6">
                      {level.tag}
                    </span>
                    {level.note && (
                      <span
                        className={clsx(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                          level.noteColor,
                          "bg-white/[0.04]",
                        )}
                      >
                        {level.note}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white/80 tabular-nums">
                    {level.count}
                  </span>
                </div>
                {/* Bar */}
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      level.color,
                    )}
                    style={{
                      width: `${Math.max(widthPct, level.count > 0 ? 6 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
