import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 选项高亮色调：激活滑块与文字按语义色着色（页面按需传入） */
export type SegmentedTone = "default" | "blue" | "green" | "yellow" | "red" | "purple";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  tone?: SegmentedTone;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  /** pill：胶囊滑块（默认）；rect：圆角矩形滑块（toolbar 居中切换用） */
  variant?: "pill" | "rect";
}

const TONE_CLASS: Record<SegmentedTone, { slider: string; label: string }> = {
  default: { slider: "border-border bg-background", label: "text-foreground" },
  blue: {
    slider: "border-accent-blue/40 bg-accent-blue-light",
    label: "text-accent-blue",
  },
  green: {
    slider: "border-accent-green/40 bg-accent-green-light",
    label: "text-accent-green",
  },
  yellow: {
    slider: "border-accent-yellow/50 bg-accent-yellow-light",
    label: "text-accent-yellow",
  },
  red: {
    slider: "border-accent-red/40 bg-accent-red-light",
    label: "text-accent-red",
  },
  purple: {
    slider: "border-accent-purple/40 bg-accent-purple-light",
    label: "text-accent-purple",
  },
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  variant = "pill",
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const isRect = variant === "rect";
  const activeTone = TONE_CLASS[options[activeIndex]?.tone ?? "default"];

  return (
    <div
      className={cn(
        "relative inline-grid overflow-hidden p-0.5",
        isRect
          ? "rounded-md border border-border bg-muted/50"
          : "rounded-full border border-border bg-background",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${Math.max(options.length, 1)}, minmax(0, 1fr))` }}
    >
      <span
        className={cn(
          "pointer-events-none absolute bg-muted/50 shadow-xs transition-transform duration-250 ease-out",
          isRect ? "inset-0.5 rounded-sm border" : "inset-y-0.5 rounded-full",
          isRect && activeTone.slider,
        )}
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
            isRect && "rounded-sm",
            value === option.value
              ? isRect
                ? activeTone.label
                : "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
