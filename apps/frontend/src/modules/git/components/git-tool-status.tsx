import React, { useState } from 'react';
import { useGitToolStatus, useSetGitPath } from '../hooks/use-git-tool';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';

export interface GitToolStatusProps {
  onStatusChange?: (available: boolean) => void;
}

export function GitToolStatusPanel({ onStatusChange }: GitToolStatusProps) {
  const [showPathDialog, setShowPathDialog] = useState(false);
  const [pathInput, setPathInput] = useState('');

  const { data: status, isLoading, isFetching, refetch } = useGitToolStatus();
  const setGitPath = useSetGitPath();

  const handleSetPath = async () => {
    if (!pathInput.trim()) return;
    await setGitPath.mutateAsync(pathInput.trim());
    setShowPathDialog(false);
    setPathInput('');
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Spinner />
          <span>Checking Git tool...</span>
        </div>
      </Card>
    );
  }

  if (!status) return null;

  return (
    <Card>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                status.available ? 'bg-emerald-500' : 'bg-destructive'
              }`}
            />
            <p className="text-sm font-semibold text-foreground">Git Tool Status</p>
          </div>
          <Button size="xs" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
        </div>

        {status.available ? (
          <div className="space-y-2 text-sm">
            {status.version && (
              <p>
                <span className="text-muted-foreground">Version:</span>{' '}
                <span className="font-medium text-foreground">{status.version}</span>
              </p>
            )}
            {status.path && (
              <p>
                <span className="text-muted-foreground">Path:</span>{' '}
                <span className="font-mono font-medium text-foreground">{status.path}</span>
              </p>
            )}
            {status.config && (
              <div className="space-y-1 pt-1">
                <p className="text-sm font-medium text-muted-foreground">Configuration:</p>
                {status.config['user.name'] && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <span className="text-foreground">{status.config['user.name']}</span>
                  </p>
                )}
                {status.config['user.email'] && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Email:</span>{' '}
                    <span className="text-foreground">{status.config['user.email']}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertTitle>Git tool is not available</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                {status.error && <p>{status.error}</p>}
                {status.suggestion && <p>{status.suggestion}</p>}
                <div className="mt-2 flex gap-2">
                  <Button
                    size="xs"
                    onClick={() => setShowPathDialog(true)}
                    disabled={setGitPath.isPending}
                  >
                    {setGitPath.isPending ? 'Setting...' : 'Set Git Path'}
                  </Button>
                  <Button size="xs" variant="outline" onClick={() => refetch()}>
                    Retry
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {showPathDialog && (
          <div className="flex gap-2">
            <Input
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="C:\\Program Files\\Git\\bin\\git.exe"
              className="flex-1"
            />
            <Button size="sm" onClick={handleSetPath} disabled={setGitPath.isPending}>
              {setGitPath.isPending ? <Spinner /> : 'Save'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowPathDialog(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
