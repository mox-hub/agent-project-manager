/**
 * 主 AI 助手浮窗 —— 右下角圆形按钮（AssistantFab）唤起。
 * 结构：Header（人格名+状态+模型选择）> 滚动区（早报 → 待决卡 → 消息流）
 * > 底部（快捷问法 + 输入框 + digest 注脚）。
 * 对话走 AI SDK v7 useChat：AssistantChatSession 以 key 重挂载切换会话/作用域
 * （消息水合自服务端 UIMessage JSON，流式经 ai.stream 的 UIMessageChunk）；
 * 尺寸由外层 AssistantFab 控制（默认 380×560，放大≈1/4 屏）；
 * 通知页可经 app-store 的 assistantOpenRequest 唤起并定位到指定会话。
 */
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bot, Clock, DoorOpen, Maximize2, Minimize2 } from 'lucide-react';
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
  assistantKeys,
} from '../hooks/use-assistant-session';
import {
  AssistantChatSession,
  buildAssistantSendBody,
  toAssistantUiMessages,
  useAssistantChatHelpers,
} from '../hooks/use-assistant-chat';
import {
  useAssistantRuns,
  useDispatchAssistantMessage,
} from '../hooks/use-assistant-dispatch';
import { useSilentQuickPrompts } from '../hooks/use-silent-ai';
import type { AssistantRunEntry } from '../hooks/use-assistant-dispatch';
import { AssistantOpeningReport } from './assistant-opening-report';
import { AssistantDecisionStrip } from './assistant-decision-strip';
import { AssistantMessageList } from './assistant-message-list';
import { AssistantMessageInput } from './assistant-message-input';
import { AssistantQuickPrompts } from './assistant-quick-prompts';
import { AssistantRunLine } from './assistant-run-line';
import { AssistantHistoryMenu } from './assistant-history-menu';
import { AssistantModelPicker } from './assistant-model-picker';
import { AssistantContextChip } from './assistant-context-chip';
import { AssistantStatusDot, STATE_TEXT } from './assistant-status-dot';
import type { AssistantDraftSeed } from './assistant-message-input';

/** 当前路由所属项目（/app/projects/:id/*，排除 dashboard） */
function useRouteProjectId(): string | undefined {
  const location = useLocation();
  const match = location.pathname.match(/^\/app\/projects\/(?!dashboard$)([^/]+)/);
  return match ? match[1] : undefined;
}

/** 会话域内底部操作区：快捷问法 + 输入框（经 context 取 useChat helpers） */
function AssistantChatFooter({
  runEntries,
  conversationId,
  projectId,
  model,
  draftSeed,
}: {
  runEntries: AssistantRunEntry[];
  conversationId?: string;
  projectId?: string;
  model: string | null;
  draftSeed?: AssistantDraftSeed | null;
}) {
  const { t } = useTranslation();
  const { status, sendMessage } = useAssistantChatHelpers();
  const dispatch = useDispatchAssistantMessage(projectId);
  // 「正在查看」上下文随消息附带（用户可在 chip 上移除）
  const viewing = useAppStore((s) => s.viewing);
  // 静默 AI 快捷问法（失败/空回落静态三条）
  const silentPrompts = useSilentQuickPrompts(projectId, viewing);
  const busy = status === 'submitted' || status === 'streaming';
  const handleSend = (content: string) => {
    sendMessage(
      { text: content, metadata: { modelId: model ?? undefined } },
      { body: buildAssistantSendBody({ projectId, conversationId, model, viewing }) },
    );
  };

  return (
    <div className="shrink-0 space-y-2.5 border-t border-border p-3">
      <AssistantContextChip />
      <AssistantQuickPrompts
        onSend={handleSend}
        disabled={busy}
        aiPrompts={silentPrompts.data}
      />
      <AssistantMessageInput
        onSend={handleSend}
        disabled={busy}
        personaName={t('assistant.personaName')}
        seedDraft={draftSeed}
        // 执行桥：项目上下文下可把消息转派 CLI 守护进程异步执行
        dispatchAction={
          projectId
            ? {
                label: t('assistant.run.dispatch'),
                disabled: dispatch.isPending || busy,
                onDispatch: (content) => dispatch.mutate(content),
              }
            : undefined
        }
      />
      {(runEntries ?? []).map((entry) => (
        <AssistantRunLine key={entry.runId} entry={entry} />
      ))}
      <div className="flex items-center gap-2 text-11 text-content-text-muted">
        <Clock className="size-3 shrink-0" />
        <span className="truncate">{t('decision.digestNote')}</span>
      </div>
    </div>
  );
}

