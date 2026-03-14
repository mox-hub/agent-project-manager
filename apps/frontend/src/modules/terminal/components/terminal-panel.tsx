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
    <div className="flex h-full flex-col rounded-lg border border-content-border bg-content-bg">
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto bg-[#1e1e1e] p-3 font-mono text-sm text-[#d4d4d4]"
      >
        <div className="whitespace-pre-wrap">{output}</div>
        {errorOutput ? <div className="whitespace-pre-wrap text-accent-red">{errorOutput}</div> : null}
      </div>
      <div className="border-t border-content-border bg-content-bg-secondary p-2">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter command..."
            className="flex-1 font-mono"
          />
          <Button type="submit" disabled={executeCommand.isPending}>
            Execute
          </Button>
          <Button type="button" variant="secondary" onClick={clear}>
            Clear
          </Button>
        </form>
      </div>
    </div>
  );
}
