import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatedValue } from "@/components/common/AnimatedValue";

export function MetricCard({
  label,
  value,
  foot,
  icon: Icon,
  trend,
  colorScheme,
  kind,
}: {
  label: string;
  value: string;
  foot: string;
  icon: LucideIcon;
  trend?: string;
  colorScheme?: "primary" | "warning" | "success" | "danger" | "info";
  kind?: "primary" | "warning" | "success" | "danger" | "info";
}) {
  const scheme = colorScheme || kind || "primary";
  const iconColorMap = {
    primary: "text-primary",
    warning: "text-blue-600 dark:text-blue-400",
    success: "text-emerald-600 dark:text-emerald-400",
    danger: "text-rose-600 dark:text-rose-400",
    info: "text-sky-600 dark:text-sky-400",
  };

  const [highlight, setHighlight] = useState(false);
  const prevValRef = useRef(value);

  useEffect(() => {
    if (prevValRef.current !== value) {
      prevValRef.current = value;
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div
      className={`panel-shadow rounded-xl border bg-card p-4 sm:p-5 transition-all duration-700 w-full min-w-0 ${
        highlight
          ? "border-blue-500/60 shadow-md ring-2 ring-blue-500/15 bg-blue-50/15 dark:bg-blue-950/20"
          : "border-border hover:border-blue-400/50 dark:hover:border-blue-600/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2.5 min-w-0">
        <span className="text-xs font-bold text-muted-foreground leading-snug line-clamp-2">{label}</span>
        <div
          className={`flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface shadow-2xs transition-transform duration-500 ${
            highlight ? "scale-105" : ""
          }`}
        >
          <Icon className={`size-4 sm:size-5 ${iconColorMap[scheme]}`} />
        </div>
      </div>
      <div className="mt-2.5 sm:mt-3 min-h-[36px] flex items-center">
        <AnimatedValue value={value} />
      </div>
      <div className="mt-3 sm:mt-4 flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 text-[11px] border-t border-border/60 pt-2 min-w-0">
        <span className="text-muted-foreground line-clamp-1">{foot}</span>
        {trend && (
          <span className="font-bold text-foreground shrink-0 self-start xs:self-auto px-1.5 py-0.5 rounded bg-muted/60 text-[10px]">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
