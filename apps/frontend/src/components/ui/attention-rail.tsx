import { useState } from "react";
import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export type AttentionItem = {
  id: string;
  title: string;
  description?: string;
  to: string;
};

interface AttentionRailProps {
  title?: string;
  items: AttentionItem[];
  className?: string;
  aiPrefix: string;
}

export function AttentionRail({
  title = "提醒与快速跳转",
  items,
  className,
  aiPrefix,
}: AttentionRailProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return null;
  }

  return (
    <aside
      className={cn("fixed bottom-5 right-5 z-40", className)}
      data-ai-component={`${aiPrefix}.attention-rail`}
      data-ai-role="panel"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-content-border bg-content-bg text-content-text shadow-md transition-colors hover:bg-content-bg-secondary"
        onClick={() => setExpanded((value) => !value)}
        data-ai-component={`${aiPrefix}.attention-trigger`}
        data-ai-action={`${aiPrefix}.attention-trigger.toggle`}
        data-ai-role="jump"
        aria-label={expanded ? "收起快速跳转" : "展开快速跳转"}
        aria-expanded={expanded}
      >
        <Compass size={16} />
      </button>

      {expanded ? (
        <div
          className="absolute bottom-14 right-0 w-[280px] rounded-xl border border-content-border bg-content-bg p-3 shadow-lg motion-enter"
          data-ai-component={`${aiPrefix}.attention-card`}
          data-ai-role="panel"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-text-muted">
            {title}
          </p>
          <div className="space-y-2">
            {items.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className="block rounded-lg border border-content-border bg-content-bg-secondary px-3 py-2 no-underline transition-colors hover:bg-content-bg"
                data-ai-component={`${aiPrefix}.attention-item.${item.id}`}
                data-ai-action={`${aiPrefix}.attention-item.${item.id}.jump`}
                data-ai-role="jump"
                onClick={() => setExpanded(false)}
              >
                <p className="m-0 text-sm font-medium text-content-text">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-xs text-content-text-secondary">{item.description}</p>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
