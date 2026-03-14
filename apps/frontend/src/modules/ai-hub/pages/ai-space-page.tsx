import { useSearchParams } from 'react-router-dom';
import { useAIConversations } from '../hooks/use-ai-conversations';
import { AIChatPanel } from '../components/ai-chat-panel';
import { useAppStore } from '@/infrastructure/store/app-store';
import type { AIConversation } from '../api/ai-hub-api';
import { cn } from '@/lib/utils';

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
    <div className="flex h-full bg-content-bg">
      {/* Conversation list sidebar */}
      <div className="flex w-[280px] flex-col border-r border-content-border bg-content-bg-secondary">
        <div className="border-b border-content-border p-4">
          <button
            onClick={handleNewConversation}
            type="button"
            className="w-full rounded-md bg-accent-blue px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-blue/90"
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
      <div className="flex flex-1 flex-col">
        <AIChatPanel
          conversationId={conversationId}
          projectId={activeProjectId}
          taskId={taskId}
        />
      </div>

      {/* Context panel (right sidebar) */}
      <div className="w-[280px] border-l border-content-border bg-content-bg-secondary p-4">
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
  );
}
