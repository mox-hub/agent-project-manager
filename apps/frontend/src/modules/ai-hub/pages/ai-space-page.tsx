import { useSearchParams } from 'react-router-dom';
import { useAIConversations } from '../hooks/use-ai-conversations';
import { AIChatPanel } from '../components/ai-chat-panel';
import { useAppStore } from '@/infrastructure/store/app-store';
import type { AIConversation } from '../api/ai-hub-api';
import { cn } from '@/lib/utils';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
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
    <PageShell aiPage={CORE_AI_PAGE_IDS.aiSpace} className="overflow-hidden">
      <PageHeader
        aiId="ai-hub.ai-space"
        title="AI Space"
        description="统一管理会话、上下文与工作流执行。"
      />
      <section
        className="flex items-center gap-2 border-b border-border bg-background px-4 py-2"
        data-ai-component="ai-hub.ai-space.context-bar"
        data-ai-role="filter"
      >
        <span className="rounded-full bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
          会话数 {conversationsData?.data.length ?? 0}
        </span>
        {activeProjectId ? (
          <span className="rounded-full bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
            项目 {activeProjectId}
          </span>
        ) : null}
        {taskId ? (
          <span className="rounded-full bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
            任务 {taskId}
          </span>
        ) : null}
      </section>
      <div
        className="flex h-full overflow-hidden bg-background motion-enter"
        data-ai-component="ai-hub.ai-space.primary-layout"
        data-ai-role="content"
      >
      {/* Conversation list sidebar */}
      <div className="flex w-60 flex-col border-r border-border bg-muted/50" data-ai-component="ai-hub.ai-space.conversation-list">
        <div className="border-b border-border p-4">
          <Button
            onClick={handleNewConversation}
            className="w-full bg-accent-blue text-white hover:bg-accent-blue/90"
            data-ai-component="ai-hub.ai-space.conversation-list.new-button"
            data-ai-action="ai-hub.ai-space.conversation-list.new-button.click"
            data-ai-role="submit"
          >
            + 新对话
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">加载中...</div>
          ) : conversationsData?.data.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">暂无对话</div>
          ) : (
            conversationsData?.data.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={cn(
                  'mb-1 cursor-pointer rounded-md border p-3 transition-colors',
                  conv.id === conversationId
                    ? 'border-accent-blue bg-background'
                    : 'border-transparent hover:bg-muted/50',
                )}
                data-ai-component={`ai-hub.ai-space.conversation-list.item.${conv.id}`}
                data-ai-action={`ai-hub.ai-space.conversation-list.item.${conv.id}.jump`}
                data-ai-role="jump"
              >
                <div className="mb-1 text-sm font-medium text-foreground">{conv.title || '新对话'}</div>
                <div className="text-xs text-muted-foreground">
                  {conv._count?.messages || 0} 条消息
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col" data-ai-component="ai-hub.ai-space.chat-panel" data-ai-role="content">
        <AIChatPanel
          conversationId={conversationId}
          projectId={activeProjectId}
          taskId={taskId}
        />
      </div>

      {/* Context panel (right sidebar) */}
      <div className="w-60 border-l border-border bg-muted/50 p-4" data-ai-component="ai-hub.ai-space.side-assist" data-ai-role="panel">
        <div className="mb-4 text-sm font-semibold text-foreground">上下文信息</div>
        {activeProjectId && (
          <div className="mb-4 rounded-md bg-background p-3">
            <div className="mb-1 text-xs text-muted-foreground">项目</div>
            <div className="text-sm text-foreground">项目 ID: {activeProjectId}</div>
          </div>
        )}
        {taskId && (
          <div className="mb-4 rounded-md bg-background p-3">
            <div className="mb-1 text-xs text-muted-foreground">任务</div>
            <div className="text-sm text-foreground">任务 ID: {taskId}</div>
          </div>
        )}
      </div>
      </div>
    </PageShell>
  );
}
