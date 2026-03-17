import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { AttentionRail } from "@/components/ui/attention-rail";
import { CORE_AI_PAGE_IDS } from "@/shared/ai/identifiers";
import { useAppStore } from "@/infrastructure/store/app-store";
import { TerminalPanel } from "../components/terminal-panel";
import {
  useCloseTerminalSession,
  useCreateTerminalSession,
  useTerminalSessions,
} from "../hooks/use-terminal-sessions";

export function TerminalPage() {
  const { currentProjectId } = useAppStore();
  const { data: sessions, isLoading } = useTerminalSessions({
    projectId: currentProjectId ?? undefined,
    status: "active",
  });
  const createSession = useCreateTerminalSession();
  const closeSession = useCloseTerminalSession();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const handleCreateSession = async () => {
    try {
      const session = await createSession.mutateAsync({
        projectId: currentProjectId || undefined,
        name: `Terminal ${new Date().toLocaleTimeString()}`,
      });
      setActiveSessionId(session.id);
    } catch (error) {
      console.error("Failed to create terminal session", error);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      await closeSession.mutateAsync(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch (error) {
      console.error("Failed to close terminal session", error);
    }
  };

  if (isLoading) {
    return (
      <PageShell aiPage={CORE_AI_PAGE_IDS.terminal}>
        <div className="flex h-full items-center justify-center text-sm text-content-text-secondary">
          Loading terminal sessions...
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell aiPage={CORE_AI_PAGE_IDS.terminal}>
      <PageHeader
        aiId="terminal.terminal"
        title="Terminal"
        description="统一管理终端会话，结合 AI 诊断快速处理工程问题。"
        actions={
          <Button
            onClick={handleCreateSession}
            disabled={createSession.isPending}
            data-ai-component="terminal.terminal.header.new-session"
            data-ai-action="terminal.terminal.header.new-session.click"
            data-ai-role="submit"
          >
            New Session
          </Button>
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        {sessions && sessions.length > 0 ? (
          <aside className="overflow-y-auto rounded-xl border border-content-border bg-content-bg-secondary" data-ai-component="terminal.terminal.session-list" data-ai-role="panel">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`cursor-pointer border-b border-content-border p-3 ${
                  activeSessionId === session.id ? "bg-content-bg" : "hover:bg-content-bg"
                }`}
                data-ai-component={`terminal.terminal.session-list.item.${session.id}`}
                data-ai-action={`terminal.terminal.session-list.item.${session.id}.jump`}
                data-ai-role="jump"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-content-text">{session.name || "Terminal"}</div>
                    {session.cwd ? <div className="mt-1 text-xs text-content-text-secondary">{session.cwd}</div> : null}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseSession(session.id);
                    }}
                    className="rounded border border-content-border px-2 py-0.5 text-xs text-accent-red hover:bg-content-bg"
                    data-ai-component={`terminal.terminal.session-list.item.${session.id}.close`}
                    data-ai-action={`terminal.terminal.session-list.item.${session.id}.close.click`}
                    data-ai-role="danger"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </aside>
        ) : null}

        <div className="min-w-0 rounded-xl border border-content-border bg-content-bg p-4" data-ai-component="terminal.terminal.primary-content" data-ai-role="content">
          {activeSessionId ? (
            <TerminalPanel sessionId={activeSessionId} />
          ) : (
            <EmptyState
              title={sessions && sessions.length > 0 ? "Select a terminal session" : "Create a terminal session"}
              description={sessions && sessions.length > 0 ? "Choose one from the left sidebar." : "Click 'New Session' to start."}
            />
          )}
        </div>

        <AttentionRail
          aiPrefix="terminal.terminal"
          items={[
            {
              id: 'git-repositories',
              title: '查看 Git 仓库',
              description: '切换仓库并继续命令操作',
              to: '/app/settings',
            },
            {
              id: 'ai-space',
              title: '发送到 AI Space',
              description: '把终端问题转给 AI 分析',
              to: '/app/ai',
            },
          ]}
        />
      </div>
    </PageShell>
  );
}
