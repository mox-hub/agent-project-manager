import { Link } from "react-router-dom";
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
  if (items.length === 0) {
    return null;
  }

  return (
    <aside
      className={cn("rounded-xl border border-content-border bg-content-bg-secondary/50 p-3", className)}
      data-ai-component={`${aiPrefix}.attention-rail`}
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
            className="block rounded-lg border border-content-border bg-content-bg px-3 py-2 no-underline transition-colors hover:bg-content-bg-secondary"
            data-ai-component={`${aiPrefix}.attention-item.${item.id}`}
            data-ai-action={`${aiPrefix}.attention-item.${item.id}.jump`}
            data-ai-role="jump"
          >
            <p className="m-0 text-sm font-medium text-content-text">{item.title}</p>
            {item.description ? (
              <p className="mt-1 text-xs text-content-text-secondary">{item.description}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </aside>
  );
}

