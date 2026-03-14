import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cn("inline-flex overflow-hidden rounded-md border border-content-border", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 text-sm transition-colors",
            value === option.value
              ? "bg-accent-blue/10 text-accent-blue"
              : "text-content-text-secondary hover:bg-content-bg-secondary",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
