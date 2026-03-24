import { useSearchParams } from 'react-router-dom';
import { useAIConversations } from '../hooks/use-ai-conversations';
import { AIChatPanel } from '../components/ai-chat-panel';
import { useAppStore } from '@/infrastructure/store/app-store';
import type { AIConversation } from '../api/ai-hub-api';
import { cn } from '@/lib/utils';
import { PageShell } from '@/components/ui/page-shell';
import { AttentionRail } from '@/components/ui/attention-rail';
import { PageHeader } from '@/components/ui/page-header';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';

export function AISpacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get('conversationId') || undefined;
  const projectId = searchParams.get('projectId') || undefined;
  const taskId = searchParams.get('taskId') || undefined;
  const { currentProjectId } = useAppStore();

  const activeProjectId: string | undefined = projectId || currentProjectId || undefined;

  const { data: conversationsData, isLoading } = useAIConversations({
    projectId: activeProjectId,
    pageSize: 50,
  });

  const handleSelectConversation = (conv: AIConversation) => {
    setSearchParams({
      conversationId: conv.id,
      ...(conv.projectId && { projectId: conv.projectId }),
      ...(conv.taskId && { taskId: conv.taskId }),
    });
  };

  const handleNewConversation = () => {
    setSearchParams({
      ...(activeProjectId && { projectId: activeProjectId }),
      ...(taskId && { taskId }),
    });
  };

  return (
    <PageShell aiPage={CORE_AI_PAGE_IDS.aiSpace}>
      <PageHeader
        aiId="ai-hub.ai-space"
        title="AI Space"
        description="统一管理会话、上下文与工作流执行。"
      />
      <section
        className="flex items-center gap-2 border-b border-content-border bg-content-bg px-6 py-3"
        data-ai-component="ai-hub.ai-space.context-bar"
        data-ai-role="filter"
      >
        <span className="rounded-full bg-content-bg-secondary px-2 py-1 text-xs text-content-text-secondary">
          会话数 {conversationsData?.data.length ?? 0}
        </span>
        {activeProjectId ? (
          <span className="rounded-full bg-content-bg-secondary px-2 py-1 text-xs text-content-text-secondary">
            项目 {activeProjectId}
          </span>
        ) : null}
        {taskId ? (
          <span className="rounded-full bg-content-bg-secondary px-2 py-1 text-xs text-content-text-secondary">
            任务 {taskId}
          </span>
        ) : null}
      </section>
      <div
        className="flex h-full bg-content-bg motion-enter"
        data-ai-component="ai-hub.ai-space.primary-layout"
        data-ai-role="content"
      >
      {/* Conversation list sidebar */}
      <div className="flex w-[280px] flex-col border-r border-content-border bg-content-bg-secondary" data-ai-component="ai-hub.ai-space.conversation-list">
        <div className="border-b border-content-border p-4">
          <button
            onClick={handleNewConversation}
            type="button"
            className="w-full rounded-md bg-accent-blue px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-blue/90"
            data-ai-component="ai-hub.ai-space.conversation-list.new-button"
            data-ai-action="ai-hub.ai-space.conversation-list.new-button.click"
            data-ai-role="submit"
          >
            + 新对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-content-text-secondary">加载中...</div>
          ) : conversationsData?.data.length === 0 ? (
            <div className="p-4 text-center text-sm text-content-text-secondary">暂无对话</div>
          ) : (
            conversationsData?.data.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={cn(
                  'mb-1 cursor-pointer rounded-md border p-3 transition-colors',
                  conv.id === conversationId
                    ? 'border-accent-blue bg-content-bg'
                    : 'border-transparent hover:bg-content-bg',
                )}
                data-ai-component={`ai-hub.ai-space.conversation-list.item.${conv.id}`}
                data-ai-action={`ai-hub.ai-space.conversation-list.item.${conv.id}.jump`}
                data-ai-role="jump"
              >
                <div className="mb-1 text-sm font-medium text-content-text">{conv.title || '新对话'}</div>
                <div className="text-xs text-content-text-secondary">
                  {conv._count?.messages || 0} 条消息
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col" data-ai-component="ai-hub.ai-space.chat-panel" data-ai-role="content">
        <AIChatPanel
          conversationId={conversationId}
          projectId={activeProjectId}
          taskId={taskId}
        />
      </div>

      {/* Context panel (right sidebar) */}
      <div className="w-[280px] border-l border-content-border bg-content-bg-secondary p-4" data-ai-component="ai-hub.ai-space.side-assist" data-ai-role="panel">
        <div className="mb-4 text-sm font-semibold text-content-text">上下文信息</div>
        {activeProjectId && (
          <div className="mb-4 rounded-md bg-content-bg p-3">
            <div className="mb-1 text-xs text-content-text-secondary">项目</div>
            <div className="text-sm text-content-text">项目 ID: {activeProjectId}</div>
          </div>
        )}
        {taskId && (
          <div className="mb-4 rounded-md bg-content-bg p-3">
            <div className="mb-1 text-xs text-content-text-secondary">任务</div>
            <div className="text-sm text-content-text">任务 ID: {taskId}</div>
          </div>
        )}
      </div>
      </div>
      <AttentionRail
        aiPrefix="ai-hub.ai-space"
        items={[
          {
            id: 'project-list',
            title: '回到项目总览',
            description: '快速切换项目与任务上下文',
            to: '/app/projects',
          },
          {
            id: 'terminal',
            title: '打开终端协作',
            description: '结合命令输出继续 AI 诊断',
            to: '/app/terminal',
          },
        ]}
      />
    </PageShell>
  );
}