export function AssistantPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const assistantExpanded = useAppStore((s) => s.assistantExpanded);
  const toggleAssistantExpanded = useAppStore((s) => s.toggleAssistantExpanded);
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

  // 消费跨组件唤起请求（通知页「继续对话」/创建面板「AI 创建」）：
  // 渲染期比对 nonce，定位到指定会话并预填草稿
  const openRequest = useAppStore((s) => s.assistantOpenRequest);
  const [consumedRequestNonce, setConsumedRequestNonce] = useState(0);
  const [draftSeed, setDraftSeed] = useState<AssistantDraftSeed | null>(null);
  if (openRequest && openRequest.nonce !== consumedRequestNonce) {
    setConsumedRequestNonce(openRequest.nonce);
    setActiveConversationId(openRequest.conversationId);
    if (openRequest.draft) {
      setDraftSeed({ text: openRequest.draft, nonce: openRequest.nonce });
    }
  }

  const { data: session, isLoading: sessionLoading } = useAssistantMessages(
    projectId,
    activeConversationId,
  );
  // 渲染期比对：会话切换时重置模型选择为该会话的记忆值
  const [model, setModel] = useState<string | null>(null);
  const [modelForConversation, setModelForConversation] = useState<string | null>(null);
  const sessionConversationId = session?.conversationId ?? null;
  if (sessionConversationId !== modelForConversation) {
    setModelForConversation(sessionConversationId);
    setModel(session?.model ?? null);
  }

  const conversationId = activeConversationId ?? sessionConversationId;
  const { data: runEntries } = useAssistantRuns(projectId);
  const { data: conversations, isLoading: conversationsLoading } =
    useAssistantConversationList(projectId);
  const createConversation = useCreateAssistantConversation(projectId);

  // 会话域就绪门槛：消息水合需在 Chat 实例构建前拿到服务端会话
  const sessionReady =
    !sessionLoading &&
    !!session &&
    (activeConversationId === null || session.conversationId === activeConversationId);
  const chatKey = `${projectId ?? 'workspace'}::${conversationId ?? 'current'}`;

  const items = data?.items ?? [];
  // 阻断优先，与收件箱同序
  const stripItems = [
    ...items.filter((d) => d.urgency === 'blocking'),
    ...items.filter((d) => d.urgency === 'advisory'),
  ];
  const personaName = t('assistant.personaName');

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
      data-ai-component="assistant.panel"
    >
      {/* 头部：人格名 + 状态 + 模型选择 + 历史 + 放大/还原 */}
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
        <AssistantModelPicker
          projectId={projectId}
          value={model}
          onChange={setModel}
        />
        <AssistantHistoryMenu
          conversations={conversations ?? []}
          isLoading={conversationsLoading}
          activeConversationId={activeConversationId}
          currentConversationId={sessionConversationId}
          onSelect={(id) => setActiveConversationId(id)}
          onCreate={() =>
            createConversation.mutate(undefined, {
              onSuccess: (created) => setActiveConversationId(created.conversationId),
            })
          }
        />
        <HeaderActionButton
          icon={DoorOpen}
          label={t('nav.office')}
          onClick={() => navigate('/app/office')}
          data-ai-action="assistant.panel.office.click"
        />
        <HeaderActionButton
          icon={assistantExpanded ? Minimize2 : Maximize2}
          label={t(
            assistantExpanded
              ? 'assistant.fab.collapse'
              : 'assistant.fab.expand',
          )}
          onClick={toggleAssistantExpanded}
          data-ai-action="assistant.panel.expand.click"
        />
      </div>

      {/* 滚动区：早报 → 待决卡 → 执行行 → 消息流（新消息贴近输入框）。
          AssistantChatSession 以 key 重挂载切换会话，提供 useChat helpers 上下文 */}
      {sessionReady ? (
        <AssistantChatSession
          key={chatKey}
          conversationId={activeConversationId ?? undefined}
          initialMessages={toAssistantUiMessages(session.messages)}
          onFinished={() => {
            void queryClient.invalidateQueries({
              queryKey: assistantKeys.conversations(projectId),
            });
          }}
        >
          <div className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="flex flex-col gap-4 p-3">
                <AssistantOpeningReport status={status} personaName={personaName} />
                <AssistantDecisionStrip items={stripItems} loading={isLoading} />
                <AssistantMessageList />
              </div>
            </ScrollArea>
          </div>
          <AssistantChatFooter
            runEntries={runEntries ?? []}
            conversationId={activeConversationId ?? undefined}
            projectId={projectId}
            model={model}
            draftSeed={draftSeed}
          />
        </AssistantChatSession>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="flex flex-col gap-4 p-3">
                <AssistantOpeningReport status={status} personaName={personaName} />
                <AssistantDecisionStrip items={stripItems} loading={isLoading} />
                <div className="space-y-2 px-1">
                  <SkeletonText lines={3} />
                </div>
              </div>
            </ScrollArea>
          </div>
          <div className="shrink-0 space-y-2.5 border-t border-border p-3">
            <div className="space-y-2 px-1">
              <SkeletonText lines={2} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
