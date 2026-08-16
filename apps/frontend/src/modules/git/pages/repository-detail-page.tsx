import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRepository, useRepositoryStatus } from '../hooks/use-repositories';
import { useWorkingDiff, useStagedDiff } from '../hooks/use-diff';
import { useCommits } from '../hooks/use-commits';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { BranchList } from '../components/branch-list';
import { DiffViewer } from '../components/diff-viewer';
import { GitCommandPanel } from '../components/git-command-panel';
import { PullRequestList } from '../components/pull-request-list';
import { useConfirm } from '@/shared/confirm/use-confirm';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  AlertCircle,
  CheckCircle2,
  FolderGit2,
  Globe,
  RefreshCw,
  Settings,
  ArrowLeft,
  Plus,
  GitMerge,
  GitFork,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function RepositoryDetailPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('commits');

  const { data: repository, isLoading, error, refetch } = useRepository(repoId!);
  const { data: status } = useRepositoryStatus(repoId!);
  const { data: workingDiff } = useWorkingDiff(repoId!);
  const { data: stagedDiff } = useStagedDiff(repoId!);
  const { data: commitsData } = useCommits(repoId!, { page: 1, pageSize: 50 });

  const tabs: Array<{
    id: string;
    label: string;
    icon: typeof GitCommit;
    count?: number;
  }> = [
    { id: 'commits', label: 'Commits', icon: GitCommit, count: commitsData?.total },
    { id: 'diff', label: 'Changes', icon: GitMerge, count: (workingDiff?.files?.length ?? 0) + (stagedDiff?.files?.length ?? 0) },
    { id: 'commands', label: 'Commands', icon: Settings },
    { id: 'pull-requests', label: 'Pull Requests', icon: GitPullRequest },
  ] as const;

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
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-xl bg-muted" />
            <p className="text-sm text-muted-foreground">Loading repository...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !repository) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center gap-4 p-12">
          <AlertCircle size={48} className="text-destructive" />
          <div className="text-center">
            <h2 className="mb-2 text-lg font-semibold text-foreground">Repository not found</h2>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unable to load this repository'}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/app/repositories')}>
            <ArrowLeft size={14} />
            Back to Repositories
          </Button>
        </div>
      </PageShell>
    );
  }

  // 计算统计数据
  const stats = {
    commits: commitsData?.total ?? 0,
    changedFiles: (workingDiff?.files?.length ?? 0) + (stagedDiff?.files?.length ?? 0),
    stagedFiles: stagedDiff?.files?.length ?? 0,
    unstagedFiles: workingDiff?.files?.length ?? 0,
  };

  return (
    <PageShell className="overflow-hidden" aiPage="git.repository-detail">
      {/* 面包屑导航 */}
      <nav className="border-b border-border/50 bg-background/50 px-6 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/app/repositories" className="hover:text-foreground hover:underline">
            Repositories
          </Link>
          <span>/</span>
          <span className="text-foreground">{repository.name}</span>
        </div>
      </nav>

      {/* 页面头部 */}
      <section className="border-b border-border bg-gradient-to-b from-muted/30 to-transparent px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* 仓库图标 */}
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 text-2xl shadow-sm">
              {repository.provider === 'github' ? '🐙' : '📦'}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{repository.name}</h1>
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  status?.clean
                    ? 'bg-accent-green/10 text-accent-green'
                    : 'bg-accent-yellow/10 text-accent-yellow'
                )}>
                  {status?.clean ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {status?.clean ? 'Clean' : 'Has changes'}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {repository.project && (
                  <span className="flex items-center gap-1">
                    <GitFork size={14} />
                    {repository.project.name}
                  </span>
                )}
                {repository.localPath && (
                  <span className="flex items-center gap-1 font-mono text-xs">
                    <FolderGit2 size={14} />
                    {repository.localPath}
                  </span>
                )}
              </div>

              {/* 标签 */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {repository.defaultBranch && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-blue/10 px-2.5 py-0.5 text-xs font-medium text-accent-blue">
                    <GitBranch size={10} />
                    {repository.defaultBranch}
                  </span>
                )}
                {repository.provider && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-purple/10 px-2.5 py-0.5 text-xs font-medium text-accent-purple capitalize">
                    {repository.provider}
                  </span>
                )}
                {status?.currentBranch && status.currentBranch !== repository.defaultBranch && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/10 px-2.5 py-0.5 text-xs font-medium text-accent-green">
                    <GitBranch size={10} />
                    {status.currentBranch}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5"
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/app/repositories/${repoId}/settings`)}
              className="gap-1.5"
            >
              <Settings size={14} />
              Settings
            </Button>
          </div>
        </div>
      </section>

      {/* 统计卡片 */}
      <section className="grid grid-cols-2 gap-3 border-b border-border/50 bg-background/50 px-6 py-4 md:grid-cols-4">
        <StatCard
          label="Total Commits"
          value={stats.commits}
          icon={<GitCommit size={18} className="text-accent-blue" />}
          iconBg="bg-accent-blue/10"
          className="bg-background/80"
        />
        <StatCard
          label="Changed Files"
          value={stats.changedFiles}
          icon={<GitMerge size={18} className="text-accent-yellow" />}
          iconBg="bg-accent-yellow/10"
          className="bg-background/80"
        />
        <StatCard
          label="Staged"
          value={stats.stagedFiles}
          icon={<CheckCircle2 size={18} className="text-accent-green" />}
          iconBg="bg-accent-green/10"
          className="bg-background/80"
        />
        <StatCard
          label="Unstaged"
          value={stats.unstagedFiles}
          icon={<AlertCircle size={18} className="text-accent-red" />}
          iconBg="bg-accent-red/10"
          className="bg-background/80"
        />
      </section>

      {/* 标签页导航 */}
      <div className="flex items-center justify-between border-b border-border bg-background px-6">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-colors hover:text-foreground',
                activeTab === tab.id
                  ? 'border-accent-blue text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.count != null && (
                <span className={cn(
                  'ml-1 rounded-full px-1.5 py-0.5 text-xs',
                  activeTab === tab.id
                    ? 'bg-accent-blue/10 text-accent-blue'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：分支列表 */}
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-4">
          <BranchList repoId={repoId} />
        </aside>

        {/* 右侧：内容区 */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'commits' && (
            <div className="p-6">
              <CommitListModern repoId={repoId} />
            </div>
          )}
          {activeTab === 'diff' && (
            <div className="space-y-6 p-6">
              <DiffSection title="Staged Changes" subtitle="Ready to commit" diff={stagedDiff} />
              <DiffSection title="Unstaged Changes" subtitle="Not yet staged" diff={workingDiff} />
            </div>
          )}
          {activeTab === 'commands' && (
            <div className="p-6">
              <GitCommandPanel repoId={repoId} />
            </div>
          )}
          {activeTab === 'pull-requests' && (
            <div className="p-6">
              <PullRequestList repoId={repoId} />
            </div>
          )}
        </main>
      </div>
    </PageShell>
  );
}

// 现代化 Commit 列表组件
function CommitListModern({ repoId }: { repoId: string }) {
  const { data: commitsData, isLoading, isError, error, refetch } = useCommits(repoId, {
    page: 1,
    pageSize: 30,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border border-border bg-background p-4">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load commits'}
        </p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (!commitsData?.items.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <GitCommit size={32} className="mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No commits found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Recent Commits ({commitsData.total})
        </h3>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          <RefreshCw size={14} />
        </Button>
      </div>

      <div className="relative">
        {/* 时间线 */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-3">
          {commitsData.items.map((commit, index) => {
            const additions = commit.files?.reduce((acc, f) => acc + (f.additions || 0), 0) ?? 0;
            const deletions = commit.files?.reduce((acc, f) => acc + (f.deletions || 0), 0) ?? 0;
            const isFirst = index === 0;

            return (
              <div
                key={commit.id}
                className={cn(
                  'relative pl-12',
                  isFirst && 'before:absolute before:-left-[5px] before:top-2 before:h-2.5 before:w-2.5 before:rounded-full before:bg-accent-blue before:ring-4 before:ring-accent-blue/20'
                )}
              >
                {/* 时间线节点 */}
                <div className={cn(
                  'absolute left-3 top-3 h-3.5 w-3.5 rounded-full border-2 bg-background',
                  isFirst ? 'border-accent-blue' : 'border-muted-foreground/30'
                )} />

                <div className={cn(
                  'rounded-lg border bg-background p-4 transition-all',
                  isFirst
                    ? 'border-accent-blue/30 shadow-md shadow-accent-blue/5'
                    : 'border-border hover:border-muted-foreground/30'
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {commit.message}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">{commit.authorName}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(commit.authorDate)}</span>
                      </div>
                    </div>

                    {/* Commit hash */}
                    <div className="shrink-0">
                      <code className="rounded bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground">
                        {commit.hash.slice(0, 7)}
                      </code>
                    </div>
                  </div>

                  {/* 文件变更统计 */}
                  {(additions > 0 || deletions > 0) && (
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      {additions > 0 && (
                        <span className="text-accent-green">+{additions}</span>
                      )}
                      {deletions > 0 && (
                        <span className="text-accent-red">-{deletions}</span>
                      )}
                      {commit.files && commit.files.length > 0 && (
                        <span className="text-muted-foreground">
                          {commit.files.length} file{commit.files.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Diff 区块组件
function DiffSection({ title, subtitle, diff }: { title: string; subtitle: string; diff: any }) {
  const hasChanges = diff?.files?.length > 0;

  return (
    <div className={cn(
      'rounded-xl border p-4',
      hasChanges ? 'border-border bg-background' : 'border-dashed border-border bg-muted/20'
    )}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {diff?.files?.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {diff.files.length} files
          </span>
        )}
      </div>

      {hasChanges ? (
        <DiffViewer diff={diff} />
      ) : (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No changes
        </div>
      )}
    </div>
  );
}

// 相对时间格式化
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
