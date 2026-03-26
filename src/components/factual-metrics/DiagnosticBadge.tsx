"use client";

import { Check, X, Minus } from "lucide-react";
import clsx from "clsx";

type BadgeVariant = "boolean" | "status-code" | "language" | "count";

interface DiagnosticBadgeProps {
  variant: BadgeVariant;
  value: boolean | number | string | undefined | null;
  /** Label only used for accessible context; not visually rendered. */
  label?: string;
}

/**
 * Small inline badge that renders boolean yes/no, HTTP status codes,
 * language tags, or count values with appropriate semantic colouring.
 */
export function DiagnosticBadge({ variant, value, label }: DiagnosticBadgeProps) {
  if (value === undefined || value === null) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-white/25 font-medium"
        aria-label={label ? `${label}: unknown` : undefined}
      >
        <Minus className="w-3 h-3" />
        Unknown
      </span>
    );
  }

  if (variant === "boolean") {
    const isTrue = Boolean(value);
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 text-xs font-semibold",
          isTrue ? "text-emerald-400" : "text-red-400",
        )}
        aria-label={label ? `${label}: ${isTrue ? "yes" : "no"}` : undefined}
      >
        {isTrue ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
        {isTrue ? "Yes" : "No"}
      </span>
    );
  }

  if (variant === "status-code") {
    const code = Number(value);
    const isOk = code >= 200 && code < 300;
    const isRedirect = code >= 300 && code < 400;
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 text-xs font-bold tabular-nums",
          isOk
            ? "text-emerald-400"
            : isRedirect
              ? "text-amber-400"
              : "text-red-400",
        )}
      >
        {code}
      </span>
    );
  }

  if (variant === "language") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-blue uppercase tracking-wider">
        {String(value)}
      </span>
    );
  }

  // count
  return (
    <span className="text-xs font-bold text-white/80 tabular-nums">
      {typeof value === "number" ? value.toLocaleString() : String(value)}
    </span>
  );
}
