/**
 * 主 AI 助手浮窗 —— 右下角圆形按钮（AssistantFab）唤起。
 * 结构：Header（人格名+状态）> 滚动区（早报 → 消息流）> 底部（快捷问法 + 执行行 + digest 注脚）。
 * 2026-10-02 交互裁决：
 * - 默认放大模式（assistantExpanded 初值 true，app-store）；
 * - 待决卡片取消「展开后左侧栏卡片堆」形态：缩小挂条（AssistantDecisionTab）为默认伴随形态，
 *   点击开全屏遮罩集中批阅（shared/decision-card/decision-review-modal）；
 * - 头部裁撤模型选择与办公室跳转；面板内不放输入框——底部 Dock 是唯一输入口，
 *   唤起请求携带的草稿经 AssistantOutboundDispatcher 自动发送；
 * - 对话默认新建会话：面板每次打开进入「新对话」模式（不水合旧消息），
 *   首条消息发送时才落会话；历史会话经历史菜单显式切换。
 * 对话走 AI SDK v7 useChat：AssistantChatSession 以 key 重挂载切换会话/作用域
 * （消息水合自服务端 UIMessage JSON，流式经 ai.stream 的 UIMessageChunk）；
 * 通知页可经 app-store 的 assistantOpenRequest 唤起并定位到指定会话。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bot, Clock, Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { HeaderActionButton } from '@/components/semantic/header-action-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SkeletonText } from '@/components/ui/skeleton';
import { useAppStore } from '@/infrastructure/store/app-store';
import { usePendingDecisions } from '@/modules/decision/hooks/use-decisions';
import { useDecisionActions } from '@/modules/decision/hooks/use-decision-actions';
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
import { useAssistantRuns, type AssistantRunEntry } from '../hooks/use-assistant-dispatch';
import { useSilentQuickPrompts } from '../hooks/use-silent-ai';
import { AssistantOpeningReport } from './assistant-opening-report';
import { AssistantDecisionTab } from './assistant-decision-tab';
import { AssistantMessageList } from './assistant-message-list';
import { AssistantQuickPrompts } from './assistant-quick-prompts';
import { AssistantRunLine } from './assistant-run-line';
import { AssistantHistoryMenu } from './assistant-history-menu';
import { AssistantContextChip } from './assistant-context-chip';
import { AssistantStatusDot, STATE_TEXT } from './assistant-status-dot';
import { DecisionReviewModal } from '@/shared/decision-card/decision-review-modal';

/** 当前路由所属项目（/app/projects/:id/*，排除 dashboard） */
function useRouteProjectId(): string | undefined {
  const location = useLocation();
  const match = location.pathname.match(/^\/app\/projects\/(?!dashboard$)([^/]+)/);
  return match ? match[1] : undefined;
}

/** 新对话模式落会话；返回 undefined = 跟随当前会话（显式切换时为该会话 id） */
type EnsureConversation = () => Promise<string | undefined>;

/** 出站消息派发器：消费跨组件唤起请求携带的草稿（Dock / 办公室同事卡 / AI 创建），
 *  确保会话就绪后直接发送——面板内无输入框，草稿即消息。 */
