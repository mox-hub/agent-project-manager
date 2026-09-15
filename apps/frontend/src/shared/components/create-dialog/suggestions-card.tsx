/**
 * 创建面板 · AI 建议卡（业务组件）
 *
 * 与 components/ui/property-panel 的只读版 SuggestionsCard 分工：
 * 本卡承载静默 AI 场景 create-suggestions 的拉取与应用（点击 chip 回填表单）。
 * CAP-A-18 批4：移除原四条不可点的静态假建议（死可供性），未生成时渲染 EmptyState 引导。
 */
import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import type { CreateSuggestion } from '@/modules/assistant/hooks/use-silent-ai';

export function SuggestionsCard({
  collapsed,
  onToggle,
  onFetch,
  onApply,
}: {
  collapsed: boolean;
  onToggle: () => void;
  /** 调静默 AI 场景 create-suggestions，返回可回填建议；失败抛错由卡片展示 */
  onFetch: () => Promise<CreateSuggestion[]>;
  /** 点击建议 chip 回填表单 */
  onApply: (s: CreateSuggestion) => void;
}) {
  const [aiItems, setAiItems] = useState<CreateSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedLabels, setAppliedLabels] = useState<string[]>([]);

  const items = aiItems ?? [];

  const fetchAi = async () => {
    setLoading(true);
    setError(null);
    try {
      const parsed = await onFetch();
      setAiItems(parsed);
      setAppliedLabels([]);
    } catch (e) {
      setAiItems(null);
      setError(e instanceof Error ? e.message : 'AI 建议暂不可用');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      'rounded-xl border border-border bg-card overflow-hidden transition-all',
      collapsed && 'rounded-full',
    )}>
      <div className={cn(
        'flex items-center gap-1.5 px-3 py-2 bg-muted/30',
        collapsed && 'border-b-0',
      )}>
        <Sparkles className="size-3 text-accent-purple" />
        <span className="text-10 font-semibold uppercase tracking-wider text-muted-foreground">Suggestions</span>
        {!collapsed ? (
          <button
            type="button"
            onClick={fetchAi}
            disabled={loading}
            className="ml-auto flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-10 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            data-ai-action="create-dialog.suggestions.fetch"
          >
            <Sparkles className="size-2.5 text-accent-purple" />
            {loading ? '生成中…' : 'AI 建议'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'size-5 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            !collapsed && 'ml-1',
          )}
        >
          {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
        </button>
      </div>
      {!collapsed && (
        <div className="p-1.5 flex flex-col gap-0.5">
          {error ? (
            <p className="px-2 py-1 text-10 text-accent-red">{error}</p>
          ) : null}
          {items.length === 0 ? (
            <EmptyState
              variant="card"
              title="暂无建议"
              description="点上方「AI 建议」，按已填内容生成补全"
              className="min-h-0 border-0 p-1"
            />
          ) : (
            items.map((it, idx) => {
              const applied = appliedLabels.includes(`${it.field}:${it.value}`);
              return (
                <button
                  key={`${it.field}-${it.label}-${idx}`}
                  type="button"
                  disabled={applied}
                  onClick={() => {
                    onApply(it);
                    setAppliedLabels((prev) => [...prev, `${it.field}:${it.value}`]);
                    toast.success(`已应用：${it.label}`);
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground transition-colors',
                    applied ? 'opacity-50' : 'hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Sparkles className="size-3.5 text-accent-purple" />
                  <span className="flex-1 text-left">{it.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
