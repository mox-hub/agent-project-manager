import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useWorkspace,
  useSetWorkspace,
  useCloneRepository,
} from '../hooks/use-workspace';
import { gitApi } from '../api/git-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { PathInput } from '@/components/semantic/path-input';
import { useConfirm } from '@/shared/confirm/use-confirm';

export interface WorkspaceConfigProps {
  projectId: string;
}

export function WorkspaceConfig({ projectId }: WorkspaceConfigProps) {
  const confirmAction = useConfirm();
  const { t } = useTranslation();
  const [localPath, setLocalPath] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [autoClone, setAutoClone] = useState(false);

  const { data: workspace, isLoading, refetch } = useWorkspace(projectId);
  const setWorkspace = useSetWorkspace();
  const cloneRepository = useCloneRepository();

  // 自动加载已存配置（DB 为真相源）——远端值变化时回填表单
  useEffect(() => {
    if (workspace) {
      setLocalPath(workspace.localPath || '');
      setRemoteUrl(workspace.remoteUrl || '');
      setAutoClone(workspace.autoClone);
    }
  }, [workspace]);

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

  const handleClone = async () => {
    const ok = await confirmAction({
      title: t('git.workspace.cloneConfirmTitle'),
      description: t('git.workspace.cloneConfirmDesc', {
        remote: remoteUrl,
        path: localPath,
      }),
      confirmText: t('git.workspace.cloneConfirmConfirm'),
      cancelText: t('git.workspace.cloneConfirmCancel'),
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
          <span>{t('git.workspace.loading')}</span>
        </div>
      </Card>
    );
  }

  if (!workspace) {
    return (
      <Card className="p-4">
        <Alert variant="destructive">
          <AlertTitle>{t('git.workspace.loadFailed')}</AlertTitle>
          <AlertDescription>{t('git.workspace.loadFailedDesc')}</AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            {t('git.workspace.title')}
          </p>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              refetch();
            }}
          >
            {t('git.workspace.refresh')}
          </Button>
        </div>

        <div className="space-y-3">
          <PathInput
            id="workspace-local-path"
            label={t('git.workspace.localPath')}
            description={t('git.workspace.localPathDesc')}
            placeholder="C:\\path\\to\\workspace or /path/to/workspace"
            value={localPath}
            onChange={setLocalPath}
            inputClassName="font-mono text-sm"
            savedStatus={workspace.validationStatus ?? null}
            savedValidatedAt={workspace.validatedAt ?? null}
            onValidate={(path) => gitApi.validateWorkspacePath(projectId, path)}
            onCreate={(path) => gitApi.ensureWorkspaceDirectory(projectId, path)}
          />

          <div>
            <p className="text-sm font-medium text-foreground">
              {t('git.workspace.remoteUrl')}
            </p>
            <Input
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git or git@github.com:user/repo.git"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('git.workspace.remoteUrlDesc')}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="autoClone"
              checked={autoClone}
              onChange={(e) => setAutoClone(e.target.checked)}
            />
            {t('git.workspace.autoClone')}
          </label>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={setWorkspace.isPending}
            >
              {setWorkspace.isPending ? <Spinner /> : t('git.workspace.save')}
            </Button>
            {remoteUrl && localPath && (
              <Button
                variant="secondary"
                onClick={handleClone}
                disabled={cloneRepository.isPending}
              >
                {cloneRepository.isPending ? <Spinner /> : t('git.workspace.clone')}
              </Button>
            )}
          </div>
        </div>

        {workspace.validationError && (
          <Alert variant="destructive">
            <AlertTitle>{t('git.workspace.lastError')}</AlertTitle>
            <AlertDescription>{workspace.validationError}</AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}