function AssistantOutboundDispatcher({
  outbound,
  projectId,
  activeConversationId,
  ensureConversation,
}: {
  outbound: { text: string; nonce: number } | null;
  projectId?: string;
  activeConversationId?: string;
  ensureConversation: EnsureConversation;
}) {
  const { t } = useTranslation();
  const { sendMessage } = useAssistantChatHelpers();
  const viewing = useAppStore((s) => s.viewing);
  const lastNonceRef = useRef(0);

  useEffect(() => {
    if (!outbound || outbound.nonce === lastNonceRef.current) return;
    lastNonceRef.current = outbound.nonce;
    let cancelled = false;
    void (async () => {
      try {
        const ensured = await ensureConversation();
        if (cancelled) return;
        const conversationId = ensured ?? activeConversationId;
        sendMessage(
          { text: outbound.text, metadata: {} },
          { body: buildAssistantSendBody({ projectId, conversationId, viewing }) },
        );
      } catch {
        // 会话创建失败：toast 告知，不打断面板（会话流内不再有输入口可重试）
        if (!cancelled) toast.error(t('assistant.chat.outboundFailed'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [outbound, ensureConversation, activeConversationId, projectId, viewing, sendMessage, t]);

  return null;
}

/** 会话域内底部操作区：快捷问法 + 执行行 + digest 注脚（输入口在底部 Dock） */
function AssistantChatFooter({
  runEntries,
  projectId,
  activeConversationId,
  ensureConversation,
}: {
  runEntries: AssistantRunEntry[];
  projectId?: string;
  activeConversationId?: string;
  ensureConversation: EnsureConversation;
}) {
  const { t } = useTranslation();
  const { status, sendMessage } = useAssistantChatHelpers();
  // 「正在查看」上下文随消息附带（用户可在 chip 上移除）
  const viewing = useAppStore((s) => s.viewing);
  // 静默 AI 快捷问法（失败/空回落静态三条）
  const silentPrompts = useSilentQuickPrompts(projectId, viewing);
  const busy = status === 'submitted' || status === 'streaming';
  const handleSend = async (content: string) => {
    // 新对话模式先落会话；跟随/显式会话按现有作用域发送
    const ensured = await ensureConversation();
    const conversationId = ensured ?? activeConversationId;
    sendMessage(
      { text: content, metadata: {} },
      { body: buildAssistantSendBody({ projectId, conversationId, viewing }) },
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
      {(runEntries ?? []).map((entry) => (
        <AssistantRunLine key={entry.runId} entry={entry} projectId={projectId} />
      ))}
      <div className="flex items-center gap-2 text-2xs text-content-text-muted">
        <Clock className="size-3 shrink-0" />
        <span className="truncate">{t('decision.digestNote')}</span>
      </div>
    </div>
  );
}

export function AssistantPanel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const assistantExpanded = useAppStore((s) => s.assistantExpanded);
  const toggleAssistantExpanded = useAppStore((s) => s.toggleAssistantExpanded);
  const setAiPanelOpen = useAppStore((s) => s.setAiPanelOpen);
  const aiPanelOpen = useAppStore((s) => s.aiPanelOpen);
  const projectId = useRouteProjectId();

  const { data } = usePendingDecisions(projectId ? { projectId } : {});
  const status = useAssistantStatus(projectId);
  const { handleAction, busyId } = useDecisionActions();

  // 历史会话切换：null = 跟随「当前会话」（服务端 updatedAt 最新）；
  // 作用域（项目↔全局）变化时回落到跟随模式（渲染期比对模式）
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [prevScope, setPrevScope] = useState(projectId);
  if (prevScope !== projectId) {
    setPrevScope(projectId);
    setActiveConversationId(null);
  }

  // 对话默认新建会话（2026-10-02 裁决）：面板从关闭到打开进入「新对话」模式——
  // 不水合旧消息，首条消息发送时才真正落会话（避免制造空会话）；
  // openEpoch 递增换取全新 Chat 实例，关闭期间的流式状态不带入下一次对话。
  const [openEpoch, setOpenEpoch] = useState(0);
  const [pendingNew, setPendingNew] = useState(true);
  const [prevPanelOpen, setPrevPanelOpen] = useState(aiPanelOpen);
  if (aiPanelOpen !== prevPanelOpen) {
    setPrevPanelOpen(aiPanelOpen);
    if (aiPanelOpen) {
      setOpenEpoch((e) => e + 1);
      setPendingNew(true);
    }
  }

  // 消费跨组件唤起请求（通知页「继续对话」/Dock 与创建面板草稿）：
  // 显式会话 → 定位续聊；否则保持新对话模式。草稿转为出站消息直接发送。
  const openRequest = useAppStore((s) => s.assistantOpenRequest);
  const [consumedRequestNonce, setConsumedRequestNonce] = useState(0);
  const [outbound, setOutbound] = useState<{ text: string; nonce: number } | null>(null);
  if (openRequest && openRequest.nonce !== consumedRequestNonce) {
    setConsumedRequestNonce(openRequest.nonce);
    setActiveConversationId(openRequest.conversationId);
    if (openRequest.conversationId) {
      setPendingNew(false);
    }
    if (openRequest.draft) {
      setOutbound({ text: openRequest.draft, nonce: openRequest.nonce });
    }
  }

  const { data: session, isLoading: sessionLoading } = useAssistantMessages(
    projectId,
    activeConversationId,
  );
  const { data: runEntries } = useAssistantRuns(projectId);
  const { data: conversations, isLoading: conversationsLoading } =
    useAssistantConversationList(projectId);
  const createConversation = useCreateAssistantConversation(projectId);

  // 新对话模式：首条消息发送前先落会话；之后跟随当前会话
  const ensureConversation = useCallback(async (): Promise<string | undefined> => {
    if (!pendingNew) return undefined;
    const created = await createConversation.mutateAsync();
    setPendingNew(false);
    return created.conversationId;
  }, [pendingNew, createConversation]);

  // 会话域就绪门槛：新对话模式跳过旧会话水合；显式会话需等消息水合完成
  const sessionReady =
    pendingNew ||
    (!sessionLoading &&
      !!session &&
      (activeConversationId === null || session.conversationId === activeConversationId));
  // key 含 openEpoch：每次打开都是全新 Chat 实例；新对话落会话后 key 稳定，流式不中断
  const chatKey = `${projectId ?? 'workspace'}::${openEpoch}::${activeConversationId ?? 'live'}`;
  const sessionConversationId = session?.conversationId ?? null;

  const items = data?.items ?? [];
  // 阻断优先，与收件箱同序
  const stripItems = [
    ...items.filter((d) => d.urgency === 'blocking'),
    ...items.filter((d) => d.urgency === 'advisory'),
  ];
  const hasDecisions = stripItems.length > 0;
  const hasBlocking = stripItems.some((d) => d.urgency === 'blocking');
  const personaName = t('assistant.personaName');
  const [reviewOpen, setReviewOpen] = useState(false);

  return (
    <div
      className="flex h-full w-full items-stretch justify-center gap-3 select-none"
      data-ai-component="assistant.panel-wrapper"
    >
      {/* 待决卡片缩小挂条（默认伴随形态）：点击开全屏集中批阅遮罩 */}
      {hasDecisions && (
        <AssistantDecisionTab
          count={stripItems.length}
          hasBlocking={hasBlocking}
          onOpen={() => setReviewOpen(true)}
        />
      )}

      {/* 主对话面板 */}
      <div
        className={cn(
          'relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-background/95 shadow-xs backdrop-blur-xl',
          assistantExpanded
            ? 'flex-1 min-w-0'
            : 'w-120 max-w-[calc(100vw-2rem)]',
        )}
        data-ai-component="assistant.panel"
      >

        {/* 头部：人格名 + 状态 + 历史 + 放大/还原 + 关闭（模型选择与办公室跳转已裁撤） */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-purple-light text-accent-purple">
            <Bot className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-content-text">{personaName}</p>
            <p className="flex items-center gap-1.5 truncate text-2xs text-content-text-muted">
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
            currentConversationId={sessionConversationId}
            onSelect={(id) => {
              setActiveConversationId(id);
              setPendingNew(false);
            }}
            onCreate={() => {
              // 新建对话 = 重置为新对话模式（首条消息发送时才落会话，不制造空会话）
              setActiveConversationId(null);
              setPendingNew(true);
              setOpenEpoch((e) => e + 1);
            }}
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
          <HeaderActionButton
            icon={X}
            label={t('common.close', '关闭')}
            onClick={() => setAiPanelOpen(false)}
            data-ai-action="assistant.panel.close.click"
          />
        </div>

        {/* 滚动区：早报 → 消息流。
            AssistantChatSession 以 key 重挂载切换会话，提供 useChat helpers 上下文 */}
        {sessionReady ? (
          <AssistantChatSession
            key={chatKey}
            chatId={chatKey}
            conversationId={activeConversationId ?? undefined}
            initialMessages={
              pendingNew ? [] : toAssistantUiMessages(session?.messages ?? [])
            }
            onFinished={() => {
              void queryClient.invalidateQueries({
                queryKey: assistantKeys.conversations(projectId),
              });
            }}
          >
            <AssistantOutboundDispatcher
              outbound={outbound}
              projectId={projectId}
              activeConversationId={activeConversationId ?? undefined}
              ensureConversation={ensureConversation}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full w-full">
                <div className="flex flex-col gap-4 p-3">
                  <AssistantOpeningReport status={status} personaName={personaName} />
                  <AssistantMessageList />
                </div>
              </ScrollArea>
            </div>
            <AssistantChatFooter
              runEntries={runEntries ?? []}
              projectId={projectId}
              activeConversationId={activeConversationId ?? undefined}
              ensureConversation={ensureConversation}
            />
          </AssistantChatSession>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full w-full">
                <div className="flex flex-col gap-4 p-3">
                  <AssistantOpeningReport status={status} personaName={personaName} />
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

      {/* 全屏集中批阅遮罩（Portal 到 body；开启期间 Esc 与点击均不连带关闭对话面板） */}
      <DecisionReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        decisions={stripItems}
        busyId={busyId}
        onAction={handleAction}
      />
    </div>
  );
}
