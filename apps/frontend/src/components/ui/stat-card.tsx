import type { ReactNode } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  accentClassName?: string;
  className?: string;
}

export function StatCard({ label, value, hint, accentClassName, className }: StatCardProps) {
  return (
    <SectionCard className={cn("p-0", className)} contentClassName="p-4">
      <p className="mb-1 text-xs font-medium text-content-text-secondary">{label}</p>
      <h3 className={cn("text-2xl font-bold text-content-text", accentClassName)}>{value}</h3>
      {hint ? <p className="mt-1 text-xs text-content-text-tertiary">{hint}</p> : null}
    </SectionCard>
  );
}
