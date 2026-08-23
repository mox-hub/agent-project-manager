import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGitToolStatus, useSetGitPath } from '../hooks/use-git-tool';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/shared/confirm/use-confirm';
import {
  ArrowLeft,
  Settings,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Terminal,
  User,
  Globe,
  Wrench,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';

export function GitSettingsPage() {
  const navigate = useNavigate();
  const { data: gitStatus, isLoading, refetch } = useGitToolStatus();
  const setGitPath = useSetGitPath();
  const confirmAction = useConfirm();

  const [gitPathInput, setGitPathInput] = useState(gitStatus?.path || 'git');
  const [testing, setTesting] = useState(false);

  const handleTestGit = async () => {
    setTesting(true);
    await refetch();
    setTesting(false);
  };

  const handleSaveGitPath = async () => {
    if (!gitPathInput.trim()) {
      toast.error('Please enter a valid Git path');
      return;
    }
    try {
      await setGitPath.mutateAsync(gitPathInput.trim());
      toast.success('Git path updated successfully');
      await refetch();
    } catch (error) {
      toast.error('Failed to update Git path');
    }
  };

  return (
    <PageShell className="overflow-hidden">
      <PageHeader
        aiId="git.settings"
        title="Git Settings"
        icon={Settings}
        iconColor="text-accent-blue"
        actions={
          <HeaderActionButton
            variant="ghost"
            icon={ArrowLeft}
            label="Back"
            onClick={() => navigate('/app/repositories')}
          />
        }
      />

      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Git 状态卡片 */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Git Status</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestGit}
              disabled={testing}
              className="gap-1.5"
            >
              <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
              {testing ? 'Testing...' : 'Test'}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw size={16} className="animate-spin" />
              <span>Checking Git status...</span>
            </div>
          ) : gitStatus?.available ? (
            <div className="space-y-4">
              <Alert className="border-accent-green/30 bg-accent-green/5">
                <CheckCircle2 className="h-4 w-4 text-accent-green" />
                <AlertTitle className="text-accent-green">Git is available</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Git version {gitStatus.version} is properly configured and ready to use.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Terminal size={12} />
                    Version
                  </p>
                  <p className="font-mono text-sm text-foreground">{gitStatus.version || 'Unknown'}</p>
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Globe size={12} />
                    Executable Path
                  </p>
                  <p className="truncate font-mono text-sm text-foreground" title={gitStatus.path}>
                    {gitStatus.path || 'In PATH'}
                  </p>
                </div>
              </div>

              {gitStatus.config && Object.keys(gitStatus.config).length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <User size={12} />
                    Git Configuration
                  </p>
                  <div className="max-h-40 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs">
                    {Object.entries(gitStatus.config).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-accent-blue">{key}</span>
                        <span className="text-muted-foreground">=</span>
                        <span className="text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Git is not available</AlertTitle>
              <AlertDescription>
                {gitStatus?.error || 'Git executable could not be found.'}
                {gitStatus?.suggestion && (
                  <p className="mt-1 text-xs">{gitStatus.suggestion}</p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </Card>

        {/* Git 路径配置 */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Wrench size={16} className="text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Git Path Configuration</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Git Executable Path</label>
              <div className="flex gap-2">
                <Input
                  value={gitPathInput}
                  onChange={(e) => setGitPathInput(e.target.value)}
                  placeholder="git or C:\Program Files\Git\bin\git.exe"
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleSaveGitPath}
                  disabled={setGitPath.isPending}
                  className="shrink-0"
                >
                  {setGitPath.isPending ? <RefreshCw size={14} className="animate-spin" /> : 'Save'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the path to the Git executable. Use "git" to search in PATH, or specify the full path.
              </p>
            </div>

            <div className="rounded-lg border border-dashed border-border p-4">
              <p className="text-xs font-medium text-muted-foreground">Common Git Paths</p>
              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  onClick={() => setGitPathInput('git')}
                  className="block w-full rounded px-2 py-1 text-left font-mono text-xs hover:bg-muted/50"
                >
                  git (system PATH)
                </button>
                <button
                  type="button"
                  onClick={() => setGitPathInput('C:\\Program Files\\Git\\bin\\git.exe')}
                  className="block w-full rounded px-2 py-1 text-left font-mono text-xs hover:bg-muted/50"
                >
                  C:\Program Files\Git\bin\git.exe
                </button>
                <button
                  type="button"
                  onClick={() => setGitPathInput('C:\\Program Files (x86)\\Git\\bin\\git.exe')}
                  className="block w-full rounded px-2 py-1 text-left font-mono text-xs hover:bg-muted/50"
                >
                  C:\Program Files (x86)\Git\bin\git.exe
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
