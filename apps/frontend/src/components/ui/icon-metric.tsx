import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconMetricProps {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  className?: string;
}

export function IconMetric({ icon, label, value, className }: IconMetricProps) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border border-content-border bg-content-bg px-4 py-3", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-content-bg-secondary text-accent-blue">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold uppercase text-content-text-secondary">{label}</span>
        <span className="text-sm font-semibold text-content-text">{value}</span>
      </div>
    </div>
  );
}
