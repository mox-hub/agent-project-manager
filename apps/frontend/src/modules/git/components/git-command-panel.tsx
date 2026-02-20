import React, { useState } from 'react';
import { gitApi } from '../api/git-api';
import {
  Button,
  Card,
  Text,
  TextField,
  Callout,
  Spinner,
  Tabs,
} from '@radix-ui/themes';

export interface GitCommandPanelProps {
  repoId: string;
}

export function GitCommandPanel({ repoId }: GitCommandPanelProps) {
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    error?: string;
    errorMessage?: string;
    suggestion?: string;
  } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [allowDangerous, setAllowDangerous] = useState(false);

  const commonCommands = [
    { label: 'Status', command: 'status', args: [] },
    { label: 'Pull', command: 'pull', args: ['origin'] },
    { label: 'Push', command: 'push', args: ['origin'] },
    { label: 'Fetch', command: 'fetch', args: [] },
    { label: 'Add All', command: 'add', args: ['.'] },
    { label: 'Commit', command: 'commit', args: ['-m', 'Update'] },
  ];

  const executeCommand = async () => {
    if (!command.trim()) return;

    setExecuting(true);
    setResult(null);

    try {
      const argsArray = args
        .split(' ')
        .map((arg) => arg.trim())
        .filter((arg) => arg.length > 0);

      const response = await gitApi.executeCommand(repoId, {
        command: command.trim(),
        args: argsArray,
        options: {
          allowDangerous,
          timeout: 30000,
        },
      });

      setResult(response.data);
      loadHistory();
    } catch (error: any) {
      setResult({
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: error.message || 'Command execution failed',
        error: 'GIT_COMMAND_FAILED',
        errorMessage: error.message,
      });
    } finally {
      setExecuting(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await gitApi.getCommandHistory(repoId, 10);
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to load command history', error);
    }
  };

  const handleQuickCommand = (cmd: string, cmdArgs: string[]) => {
    setCommand(cmd);
    setArgs(cmdArgs.join(' '));
  };

  return (
    <Card>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Text weight="bold">Git Command Panel</Text>
          <Button size="1" variant="ghost" onClick={loadHistory}>
            History
          </Button>
        </div>

        <Tabs.Root defaultValue="command">
          <Tabs.List>
            <Tabs.Trigger value="command">Command</Tabs.Trigger>
            <Tabs.Trigger value="quick">Quick Actions</Tabs.Trigger>
            <Tabs.Trigger value="history">History</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="command" className="space-y-3">
            <div className="space-y-2">
              <div>
                <Text size="2" weight="medium">
                  Command
                </Text>
                <TextField.Root
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="git command (e.g., pull, push, status)"
                  disabled={executing}
                />
              </div>
              <div>
                <Text size="2" weight="medium">
                  Arguments
                </Text>
                <TextField.Root
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="command arguments (space-separated)"
                  disabled={executing}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowDangerous"
                  checked={allowDangerous}
                  onChange={(e) => setAllowDangerous(e.target.checked)}
                />
                <label htmlFor="allowDangerous" className="text-sm">
                  Allow dangerous commands
                </label>
              </div>
              <Button
                onClick={executeCommand}
                disabled={executing || !command.trim()}
                className="w-full"
              >
                {executing ? (
                  <>
                    <Spinner size="2" />
                    Executing...
                  </>
                ) : (
                  'Execute'
                )}
              </Button>
            </div>
          </Tabs.Content>

          <Tabs.Content value="quick" className="space-y-2">
            <Text size="2" color="gray">
              Click a command to fill the input:
            </Text>
            <div className="grid grid-cols-2 gap-2">
              {commonCommands.map((cmd) => (
                <Button
                  key={cmd.label}
                  variant="outline"
                  size="2"
                  onClick={() => handleQuickCommand(cmd.command, cmd.args)}
                >
                  {cmd.label}
                </Button>
              ))}
            </div>
          </Tabs.Content>

          <Tabs.Content value="history" className="space-y-2">
            {history.length === 0 ? (
              <Text size="2" color="gray">
                No command history
              </Text>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 border rounded text-sm space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <Text weight="medium" className="font-mono">
                        git {item.command}{' '}
                        {Array.isArray(item.args)
                          ? item.args.join(' ')
                          : ''}
                      </Text>
                      <Text size="1" color="gray">
                        {new Date(item.executedAt).toLocaleString()}
                      </Text>
                    </div>
                    {item.exitCode !== undefined && (
                      <Text
                        size="1"
                        color={item.exitCode === 0 ? 'green' : 'red'}
                      >
                        Exit code: {item.exitCode}
                      </Text>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Tabs.Content>
        </Tabs.Root>

        {result && (
          <div className="space-y-2">
            {result.success ? (
              <Callout.Root color="green">
                <Callout.Text>
                  <Text size="2" weight="bold" as="div">
                    Command executed successfully
                  </Text>
                  {result.stdout && (
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                      {result.stdout}
                    </pre>
                  )}
                </Callout.Text>
              </Callout.Root>
            ) : (
              <Callout.Root color="red">
                <Callout.Text>
                  <div className="space-y-2">
                    <Text size="2" weight="bold" as="div">
                      Command failed (exit code: {result.exitCode})
                    </Text>
                    {result.errorMessage && (
                      <Text size="2" as="div">{result.errorMessage}</Text>
                    )}
                    {result.suggestion && (
                      <Text size="2" color="gray" as="div">
                        {result.suggestion}
                      </Text>
                    )}
                    {result.stderr && (
                      <pre className="text-xs bg-red-50 p-2 rounded overflow-auto max-h-40">
                        {result.stderr}
                      </pre>
                    )}
                  </div>
                </Callout.Text>
              </Callout.Root>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
