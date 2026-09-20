/**
 * 上下文注入 chip —— 展示当前「正在查看」的实体（详情页自动上报），
 * 用户可一键移除（提前告知语义：移除后随消息附带的上下文即取消）。
 */
import { useTranslation } from 'react-i18next';
import { Eye, X } from 'lucide-react';
import { useAppStore } from '@/infrastructure/store/app-store';
import type { ViewingEntityType } from '@/shared/viewing-context';

const TYPE_KEYS: Record<ViewingEntityType, string> = {
  task: 'assistant.context.task',
  bug: 'assistant.context.bug',
  document: 'assistant.context.document',
  repository: 'assistant.context.repository',
  member: 'assistant.context.member',
  project: 'assistant.context.project',
};

export function AssistantContextChip() {
  const { t } = useTranslation();
  const viewing = useAppStore((s) => s.viewing);
  const setViewing = useAppStore((s) => s.setViewing);

  if (!viewing) return null;
  const label = [t(TYPE_KEYS[viewing.type]), viewing.title]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="flex items-center gap-1.5 rounded-md border border-border bg-content-bg-secondary px-2 py-1 text-11 text-content-text-muted"
      data-ai-component="assistant.context-chip"
    >
      <Eye className="size-3 shrink-0 text-accent-purple" />
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={() => setViewing(null)}
        className="shrink-0 rounded-sm p-0.5 hover:bg-accent"
        aria-label={t('assistant.context.remove')}
        data-ai-action="assistant.context.remove.click"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
