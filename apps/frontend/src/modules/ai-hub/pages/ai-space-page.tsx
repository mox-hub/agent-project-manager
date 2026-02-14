import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAIConversations } from '../hooks/use-ai-conversations';
import { AIChatPanel } from '../components/ai-chat-panel';
import { useAppStore } from '@/infrastructure/store/app-store';
import type { AIConversation } from '../api/ai-hub-api';

export function AISpacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get('conversationId') || undefined;
  const projectId = searchParams.get('projectId') || undefined;
  const taskId = searchParams.get('taskId') || undefined;
  const { currentProjectId } = useAppStore();

  const activeProjectId = projectId || currentProjectId;

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
    <div
      style={{
        display: 'flex',
        height: '100%',
        backgroundColor: '#020617',
      }}
    >
      {/* Conversation list sidebar */}
      <div
        style={{
          width: '280px',
          borderRight: '1px solid #1e293b',
          backgroundColor: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <button
            onClick={handleNewConversation}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + 新对话
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          {isLoading ? (
            <div
              style={{
                padding: '16px',
                color: '#6b7280',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              加载中...
            </div>
          ) : conversationsData?.data.length === 0 ? (
            <div
              style={{
                padding: '16px',
                color: '#6b7280',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              暂无对话
            </div>
          ) : (
            conversationsData?.data.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                style={{
                  padding: '12px',
                  marginBottom: '4px',
                  borderRadius: '8px',
                  backgroundColor:
                    conv.id === conversationId ? '#1e293b' : 'transparent',
                  cursor: 'pointer',
                  border:
                    conv.id === conversationId
                      ? '1px solid #3b82f6'
                      : '1px solid transparent',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#e5e7eb',
                    marginBottom: '4px',
                  }}
                >
                  {conv.title || '新对话'}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#6b7280',
                  }}
                >
                  {conv._count?.messages || 0} 条消息
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AIChatPanel
          conversationId={conversationId}
          projectId={activeProjectId}
          taskId={taskId}
        />
      </div>

      {/* Context panel (right sidebar) */}
      <div
        style={{
          width: '280px',
          borderLeft: '1px solid #1e293b',
          backgroundColor: '#0f172a',
          padding: '16px',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#e5e7eb',
            marginBottom: '16px',
          }}
        >
          上下文信息
        </div>
        {activeProjectId && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: '#1e293b',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '4px',
              }}
            >
              项目
            </div>
            <div style={{ fontSize: '14px', color: '#e5e7eb' }}>
              项目 ID: {activeProjectId}
            </div>
          </div>
        )}
        {taskId && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: '#1e293b',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '4px',
              }}
            >
              任务
            </div>
            <div style={{ fontSize: '14px', color: '#e5e7eb' }}>
              任务 ID: {taskId}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
