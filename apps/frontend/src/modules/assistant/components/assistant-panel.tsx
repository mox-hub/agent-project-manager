/**
 * 主 AI 助手面板 —— shell 第三栏（内联，不遮罩主区，边看任务边聊）。
 * 结构：Header（人格名+状态）> 滚动区（早报 → 待决卡 → 消息流）> 底部（快捷问法 + 输入框 + digest 注脚）。
 * 开关走 app-store 既有 aiPanelOpen（此前预留无消费方）；
 * 会话按路由作用域：项目详情路由跟随当前项目，其余页面走工作区全局。
 */
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Bot, Clock, PanelRightClose } from 'lucide-react';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SkeletonText } from '@/components/ui/skeleton';
import { useAppStore } from '@/infrastructure/store/app-store';
import { usePendingDecisions } from '@/modules/decision/hooks/use-decisions';
import { useAssistantStatus } from '../hooks/use-assistant-status';
import {
  useAssistantMessages,
  useAssistantConversationList,
  useCreateAssistantConversation,
  useSendAssistantMessage,
} from '../hooks/use-assistant-session';
import { useAssistantStream } from '../hooks/use-assistant-stream';
import {
  useAssistantRuns,
  useDispatchAssistantMessage,
} from '../hooks/use-assistant-dispatch';
import { AssistantOpeningReport } from './assistant-opening-report';
import { AssistantDecisionStrip } from './assistant-decision-strip';
import { AssistantMessageList } from './assistant-message-list';
import { AssistantMessageInput } from './assistant-message-input';
import { AssistantQuickPrompts } from './assistant-quick-prompts';
import { AssistantRunLine } from './assistant-run-line';
import { AssistantHistoryMenu } from './assistant-history-menu';
import { AssistantStatusDot, STATE_TEXT } from './assistant-status-dot';

/** 当前路由所属项目（/app/projects/:id/*，排除 dashboard） */
function useRouteProjectId(): string | undefined {
  const location = useLocation();
  const match = location.pathname.match(/^\/app\/projects\/(?!dashboard$)([^/]+)/);
  return match ? match[1] : undefined;
}

export function AssistantPanel() {
  const { t } = useTranslation();
  const aiPanelOpen = useAppStore((s) => s.aiPanelOpen);
  const setAiPanelOpen = useAppStore((s) => s.setAiPanelOpen);
  const projectId = useRouteProjectId();

  const { data, isLoading } = usePendingDecisions(projectId ? { projectId } : {});
  const status = useAssistantStatus(projectId);

  // 历史会话切换：null = 跟随「当前会话」（服务端 updatedAt 最新）；
  // 作用域（项目↔全局）变化时回落到跟随模式（渲染期比对模式）
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [prevScope, setPrevScope] = useState(projectId);
  if (prevScope !== projectId) {
    setPrevScope(projectId);
    setActiveConversationId(null);
  }

  const { data: session, isLoading: sessionLoading } = useAssistantMessages(
    projectId,
    activeConversationId,
  );
  const conversationId = activeConversationId ?? session?.conversationId ?? null;
  const sendMessage = useSendAssistantMessage(projectId, activeConversationId);
  const stream = useAssistantStream(conversationId);
  const { data: runEntries } = useAssistantRuns(projectId);
  const dispatch = useDispatchAssistantMessage(projectId);
  const { data: conversations, isLoading: conversationsLoading } =
    useAssistantConversationList(projectId);
  const createConversation = useCreateAssistantConversation(projectId);

  if (!aiPanelOpen) return null;

  const items = data?.items ?? [];
  // 阻断优先，与收件箱同序
  const stripItems = [
    ...items.filter((d) => d.urgency === 'blocking'),
    ...items.filter((d) => d.urgency === 'advisory'),
  ];
  const personaName = t('assistant.personaName');
  const handleSend = (content: string) => sendMessage.mutate(content);

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
          <p className="truncate text-sm font-semibold text-content-text">{personaName}</p>
          <p className="flex items-center gap-1.5 truncate text-11 text-content-text-muted">
            <AssistantStatusDot state={status.state} />
            <span className={STATE_TEXT[status.state]}>{t(`assistant.status.${status.state}`)}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{t('assistant.personaRole')}</span>
          </p>
        </div>
        <AssistantHistoryMenu
          conversations={conversations ?? []}
          isLoading={conversationsLoading}
          activeConversationId={activeConversationId}
          currentConversationId={session?.conversationId ?? null}
          onSelect={(id) => setActiveConversationId(id)}
          onCreate={() =>
            createConversation.mutate(undefined, {
              onSuccess: (created) => setActiveConversationId(created.conversationId),
            })
          }
        />
        <HeaderActionButton
          icon={PanelRightClose}
          label={t('assistant.panel.close')}
          onClick={() => setAiPanelOpen(false)}
          data-ai-action="assistant.panel.close.click"
        />
      </div>

      {/* 滚动区：早报 → 待决卡 → 执行行 → 消息流（新消息贴近输入框）。
          外层 min-h-0 + overflow-hidden 断开 flex 子项的内容撑高，滚动才生效；
          底部操作栏固定在滚动区外，不随内容滚动 */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="flex flex-col gap-4 p-3">
            <AssistantOpeningReport status={status} personaName={personaName} />
            <AssistantDecisionStrip items={stripItems} loading={isLoading} />
            {(runEntries ?? []).map((entry) => (
              <AssistantRunLine key={entry.runId} entry={entry} />
            ))}
            {sessionLoading ? (
              <div className="space-y-2 px-1">
                <SkeletonText lines={2} />
              </div>
            ) : (
              <AssistantMessageList
                messages={session?.messages ?? []}
                streamText={stream?.text ?? null}
                onRetry={handleSend}
              />
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 底部：快捷问法 + 输入框/转执行 + 沉默 ≠ 同意注脚 */}
      <div className="shrink-0 space-y-2.5 border-t border-border p-3">
        <AssistantQuickPrompts onSend={handleSend} disabled={sendMessage.isPending} />
        <AssistantMessageInput
          onSend={handleSend}
          disabled={sendMessage.isPending}
          personaName={personaName}
          // 执行桥：项目上下文下可把消息转派 CLI 守护进程异步执行
          dispatchAction={
            projectId
              ? {
                  label: t('assistant.run.dispatch'),
                  disabled: dispatch.isPending || sendMessage.isPending,
                  onDispatch: (content) => dispatch.mutate(content),
                }
              : undefined
          }
        />
        <div className="flex items-center gap-2 text-11 text-content-text-muted">
          <Clock className="size-3 shrink-0" />
          <span className="truncate">{t('decision.digestNote')}</span>
        </div>
      </div>
    </aside>
  );
}
