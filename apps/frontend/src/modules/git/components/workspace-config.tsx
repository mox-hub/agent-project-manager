import React, { useEffect, useState } from 'react';
import { gitApi } from '../api/git-api';
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
  const [workspace, setWorkspace] = useState<{
    id: string;
    projectId: string;
    localPath?: string;
    remoteUrl?: string;
    autoClone: boolean;
    validatedAt?: string;
    validationStatus?: 'valid' | 'invalid' | 'unknown';
    validationError?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [localPath, setLocalPath] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [autoClone, setAutoClone] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    status: 'valid' | 'invalid' | 'unknown';
    error?: string;
    suggestion?: string;
    gitRepoDetected?: boolean;
  } | null>(null);

  useEffect(() => {
    loadWorkspace();
  }, [projectId]);

  const loadWorkspace = async () => {
    setLoading(true);
    try {
      const response = await gitApi.getWorkspace(projectId);
      setWorkspace(response.data);
      setLocalPath(response.data.localPath || '');
      setRemoteUrl(response.data.remoteUrl || '');
      setAutoClone(response.data.autoClone);
    } catch (error) {
      console.error('Failed to load workspace', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await gitApi.setWorkspace(projectId, {
        localPath: localPath.trim() || undefined,
        remoteUrl: remoteUrl.trim() || undefined,
        autoClone,
      });
      await loadWorkspace();
    } catch (error: any) {
      alert(`Failed to save workspace: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const response = await gitApi.validateWorkspace(projectId);
      setValidationResult(response.data);
      await loadWorkspace();
    } catch (error: any) {
      setValidationResult({
        valid: false,
        status: 'invalid',
        error: error.message || 'Validation failed',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleClone = async () => {
    if (!remoteUrl.trim() || !localPath.trim()) {
      alert('Please provide both remote URL and local path');
      return;
    }

    const ok = await confirmAction({
      title: '克隆仓库',
      description: `确认从 ${remoteUrl} 克隆到 ${localPath} 吗？如果目录不存在会自动创建。`,
      confirmText: '开始克隆',
      cancelText: '取消',
    });
    if (!ok) {
      return;
    }

    setSaving(true);
    try {
      await gitApi.cloneRepository(projectId, {
        remoteUrl: remoteUrl.trim(),
        localPath: localPath.trim(),
      });
      await loadWorkspace();
      await handleValidate();
    } catch (error: any) {
      alert(`Failed to clone repository: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Spinner />
          <span>Loading workspace configuration...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Workspace Configuration</p>
          <Button size="xs" variant="ghost" onClick={loadWorkspace}>
            Refresh
          </Button>
        </div>

        {workspace && (
          <div className="space-y-2">
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
          </div>
        )}

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Local Path</p>
            <Input
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              placeholder="C:\path\to\workspace or /path/to/workspace"
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
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner /> : 'Save'}
            </Button>
            <Button
              variant="outline"
              onClick={handleValidate}
              disabled={validating}
            >
              {validating ? <Spinner /> : 'Validate'}
            </Button>
            {remoteUrl && localPath && (
              <Button variant="secondary" onClick={handleClone} disabled={saving}>
                Clone Repository
              </Button>
            )}
          </div>
        </div>

        {validationResult && (
          <Alert variant={validationResult.valid ? 'default' : 'destructive'}>
            <AlertTitle>
              {validationResult.valid
                ? 'Workspace is valid'
                : 'Workspace validation failed'}
            </AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                {validationResult.error && <p>{validationResult.error}</p>}
                {validationResult.suggestion && (
                  <p className="text-muted-foreground">{validationResult.suggestion}</p>
                )}
                {validationResult.gitRepoDetected !== undefined && (
                  <p className="text-muted-foreground">
                    Git repository detected: {validationResult.gitRepoDetected ? 'Yes' : 'No'}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {workspace?.validationError && (
          <Alert variant="destructive">
            <AlertTitle>Last Validation Error</AlertTitle>
            <AlertDescription>{workspace.validationError}</AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}

