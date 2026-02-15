import { useEffect, useRef, useState } from 'react';
import { useTerminalOutput } from '../hooks/use-terminal-output';
import { useExecuteCommand } from '../hooks/use-terminal-sessions';

interface TerminalPanelProps {
  sessionId: string;
}

export function TerminalPanel({ sessionId }: TerminalPanelProps) {
  const { output, errorOutput, clear } = useTerminalOutput(sessionId);
  const executeCommand = useExecuteCommand();
  const [input, setInput] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, errorOutput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      return;
    }

    const parts = input.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    try {
      await executeCommand.mutateAsync({
        sessionId,
        command,
        args,
      });
      setInput('');
    } catch (error) {
      console.error('Failed to execute command', error);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        fontFamily: 'monospace',
        fontSize: '14px',
      }}
    >
      <div
        ref={outputRef}
        style={{
          flex: 1,
          padding: '12px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <div style={{ whiteSpace: 'pre-wrap' }}>{output}</div>
        {errorOutput && (
          <div style={{ whiteSpace: 'pre-wrap', color: '#f48771' }}>
            {errorOutput}
          </div>
        )}
      </div>
      <div
        style={{
          borderTop: '1px solid #3e3e3e',
          padding: '8px',
          display: 'flex',
          gap: '8px',
        }}
      >
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter command..."
            style={{
              flex: 1,
              padding: '6px 8px',
              backgroundColor: '#252526',
              color: '#d4d4d4',
              border: '1px solid #3e3e3e',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}
          />
          <button
            type="submit"
            disabled={executeCommand.isPending}
            style={{
              padding: '6px 12px',
              backgroundColor: '#0e639c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Execute
          </button>
          <button
            type="button"
            onClick={clear}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </form>
      </div>
    </div>
  );
}
