/**
 * 主 AI 助手面板 —— shell 第三栏（内联，不遮罩主区，边看任务边聊）。
 * 结构：Header（人格名+状态）> 滚动区（早报 → 消息流 → 待决卡）> 底部 digest 注脚。
 * 开关走 app-store 既有 aiPanelOpen（此前预留无消费方）；
 * 会话按路由作用域：项目详情路由跟随当前项目，其余页面走工作区全局。
 */
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Bot, Clock, PanelRightClose } from 'lucide-react';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/infrastructure/store/app-store';
import { usePendingDecisions } from '@/modules/decision/hooks/use-decisions';
import { useAssistantStatus } from '../hooks/use-assistant-status';
import { AssistantOpeningReport } from './assistant-opening-report';
import { AssistantDecisionStrip } from './assistant-decision-strip';
import { AssistantStatusDot, STATE_TEXT } from './assistant-status-dot';

/** 当前路由所属项目（/app/projects/:id/*，排除 dashboard） */
function useRouteProjectId(): string | null {
  const location = useLocation();
  const match = location.pathname.match(/^\/app\/projects\/(?!dashboard$)([^/]+)/);
  return match ? match[1] : null;
}

export function AssistantPanel() {
  const { t } = useTranslation();
  const aiPanelOpen = useAppStore((s) => s.aiPanelOpen);
  const setAiPanelOpen = useAppStore((s) => s.setAiPanelOpen);
  const projectId = useRouteProjectId();

  const { data, isLoading } = usePendingDecisions(projectId ? { projectId } : {});
  const status = useAssistantStatus(projectId ?? undefined);

  if (!aiPanelOpen) return null;

  const items = data?.items ?? [];
  // 阻断优先，与收件箱同序
  const stripItems = [
    ...items.filter((d) => d.urgency === 'blocking'),
    ...items.filter((d) => d.urgency === 'advisory'),
  ];

  return (
    <aside
      className="hidden h-full w-100 shrink-0 flex-col border-l border-border/50 bg-background lg:flex"
      data-ai-component="assistant.panel"
    >
      {/* 头部：人格名 + 状态 + 收起 */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-purple-light text-accent-purple">
          <Bot className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-content-text">
            {t('assistant.personaName')}
          </p>
          <p className="flex items-center gap-1.5 truncate text-11 text-content-text-muted">
            <AssistantStatusDot state={status.state} />
            <span className={STATE_TEXT[status.state]}>{t(`assistant.status.${status.state}`)}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{t('assistant.personaRole')}</span>
          </p>
        </div>
        <HeaderActionButton
          icon={PanelRightClose}
          label={t('assistant.panel.close')}
          onClick={() => setAiPanelOpen(false)}
          data-ai-action="assistant.panel.close.click"
        />
      </div>

      {/* 滚动区：早报 → 消息流（批B）→ 待决卡 */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-3">
          <AssistantOpeningReport status={status} personaName={t('assistant.personaName')} />
          {/* 消息流：批 B 接入 /ai/assistant 会话（占位保持文档流稳定） */}
          <div data-ai-component="assistant.message-stream" className={cn('contents')} />
          <AssistantDecisionStrip items={stripItems} loading={isLoading} />
        </div>
      </ScrollArea>

      {/* 底部注脚：沉默 ≠ 同意（与收件箱同一语义） */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2.5 text-11 text-content-text-muted">
        <Clock className="size-3 shrink-0" />
        <span className="truncate">{t('decision.digestNote')}</span>
      </div>
    </aside>
  );
}
