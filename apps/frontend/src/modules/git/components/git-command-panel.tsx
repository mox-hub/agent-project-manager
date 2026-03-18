import React, { useState } from 'react';
import { gitApi } from '../api/git-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-content-text">Git Command Panel</p>
          <Button size="xs" variant="ghost" onClick={loadHistory}>
            History
          </Button>
        </div>

        <Tabs defaultValue="command">
          <TabsList>
            <TabsTrigger value="command">Command</TabsTrigger>
            <TabsTrigger value="quick">Quick Actions</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="command" className="space-y-3">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-content-text">Command</p>
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="git command (e.g., pull, push, status)"
                  disabled={executing}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-content-text">Arguments</p>
                <Input
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="command arguments (space-separated)"
                  disabled={executing}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-content-text-secondary">
                <Checkbox
                  id="allowDangerous"
                  checked={allowDangerous}
                  onChange={(e) => setAllowDangerous(e.target.checked)}
                />
                Allow dangerous commands
              </label>
              <Button
                onClick={executeCommand}
                disabled={executing || !command.trim()}
                className="w-full"
              >
                {executing ? (
                  <>
                    <Spinner />
                    Executing...
                  </>
                ) : (
                  'Execute'
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="quick" className="space-y-2">
            <p className="text-sm text-content-text-secondary">Click a command to fill the input:</p>
            <div className="grid grid-cols-2 gap-2">
              {commonCommands.map((cmd) => (
                <Button
                  key={cmd.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickCommand(cmd.command, cmd.args)}
                >
                  {cmd.label}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-content-text-secondary">No command history</p>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="space-y-1 rounded border p-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-mono font-medium text-content-text">
                        git {item.command}{' '}
                        {Array.isArray(item.args)
                          ? item.args.join(' ')
                          : ''}
                      </p>
                      <p className="text-xs text-content-text-secondary">
                        {new Date(item.executedAt).toLocaleString()}
                      </p>
                    </div>
                    {item.exitCode !== undefined && (
                      <p
                        className={`text-xs ${item.exitCode === 0 ? 'text-emerald-600' : 'text-destructive'}`}
                      >
                        Exit code: {item.exitCode}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {result && (
          <div className="space-y-2">
            {result.success ? (
              <Alert>
                <AlertTitle>Command executed successfully</AlertTitle>
                <AlertDescription>
                  {result.stdout && (
                    <pre className="mt-2 max-h-40 overflow-auto rounded bg-content-bg-secondary p-2 text-xs">
                      {result.stdout}
                    </pre>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTitle>Command failed (exit code: {result.exitCode})</AlertTitle>
                <AlertDescription>
                  <div className="space-y-2">
                    {result.errorMessage && <p>{result.errorMessage}</p>}
                    {result.suggestion && (
                      <p className="text-content-text-secondary">{result.suggestion}</p>
                    )}
                    {result.stderr && (
                      <pre className="max-h-40 overflow-auto rounded bg-destructive/10 p-2 text-xs">
                        {result.stderr}
                      </pre>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
