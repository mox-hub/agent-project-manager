import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusTone = "default" | "success" | "warning" | "danger" | "info";

interface StatusPillProps {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}

const toneClass: Record<StatusTone, string> = {
  default: "bg-content-bg-secondary text-content-text-secondary",
  success: "bg-accent-green-light text-accent-green",
  warning: "bg-accent-yellow-light text-accent-yellow",
  danger: "bg-accent-red-light text-accent-red",
  info: "bg-accent-blue-light text-accent-blue",
};

export function StatusPill({ children, tone = "default", className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
