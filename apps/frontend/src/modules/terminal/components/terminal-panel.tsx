import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExecuteCommand } from "../hooks/use-terminal-sessions";
import { useTerminalOutput } from "../hooks/use-terminal-output";

interface TerminalPanelProps {
  sessionId: string;
}

export function TerminalPanel({ sessionId }: TerminalPanelProps) {
  const { output, errorOutput, clear } = useTerminalOutput(sessionId);
  const executeCommand = useExecuteCommand();
  const [input, setInput] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, errorOutput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const parts = input.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    try {
      await executeCommand.mutateAsync({ sessionId, command, args });
      setInput("");
    } catch (error) {
      console.error("Failed to execute command", error);
    }
  };

  return (
    <div
      className="flex h-full flex-col rounded-xl border border-border bg-background"
      data-ai-component={`terminal.terminal.panel.${sessionId}`}
      data-ai-role="content"
    >
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto rounded-t-xl bg-muted/50 p-3 font-mono text-sm text-foreground"
        data-ai-component={`terminal.terminal.panel.${sessionId}.output`}
      >
        <div className="whitespace-pre-wrap">{output}</div>
        {errorOutput ? <div className="mt-2 whitespace-pre-wrap text-accent-red">{errorOutput}</div> : null}
      </div>
      <div className="border-t border-border bg-muted/50 p-2">
        <form onSubmit={handleSubmit} className="flex gap-2" data-ai-component={`terminal.terminal.panel.${sessionId}.command-form`} data-ai-role="input">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter command..."
            className="flex-1 font-mono"
            data-ai-component={`terminal.terminal.panel.${sessionId}.command-input`}
            data-ai-action={`terminal.terminal.panel.${sessionId}.command-input.change`}
          />
          <Button
            type="submit"
            disabled={executeCommand.isPending}
            data-ai-component={`terminal.terminal.panel.${sessionId}.execute`}
            data-ai-action={`terminal.terminal.panel.${sessionId}.execute.click`}
            data-ai-role="submit"
          >
            Execute
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={clear}
            data-ai-component={`terminal.terminal.panel.${sessionId}.clear`}
            data-ai-action={`terminal.terminal.panel.${sessionId}.clear.click`}
            data-ai-role="danger"
          >
            Clear
          </Button>
        </form>
      </div>
    </div>
  );
}
