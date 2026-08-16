import React, { useState } from 'react';
import { useExecuteCommand, useCommandHistory } from '../hooks/use-git-command';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TerminalSquare } from 'lucide-react';

export interface GitCommandPanelProps {
  repoId: string;
}

export function GitCommandPanel({ repoId }: GitCommandPanelProps) {
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [allowDangerous, setAllowDangerous] = useState(false);

  const { data: commandResult, mutateAsync: executeCommand, isPending: executing } = useExecuteCommand();
  const { data: history, refetch } = useCommandHistory(repoId, 10);

  const commonCommands = [
    { label: 'Status', command: 'status', args: [] },
    { label: 'Pull', command: 'pull', args: ['origin'] },
    { label: 'Push', command: 'push', args: ['origin'] },
    { label: 'Fetch', command: 'fetch', args: [] },
    { label: 'Add All', command: 'add', args: ['.'] },
    { label: 'Commit', command: 'commit', args: ['-m', 'Update'] },
  ];

  const handleExecute = async () => {
    if (!command.trim()) return;

    const argsArray = args
      .split(' ')
      .map((arg) => arg.trim())
      .filter((arg) => arg.length > 0);

    await executeCommand({
      repoId,
      dto: {
        command: command.trim(),
        args: argsArray,
        options: { allowDangerous, timeout: 30000 },
      },
    });
  };

  const handleQuickCommand = (cmd: string, cmdArgs: string[]) => {
    setCommand(cmd);
    setArgs(cmdArgs.join(' '));
  };

  return (
    <Card>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Git Command Panel</p>
          <Button size="xs" variant="ghost" onClick={() => refetch()}>
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
                <p className="text-sm font-medium text-foreground">Command</p>
                <InputGroup>
                  <InputGroupAddon>
                    <TerminalSquare size={15} className="text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="git command (e.g., pull, push, status)"
                    disabled={executing}
                  />
                </InputGroup>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Arguments</p>
                <InputGroup>
                  <InputGroupAddon>
                    <span className="text-xs text-muted-foreground">args</span>
                  </InputGroupAddon>
                  <InputGroupInput
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder="command arguments (space-separated)"
                    disabled={executing}
                  />
                </InputGroup>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  id="allowDangerous"
                  checked={allowDangerous}
                  onChange={(e) => setAllowDangerous(e.target.checked)}
                />
                Allow dangerous commands
              </label>
              <Button
                onClick={handleExecute}
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
            <p className="text-sm text-muted-foreground">Click a command to fill the input:</p>
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
            {history && history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No command history</p>
            ) : (
              <div className="space-y-2">
                {history?.map((item) => (
                  <div
                    key={item.id}
                    className="space-y-1 rounded border p-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-mono font-medium text-foreground">
                        git {item.command}{' '}
                        {Array.isArray(item.args)
                          ? item.args.join(' ')
                          : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.executedAt).toLocaleString()}
                      </p>
                    </div>
                    {item.exitCode !== undefined && (
                      <p
                        className={`text-xs ${item.exitCode === 0 ? 'text-accent-green' : 'text-destructive'}`}
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

        {commandResult && (
          <div className="space-y-2">
            {commandResult.success ? (
              <Alert>
                <AlertTitle>Command executed successfully</AlertTitle>
                <AlertDescription>
                  {commandResult.stdout && (
                    <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted/50 p-2 text-xs">
                      {commandResult.stdout}
                    </pre>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTitle>Command failed (exit code: {commandResult.exitCode})</AlertTitle>
                <AlertDescription>
                  <div className="space-y-2">
                    {commandResult.errorMessage && <p>{commandResult.errorMessage}</p>}
                    {commandResult.suggestion && (
                      <p className="text-muted-foreground">{commandResult.suggestion}</p>
                    )}
                    {commandResult.stderr && (
                      <pre className="max-h-40 overflow-auto rounded bg-destructive/10 p-2 text-xs">
                        {commandResult.stderr}
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
