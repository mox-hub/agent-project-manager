import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangleIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SkeletonCard } from "@/components/ui/skeleton";
import { CORE_AI_PAGE_IDS } from "@/shared/ai/identifiers";
import { useAppStore } from "@/infrastructure/store/app-store";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TerminalPanel } from "../components/terminal-panel";
import {
  useCloseTerminalSession,
  useCreateTerminalSession,
  useTerminalSessions,
} from "../hooks/use-terminal-sessions";
import { TerminalSquare } from "lucide-react";

export function TerminalPage() {
  const { currentProjectId } = useAppStore();
  const { data: sessions, isLoading, isError, error, refetch } = useTerminalSessions({
    projectId: currentProjectId ?? undefined,
    status: "active",
  });
  const createSession = useCreateTerminalSession();
  const closeSession = useCloseTerminalSession();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const selectedSessionId = activeSessionId ?? sessions?.[0]?.id ?? null;

  const handleCreateSession = async () => {
    try {
      const session = await createSession.mutateAsync({
        projectId: currentProjectId || undefined,
        name: `Terminal ${new Date().toLocaleTimeString()}`,
      });
      setActiveSessionId(session.id);
      toast.success("终端会话已创建");
    } catch (error) {
      toast.error("创建终端会话失败，请重试");
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      await closeSession.mutateAsync(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
      toast.success("终端会话已关闭");
    } catch (error) {
      toast.error("关闭终端会话失败，请重试");
    }
  };

  if (isLoading) {
    return (
      <PageShell aiPage={CORE_AI_PAGE_IDS.terminal}>
        <div className="flex h-full flex-col gap-3 p-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell aiPage={CORE_AI_PAGE_IDS.terminal}>
        <div className="flex h-full items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-sm">
            <AlertTriangleIcon className="size-4" />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>
              {error?.message || "无法加载终端会话"}
            </AlertDescription>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => refetch()}>
              重试
            </Button>
          </Alert>
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
        icon={TerminalSquare}
        iconColor="text-accent-green"
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
      <section
        className="flex items-center gap-2 border-b border-border bg-background px-4 py-3"
        data-ai-component="terminal.terminal.context-bar"
        data-ai-role="filter"
      >
        <span className="rounded-full bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
          活跃会话 {sessions?.length ?? 0}
        </span>
        <span className="rounded-full bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
          项目 {currentProjectId ?? 'global'}
        </span>
      </section>

      <ResizablePanelGroup className="min-h-0 flex-1 gap-4 overflow-hidden p-4">
        {sessions && sessions.length > 0 ? (
          <ResizablePanel defaultSize={20} minSize={16}>
            <ScrollArea className="h-full rounded-xl border border-border bg-muted/50 motion-enter" data-ai-component="terminal.terminal.session-list" data-ai-role="panel">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`cursor-pointer border-b border-border p-3 motion-shift ${
                  selectedSessionId === session.id ? "bg-background" : "hover:bg-muted/50"
                }`}
                data-ai-component={`terminal.terminal.session-list.item.${session.id}`}
                data-ai-action={`terminal.terminal.session-list.item.${session.id}.jump`}
                data-ai-role="jump"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-foreground">{session.name || "Terminal"}</div>
                    {session.cwd ? <div className="mt-1 text-xs text-muted-foreground">{session.cwd}</div> : null}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseSession(session.id);
                    }}
                    className="rounded border border-border px-2 py-0.5 text-xs text-accent-red hover:bg-muted/50"
                    data-ai-component={`terminal.terminal.session-list.item.${session.id}.close`}
                    data-ai-action={`terminal.terminal.session-list.item.${session.id}.close.click`}
                    data-ai-role="danger"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            </ScrollArea>
          </ResizablePanel>
        ) : null}

        {sessions && sessions.length > 0 ? <ResizableHandle withHandle /> : null}
        <ResizablePanel defaultSize={sessions && sessions.length > 0 ? 56 : 72} minSize={40}>
          <div className="h-full min-w-0 rounded-xl border border-border bg-background p-4" data-ai-component="terminal.terminal.primary-content" data-ai-role="content">
          {selectedSessionId ? (
            <TerminalPanel sessionId={selectedSessionId} />
          ) : (
            <EmptyState
              title={sessions && sessions.length > 0 ? "Select a terminal session" : "Create a terminal session"}
              description={sessions && sessions.length > 0 ? "Choose one from the left sidebar." : "Click 'New Session' to start."}
            />
          )}
          </div>
        </ResizablePanel>

      </ResizablePanelGroup>
    </PageShell>
  );
}
