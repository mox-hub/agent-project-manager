import React, { useEffect, useState } from 'react';
import { gitApi } from '../api/git-api';
import {
  Button,
  Card,
  Text,
  TextField,
  Callout,
  Spinner,
  Badge,
} from '@radix-ui/themes';

export interface WorkspaceConfigProps {
  projectId: string;
}

export function WorkspaceConfig({ projectId }: WorkspaceConfigProps) {
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

    if (
      !confirm(
        `Clone repository from ${remoteUrl} to ${localPath}? This will create the directory if it doesn't exist.`,
      )
    ) {
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
        <div className="flex items-center gap-2 p-4">
          <Spinner size="2" />
          <Text>Loading workspace configuration...</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Text weight="bold">Workspace Configuration</Text>
          <Button size="1" variant="ghost" onClick={loadWorkspace}>
            Refresh
          </Button>
        </div>

        {workspace && (
          <div className="space-y-2">
            {workspace.validationStatus && (
              <div className="flex items-center gap-2">
                <Text size="2" color="gray">
                  Status:
                </Text>
                <Badge
                  color={
                    workspace.validationStatus === 'valid'
                      ? 'green'
                      : workspace.validationStatus === 'invalid'
                      ? 'red'
                      : 'gray'
                  }
                  size="1"
                >
                  {workspace.validationStatus}
                </Badge>
                {workspace.validatedAt && (
                  <Text size="1" color="gray">
                    (Validated:{' '}
                    {new Date(workspace.validatedAt).toLocaleString()})
                  </Text>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Text size="2" weight="medium">
              Local Path
            </Text>
            <TextField.Root
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              placeholder="C:\path\to\workspace or /path/to/workspace"
            />
            <Text size="1" color="gray" className="mt-1 block">
              Local directory path for this project
            </Text>
          </div>

          <div>
            <Text size="2" weight="medium">
              Remote URL
            </Text>
            <TextField.Root
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git or git@github.com:user/repo.git"
            />
            <Text size="1" color="gray" className="mt-1 block">
              Git repository URL (HTTPS or SSH)
            </Text>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoClone"
              checked={autoClone}
              onChange={(e) => setAutoClone(e.target.checked)}
            />
            <label htmlFor="autoClone" className="text-sm">
              Auto-clone when setting remote URL
            </label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size="2" /> : 'Save'}
            </Button>
            <Button
              variant="outline"
              onClick={handleValidate}
              disabled={validating}
            >
              {validating ? <Spinner size="2" /> : 'Validate'}
            </Button>
            {remoteUrl && localPath && (
              <Button variant="soft" onClick={handleClone} disabled={saving}>
                Clone Repository
              </Button>
            )}
          </div>
        </div>

        {validationResult && (
          <Callout.Root
            color={validationResult.valid ? 'green' : 'red'}
            className="mt-4"
          >
            <Callout.Text>
              <div className="space-y-2">
                <Text size="2" weight="bold" as="div">
                  {validationResult.valid
                    ? 'Workspace is valid'
                    : 'Workspace validation failed'}
                </Text>
                {validationResult.error && (
                  <Text size="2" as="div">{validationResult.error}</Text>
                )}
                {validationResult.suggestion && (
                  <Text size="2" color="gray" as="div">
                    {validationResult.suggestion}
                  </Text>
                )}
                {validationResult.gitRepoDetected !== undefined && (
                  <Text size="2" color="gray" as="div">
                    Git repository detected: {validationResult.gitRepoDetected ? 'Yes' : 'No'}
                  </Text>
                )}
              </div>
            </Callout.Text>
          </Callout.Root>
        )}

        {workspace?.validationError && (
          <Callout.Root color="red" className="mt-4">
            <Callout.Text>
              <Text size="2" weight="bold" as="div">Last Validation Error</Text>
              <Text size="2" as="div">{workspace.validationError}</Text>
            </Callout.Text>
          </Callout.Root>
        )}
      </div>
    </Card>
  );
}
