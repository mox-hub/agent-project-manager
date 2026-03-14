import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
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
      <PageShell>
        <div className="flex h-full items-center justify-center text-sm text-content-text-secondary">
          Loading terminal sessions...
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Terminal"
        actions={
          <Button onClick={handleCreateSession} disabled={createSession.isPending}>
            New Session
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {sessions && sessions.length > 0 ? (
          <aside className="w-60 overflow-y-auto border-r border-content-border bg-content-bg-secondary">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`cursor-pointer border-b border-content-border p-3 ${
                  activeSessionId === session.id ? "bg-content-bg" : "hover:bg-content-bg"
                }`}
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
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </aside>
        ) : null}

        <div className="min-w-0 flex-1 p-4">
          {activeSessionId ? (
            <TerminalPanel sessionId={activeSessionId} />
          ) : (
            <EmptyState
              title={sessions && sessions.length > 0 ? "Select a terminal session" : "Create a terminal session"}
              description={sessions && sessions.length > 0 ? "Choose one from the left sidebar." : "Click 'New Session' to start."}
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
