import React, { useEffect, useState } from 'react';
import { gitApi } from '../api/git-api';
import { Callout, Button, Card, Spinner, Text } from '@radix-ui/themes';

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
    // In a real implementation, this would open a file picker
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
        <div className="flex items-center gap-2 p-4">
          <Spinner size="2" />
          <Text>Checking Git tool...</Text>
        </div>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <Card>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                status.available ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <Text weight="bold">Git Tool Status</Text>
          </div>
          <Button size="1" variant="ghost" onClick={checkGitTool}>
            Refresh
          </Button>
        </div>

        {status.available ? (
          <div className="space-y-2">
            {status.version && (
              <div>
                <Text size="2" color="gray">
                  Version:
                </Text>{' '}
                <Text size="2" weight="medium">
                  {status.version}
                </Text>
              </div>
            )}
            {status.path && (
              <div>
                <Text size="2" color="gray">
                  Path:
                </Text>{' '}
                <Text size="2" weight="medium" className="font-mono">
                  {status.path}
                </Text>
              </div>
            )}
            {status.config && (
              <div className="mt-2 space-y-1">
                <Text size="2" color="gray" weight="medium">
                  Configuration:
                </Text>
                <div className="pl-2 space-y-1">
                  {status.config['user.name'] && (
                    <div>
                      <Text size="1" color="gray">
                        Name:
                      </Text>{' '}
                      <Text size="1">{status.config['user.name']}</Text>
                    </div>
                  )}
                  {status.config['user.email'] && (
                    <div>
                      <Text size="1" color="gray">
                        Email:
                      </Text>{' '}
                      <Text size="1">{status.config['user.email']}</Text>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Callout.Root color="red">
            <Callout.Text>
              <div className="space-y-2">
                <Text size="2" weight="bold" as="div">
                  Git tool is not available
                </Text>
                {status.error && (
                  <Text size="2" color="red" as="div">
                    {status.error}
                  </Text>
                )}
                {status.suggestion && (
                  <Text size="2" as="div">{status.suggestion}</Text>
                )}
                <div className="flex gap-2 mt-2">
                  <Button size="1" onClick={handleSetPath} disabled={settingPath}>
                    {settingPath ? 'Setting...' : 'Set Git Path'}
                  </Button>
                  <Button size="1" variant="outline" onClick={checkGitTool}>
                    Retry
                  </Button>
                </div>
              </div>
            </Callout.Text>
          </Callout.Root>
        )}
      </div>
    </Card>
  );
}
