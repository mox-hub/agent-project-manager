import React, { useEffect, useState } from 'react';
import { gitApi } from '../api/git-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export interface GitToolStatusProps {
  onStatusChange?: (available: boolean) => void;
}

export function GitToolStatus({ onStatusChange }: GitToolStatusProps) {
  const [status, setStatus] = useState<{
    available: boolean;
    version?: string;
    path?: string;
    config?: Record<string, string>;
    error?: string;
    suggestion?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingPath, setSettingPath] = useState(false);

  useEffect(() => {
    checkGitTool();
  }, []);

  const checkGitTool = async () => {
    setLoading(true);
    try {
      const response = await gitApi.checkGitTool();
      setStatus(response.data);
      onStatusChange?.(response.data.available);
    } catch (error) {
      console.error('Failed to check Git tool', error);
      setStatus({
        available: false,
        error: 'Failed to check Git tool',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPath = async () => {
    const path = prompt('Enter Git executable path:');
    if (!path) return;

    setSettingPath(true);
    try {
      await gitApi.setGitPath(path);
      await checkGitTool();
    } catch (error: any) {
      alert(`Failed to set Git path: ${error.message}`);
    } finally {
      setSettingPath(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 p-4 text-sm text-content-text-secondary">
          <Spinner />
          <span>Checking Git tool...</span>
        </div>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

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
            <p className="text-sm font-semibold text-content-text">Git Tool Status</p>
          </div>
          <Button size="xs" variant="ghost" onClick={checkGitTool}>
            Refresh
          </Button>
        </div>

        {status.available ? (
          <div className="space-y-2 text-sm">
            {status.version && (
              <p>
                <span className="text-content-text-secondary">Version:</span>{' '}
                <span className="font-medium text-content-text">{status.version}</span>
              </p>
            )}
            {status.path && (
              <p>
                <span className="text-content-text-secondary">Path:</span>{' '}
                <span className="font-mono font-medium text-content-text">{status.path}</span>
              </p>
            )}
            {status.config && (
              <div className="space-y-1 pt-1">
                <p className="text-sm font-medium text-content-text-secondary">Configuration:</p>
                {status.config['user.name'] && (
                  <p className="text-xs">
                    <span className="text-content-text-secondary">Name:</span>{' '}
                    <span className="text-content-text">{status.config['user.name']}</span>
                  </p>
                )}
                {status.config['user.email'] && (
                  <p className="text-xs">
                    <span className="text-content-text-secondary">Email:</span>{' '}
                    <span className="text-content-text">{status.config['user.email']}</span>
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
                  <Button size="xs" onClick={handleSetPath} disabled={settingPath}>
                    {settingPath ? 'Setting...' : 'Set Git Path'}
                  </Button>
                  <Button size="xs" variant="outline" onClick={checkGitTool}>
                    Retry
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}
