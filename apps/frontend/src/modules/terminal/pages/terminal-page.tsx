import { useState } from 'react';
import {
  useTerminalSessions,
  useCreateTerminalSession,
  useCloseTerminalSession,
} from '../hooks/use-terminal-sessions';
import { TerminalPanel } from '../components/terminal-panel';
import { useAppStore } from '@/infrastructure/store/app-store';

export function TerminalPage() {
  const { currentProjectId } = useAppStore();
  const { data: sessions, isLoading } = useTerminalSessions({
    projectId: currentProjectId ?? undefined,
    status: 'active',
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
      console.error('Failed to create terminal session', error);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      await closeSession.mutateAsync(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch (error) {
      console.error('Failed to close terminal session', error);
    }
  };

  if (isLoading) {
    return <div>Loading terminal sessions...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <h2 style={{ margin: 0 }}>Terminal</h2>
        <button
          onClick={handleCreateSession}
          disabled={createSession.isPending}
          style={{
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          New Session
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sessions && sessions.length > 0 && (
          <div
            style={{
              width: '200px',
              borderRight: '1px solid #e5e7eb',
              overflowY: 'auto',
            }}
          >
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  backgroundColor:
                    activeSessionId === session.id ? '#f3f4f6' : 'transparent',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>
                    {session.name || 'Terminal'}
                  </div>
                  {session.cwd && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '4px',
                      }}
                    >
                      {session.cwd}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseSession(session.id);
                  }}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }}>
          {activeSessionId ? (
            <TerminalPanel sessionId={activeSessionId} />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#6b7280',
              }}
            >
              {sessions && sessions.length > 0
                ? 'Select a terminal session or create a new one'
                : 'Create a terminal session to get started'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
