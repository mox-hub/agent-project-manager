import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRepository, useUpdateRepository, useDeleteRepository } from '../hooks/use-repositories';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { ArrowLeft, Settings, Trash2 } from 'lucide-react';

export function RepositorySettingsPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const confirmAction = useConfirm();

  const { data: repository, isLoading, error } = useRepository(repoId!);
  const updateRepository = useUpdateRepository();
  const deleteRepository = useDeleteRepository();

  const [name, setName] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('');
  const [provider, setProvider] = useState('');

  useEffect(() => {
    if (repository) {
      const timer = setTimeout(() => {
        setName(repository.name);
        setLocalPath(repository.localPath || '');
        setRemoteUrl(repository.remoteUrl || '');
        setDefaultBranch(repository.defaultBranch || '');
        setProvider(repository.provider || '');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [repository]);

  const handleSave = async () => {
    if (!repoId || !name.trim()) return;
    await updateRepository.mutateAsync({
      repoId,
      dto: {
        name: name.trim(),
        localPath: localPath.trim() || undefined,
        remoteUrl: remoteUrl.trim() || undefined,
        defaultBranch: defaultBranch.trim() || undefined,
        provider: provider.trim() || undefined,
      },
    });
  };

  const handleDelete = async () => {
    if (!repoId) return;
    const ok = await confirmAction({
      title: 'Delete Repository',
      description: `确定要删除仓库 "${repository?.name}" 吗？此操作不可撤销。`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (!ok) return;
    await deleteRepository.mutateAsync(repoId);
    navigate('/app/repositories');
  };

  if (!repoId) {
    return (
      <PageShell>
        <div className="flex items-center gap-2 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/repositories')}>
            <ArrowLeft size={16} />
          </Button>
          <span className="text-sm text-destructive">Invalid repository ID</span>
        </div>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Loading..." aiId="" />
        <div className="flex items-center justify-center p-12">
          <Spinner />
        </div>
      </PageShell>
    );
  }

  if (error || !repository) {
    return (
      <PageShell>
        <div className="flex items-center gap-2 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/repositories')}>
            <ArrowLeft size={16} />
          </Button>
          <span className="text-sm text-destructive">Repository not found</span>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="overflow-hidden">
      <PageHeader
        aiId="git.repository-settings"
        title="Repository Settings"
        description={`Configure settings for ${repository.name}`}
        icon={Settings}
        iconColor="text-accent-blue"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(`/app/repositories/${repoId}`)}>
            <ArrowLeft size={16} />
          </Button>
        }
      />

      <div className="mx-auto max-w-2xl p-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Repository Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-repository"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Local Path</label>
              <Input
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="E:/code/my-repo"
              />
              <p className="text-xs text-muted-foreground">
                Local filesystem path where this repository is located
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Remote URL</label>
              <Input
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="git@github.com:user/repo.git"
              />
              <p className="text-xs text-muted-foreground">
                Git remote repository URL (SSH or HTTPS)
              </p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-foreground">Default Branch</label>
                <Input
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-foreground">Provider</label>
                <Input
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="github, gitlab, etc."
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteRepository.isPending}
              >
                <Trash2 size={14} className="mr-1" />
                {deleteRepository.isPending ? <Spinner /> : 'Delete Repository'}
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateRepository.isPending || !name.trim()}
              >
                {updateRepository.isPending ? <Spinner /> : 'Save Changes'}
              </Button>
            </div>

            {updateRepository.isSuccess && (
              <Alert>
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>Repository settings updated successfully.</AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
