import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRepository, useRepositoryStatus } from '../hooks/use-repositories';
import { GitToolStatusPanel } from '../components/git-tool-status';
import { BranchList } from '../components/branch-list';
import { CommitList } from '../components/commit-list';
import { DiffViewer } from '../components/diff-viewer';
import { GitCommandPanel } from '../components/git-command-panel';
import { PullRequestList } from '../components/pull-request-list';
import { useWorkingDiff, useStagedDiff } from '../hooks/use-diff';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function RepositoryDetailPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('commits');

  const { data: repository, isLoading, error } = useRepository(repoId!);
  const { data: status } = useRepositoryStatus(repoId!);
  const { data: workingDiff } = useWorkingDiff(repoId!);
  const { data: stagedDiff } = useStagedDiff(repoId!);

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
        <PageHeader title="Loading..." description="" aiId="" />
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
      <div className="flex items-center gap-3 border-b border-border bg-background px-6 py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/repositories')}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[22px] font-semibold text-foreground">{repository.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {repository.defaultBranch && (
              <Badge variant="outline">{repository.defaultBranch}</Badge>
            )}
            {repository.provider && (
              <Badge variant="secondary">{repository.provider}</Badge>
            )}
            {status?.currentBranch && (
              <Badge variant="outline" className="text-accent-blue">
                {status.currentBranch}
              </Badge>
            )}
            {status && !status.clean && (
              <Badge variant="destructive" className="text-xs">
                {status.changedFiles.length} uncommitted change(s)
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-full overflow-hidden">
        {/* Left sidebar: branches + tool status */}
        <div className="flex w-72 flex-shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-4">
          <GitToolStatusPanel />
          <BranchList repoId={repoId} />
        </div>

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col">
            <div className="border-b border-border px-4">
              <TabsList>
                <TabsTrigger value="commits">Commits</TabsTrigger>
                <TabsTrigger value="diff">Diff</TabsTrigger>
                <TabsTrigger value="commands">Commands</TabsTrigger>
                <TabsTrigger value="pull-requests">Pull Requests</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <TabsContent value="commits" className="mt-0">
                <CommitList repoId={repoId} />
              </TabsContent>

              <TabsContent value="diff" className="mt-0 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Working Tree (Unstaged)</p>
                  <DiffViewer diff={workingDiff ?? null} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Staged Changes</p>
                  <DiffViewer diff={stagedDiff ?? null} />
                </div>
              </TabsContent>

              <TabsContent value="commands" className="mt-0">
                <GitCommandPanel repoId={repoId} />
              </TabsContent>

              <TabsContent value="pull-requests" className="mt-0">
                <PullRequestList repoId={repoId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </PageShell>
  );
}
