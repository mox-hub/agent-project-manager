import React, { useState } from 'react';
import {
  useWorkspace,
  useSetWorkspace,
  useValidateWorkspace,
  useCloneRepository,
} from '../hooks/use-workspace';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useConfirm } from '@/shared/confirm/use-confirm';

export interface WorkspaceConfigProps {
  projectId: string;
}

export function WorkspaceConfig({ projectId }: WorkspaceConfigProps) {
  const confirmAction = useConfirm();
  const [localPath, setLocalPath] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [autoClone, setAutoClone] = useState(false);

  const { data: workspace, isLoading, refetch } = useWorkspace(projectId);
  const setWorkspace = useSetWorkspace();
  const validateWorkspace = useValidateWorkspace();
  const cloneRepository = useCloneRepository();

  const handleInitForm = () => {
    if (workspace) {
      setLocalPath(workspace.localPath || '');
      setRemoteUrl(workspace.remoteUrl || '');
      setAutoClone(workspace.autoClone);
    }
  };

  const handleSave = async () => {
    await setWorkspace.mutateAsync({
      projectId,
      dto: {
        localPath: localPath.trim() || undefined,
        remoteUrl: remoteUrl.trim() || undefined,
        autoClone,
      },
    });
  };

  const handleValidate = async () => {
    await validateWorkspace.mutateAsync(projectId);
  };

  const handleClone = async () => {
    const ok = await confirmAction({
      title: '克隆仓库',
      description: `确认从 ${remoteUrl} 克隆到 ${localPath} 吗？如果目录不存在会自动创建。`,
      confirmText: '开始克隆',
      cancelText: '取消',
    });
    if (!ok) return;

    await cloneRepository.mutateAsync({
      projectId,
      dto: { remoteUrl: remoteUrl.trim(), localPath: localPath.trim() },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Spinner />
          <span>Loading workspace configuration...</span>
        </div>
      </Card>
    );
  }

  if (!workspace) {
    return (
      <Card className="p-4">
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>Failed to load workspace</AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Workspace Configuration</p>
          <Button size="xs" variant="ghost" onClick={() => { handleInitForm(); refetch(); }}>
            Refresh
          </Button>
        </div>

        {workspace.validationStatus && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Status:</p>
            <Badge
              variant={
                workspace.validationStatus === 'valid'
                  ? 'secondary'
                  : workspace.validationStatus === 'invalid'
                    ? 'destructive'
                    : 'outline'
              }
            >
              {workspace.validationStatus}
            </Badge>
            {workspace.validatedAt && (
              <p className="text-xs text-muted-foreground">
                (Validated: {new Date(workspace.validatedAt).toLocaleString()})
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Local Path</p>
            <Input
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              placeholder="C:\\path\\to\\workspace or /path/to/workspace"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Local directory path for this project
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Remote URL</p>
            <Input
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git or git@github.com:user/repo.git"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Git repository URL (HTTPS or SSH)
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="autoClone"
              checked={autoClone}
              onChange={(e) => setAutoClone(e.target.checked)}
            />
            Auto-clone when setting remote URL
          </label>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={setWorkspace.isPending}
            >
              {setWorkspace.isPending ? <Spinner /> : 'Save'}
            </Button>
            <Button
              variant="outline"
              onClick={handleValidate}
              disabled={validateWorkspace.isPending}
            >
              {validateWorkspace.isPending ? <Spinner /> : 'Validate'}
            </Button>
            {remoteUrl && localPath && (
              <Button
                variant="secondary"
                onClick={handleClone}
                disabled={cloneRepository.isPending}
              >
                {cloneRepository.isPending ? <Spinner /> : 'Clone Repository'}
              </Button>
            )}
          </div>
        </div>

        {workspace.validationError && (
          <Alert variant="destructive">
            <AlertTitle>Last Validation Error</AlertTitle>
            <AlertDescription>{workspace.validationError}</AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}
