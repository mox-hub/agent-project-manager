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
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      className={cn(
        "relative inline-grid overflow-hidden rounded-full border border-content-border bg-content-bg p-0.5",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${Math.max(options.length, 1)}, minmax(0, 1fr))` }}
    >
      <span
        className="pointer-events-none absolute inset-y-0.5 rounded-full bg-content-bg-secondary shadow-sm transition-transform duration-250 ease-out"
        style={{
          width: `calc((100% - 4px) / ${Math.max(options.length, 1)})`,
          transform: `translateX(calc(${activeIndex} * 100%))`,
        }}
        aria-hidden="true"
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "relative z-10 flex items-center justify-center gap-1 px-3 py-1.5 text-sm transition-colors",
            value === option.value
              ? "text-content-text"
              : "text-content-text-secondary hover:text-content-text",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
