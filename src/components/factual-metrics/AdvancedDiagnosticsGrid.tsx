"use client";

import {
  Clock,
  Server,
  Code2,
  Paintbrush,
  FileCode2,
  FileText,
  Video,
  Accessibility,
  Share2,
  Shield,
  Star,
  Globe,
  FormInput,
  LayoutGrid,
} from "lucide-react";
import clsx from "clsx";
import { FactualAdvancedDiagnostics } from "@/types/factual-metrics";
import { DiagnosticBadge } from "./DiagnosticBadge";

interface AdvancedDiagnosticsGridProps {
  advanced: FactualAdvancedDiagnostics;
  className?: string;
}

interface DiagnosticItem {
  key: keyof FactualAdvancedDiagnostics;
  label: string;
  icon: React.ReactNode;
  variant: "boolean" | "status-code" | "language" | "count";
  /** Optional formatter for count values. */
  format?: (v: number) => string;
}

const DIAGNOSTIC_ITEMS: DiagnosticItem[] = [
  {
    key: "load_time_ms",
    label: "Load Time",
    icon: <Clock className="w-3.5 h-3.5" />,
    variant: "count",
    format: (v) => `${(v / 1000).toFixed(1)}s`,
  },
  {
    key: "status_code",
    label: "Status Code",
    icon: <Server className="w-3.5 h-3.5" />,
    variant: "status-code",
  },
  {
    key: "dom_elements",
    label: "DOM Elements",
    icon: <LayoutGrid className="w-3.5 h-3.5" />,
    variant: "count",
  },
  {
    key: "inline_styles",
    label: "Inline Styles",
    icon: <Paintbrush className="w-3.5 h-3.5" />,
    variant: "count",
  },
  {
    key: "external_stylesheets",
    label: "Stylesheets",
    icon: <FileCode2 className="w-3.5 h-3.5" />,
    variant: "count",
  },
  {
    key: "external_scripts",
    label: "Scripts",
    icon: <Code2 className="w-3.5 h-3.5" />,
    variant: "count",
  },
  {
    key: "forms",
    label: "Forms",
    icon: <FileText className="w-3.5 h-3.5" />,
    variant: "count",
  },
  {
    key: "videos",
    label: "Videos",
    icon: <Video className="w-3.5 h-3.5" />,
    variant: "count",
  },
  {
    key: "aria_roles",
    label: "ARIA Roles",
    icon: <Accessibility className="w-3.5 h-3.5" />,
    variant: "count",
  },
  {
    key: "social_links",
    label: "Social Links",
    icon: <Share2 className="w-3.5 h-3.5" />,
    variant: "count",
  },
  {
    key: "https",
    label: "HTTPS",
    icon: <Shield className="w-3.5 h-3.5" />,
    variant: "boolean",
  },
  {
    key: "favicon",
    label: "Favicon",
    icon: <Star className="w-3.5 h-3.5" />,
    variant: "boolean",
  },
  {
    key: "html_lang",
    label: "HTML Lang",
    icon: <Globe className="w-3.5 h-3.5" />,
    variant: "language",
  },
  {
    key: "unlabelled_inputs",
    label: "Unlabelled Inputs",
    icon: <FormInput className="w-3.5 h-3.5" />,
    variant: "count",
  },
];

/**
 * Grid of optional advanced diagnostic metrics.
 * Only renders items that are present in the data — gracefully
 * handles partial or completely empty payloads.
 */
export function AdvancedDiagnosticsGrid({
  advanced,
  className,
}: AdvancedDiagnosticsGridProps) {
  // Filter to only items that exist in the payload.
  const presentItems = DIAGNOSTIC_ITEMS.filter(
    (item) => advanced[item.key] !== undefined && advanced[item.key] !== null,
  );

  if (presentItems.length === 0) return null;

  return (
    <div
      className={clsx(
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3",
        className,
      )}
    >
      {presentItems.map((item) => {
        const raw = advanced[item.key];

        // Format the display value.
        let displayValue: boolean | number | string = raw as any;
        if (
          item.variant === "count" &&
          item.format &&
          typeof raw === "number"
        ) {
          displayValue = item.format(raw);
        }

        // Semantic colour hints for specific count metrics.
        const isHighlighted =
          (item.key === "unlabelled_inputs" &&
            typeof raw === "number" &&
            raw > 0) ||
          (item.key === "inline_styles" &&
            typeof raw === "number" &&
            raw > 100);

        return (
          <div
            key={item.key}
            className={clsx(
              "group relative rounded-2xl p-3.5",
              "bg-white/[0.02] border border-white/[0.05]",
              "hover:bg-white/[0.04] hover:border-white/[0.08]",
              "transition-all duration-200",
            )}
          >
            {/* Icon + label */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-white/25 group-hover:text-white/40 transition-colors">
                {item.icon}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-white/35 truncate">
                {item.label}
              </span>
            </div>

            {/* Value */}
            <div
              className={clsx(
                isHighlighted && "text-amber-400",
              )}
            >
              {item.variant === "count" && item.format ? (
                <span
                  className={clsx(
                    "text-sm font-bold tabular-nums",
                    isHighlighted ? "text-amber-400" : "text-white/80",
                  )}
                >
                  {displayValue as string}
                </span>
              ) : (
                <DiagnosticBadge
                  variant={item.variant}
                  value={displayValue}
                  label={item.label}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
