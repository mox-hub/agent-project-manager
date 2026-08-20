import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { RepositoryCard } from '../components/repository-card';
import { BindRepositoryDialog } from '../components/bind-repository-dialog';
import { useRepositories, useDeleteRepository, useUpdateRepository } from '../hooks/use-repositories';
import { useGitToolStatus } from '../hooks/use-git-tool';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useConfirm } from '@/shared/confirm/use-confirm';
import {
  GitBranch,
  AlertTriangleIcon,
  Plus,
  FolderGit2,
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function RepositoryListPage() {
  const navigate = useNavigate();
  const [showBindDialog, setShowBindDialog] = useState(false);
  const [query, setQuery] = useState('');

  const { data: repositories, isLoading, error, refetch } = useRepositories();
  const { data: gitToolStatus, isLoading: isGitLoading } = useGitToolStatus();
  const { data: projects } = useProjectList();
  const deleteRepository = useDeleteRepository();
  const updateRepository = useUpdateRepository();
  const confirmAction = useConfirm();

  const repositoryList = useMemo(() => repositories ?? [], [repositories]);

  // 计算统计信息
  const stats = useMemo(() => {
    const total = repositoryList.length;
    const withLocal = repositoryList.filter(r => r.localPath).length;
    const withRemote = repositoryList.filter(r => r.remoteUrl).length;
    const providers = new Set(repositoryList.map(r => r.provider).filter(Boolean)).size;
    return { total, withLocal, withRemote, providers };
  }, [repositoryList]);

  // 过滤
  const filteredRepositories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return repositoryList.filter((repository) => {
      if (!normalizedQuery) {
        return true;
      }
      const haystack = `${repository.name} ${repository.localPath ?? ''} ${repository.remoteUrl ?? ''} ${repository.defaultBranch ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, repositoryList]);

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirmAction({
      title: 'Delete Repository',
      description: `确定要删除仓库 "${name}" 吗？此操作不可撤销。`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteRepository.mutateAsync(id);
      toast.success(`仓库 "${name}" 已删除`);
    } catch {
      toast.error(`删除仓库 "${name}" 失败`);
    }
  };

  const handleRefresh = async (id: string) => {
    try {
      await updateRepository.mutateAsync({ repoId: id, dto: {} });
      toast.success('仓库状态已刷新');
      refetch();
    } catch {
      toast.error('刷新失败');
    }
  };

  return (
    <PageShell className="overflow-hidden" aiPage={CORE_AI_PAGE_IDS.repositoryList}>
      <PageHeader
        aiId="git.repository-list"
        title="Git Repositories"
        icon={GitBranch}
        iconColor="text-accent-blue"
        actions={
          <HeaderActionButton
            icon={Plus}
            label="Bind Repository"
            onClick={() => setShowBindDialog(true)}
            data-ai-component="git.repository-list.header.bind-repository"
            data-ai-action="git.repository-list.header.bind-repository.click"
            data-ai-role="submit"
          />
        }
      />

      {error && (
        <div className="px-6 pt-4">
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>无法加载仓库列表，请稍后重试。</AlertDescription>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              重试
            </Button>
          </Alert>
        </div>
      )}

      {/* 搜索和过滤栏 */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-6 py-2.5">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search repositories..."
            className="h-8 pl-8"
            data-ai-component="git.repository-list.search"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Git 状态胶囊和刷新按钮 - 靠右 */}
        <div className="ml-auto flex items-center gap-2">
          <GitStatusPill
            status={gitToolStatus}
            isLoading={isGitLoading}
            onSettingsClick={() => navigate('/app/settings')}
          />

          <Button
            variant="outline"
            size="icon-sm"
            className="h-8 w-8 rounded-full"
            onClick={() => refetch()}
            title="Refresh"
          >
            <RefreshCw size={16} className={cn(isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* 主内容区域：侧边栏 + 仓库列表 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏统计 */}
        <aside className="hidden w-[280px] shrink-0 border-r border-border bg-background p-4 lg:block overflow-auto">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overview
            </h3>

            {/* 统计卡片 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-blue/10">
                    <GitBranch size={16} className="text-accent-blue" />
                  </div>
                  <span className="text-sm text-muted-foreground">Total Repos</span>
                </div>
                <span className="text-lg font-semibold text-foreground">{stats.total}</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-green/10">
                    <FolderGit2 size={16} className="text-accent-green" />
                  </div>
                  <span className="text-sm text-muted-foreground">Local Paths</span>
                </div>
                <span className="text-lg font-semibold text-foreground">{stats.withLocal}</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-purple/10">
                    <Globe size={16} className="text-accent-purple" />
                  </div>
                  <span className="text-sm text-muted-foreground">Remote URLs</span>
                </div>
                <span className="text-lg font-semibold text-foreground">{stats.withRemote}</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-orange/10">
                    <GitBranch size={16} className="text-accent-orange" />
                  </div>
                  <span className="text-sm text-muted-foreground">Providers</span>
                </div>
                <span className="text-lg font-semibold text-foreground">{stats.providers}</span>
              </div>
            </div>

            {/* 项目列表 */}
            {projects?.items && projects.items.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Projects
                </h4>
                {projects.items.map((project) => {
                  const repoCount = repositoryList.filter(r => r.projectId === project.id).length;
                  return (
                    <div
                      key={project.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <span className="truncate text-sm text-foreground">{project.name}</span>
                      {repoCount > 0 && (
                        <span className="rounded-full bg-accent-blue/10 px-2 py-0.5 text-xs font-medium text-accent-blue">
                          {repoCount}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* 仓库列表 */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-border bg-muted/50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 rounded bg-muted" />
                      <div className="h-3 w-16 rounded bg-muted" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <div className="h-5 w-16 rounded-full bg-muted" />
                    <div className="h-5 w-16 rounded-full bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRepositories.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredRepositories.map((repo) => (
                <RepositoryCard
                  key={repo.id}
                  repository={repo}
                  onDelete={(id) => handleDelete(id, repo.name)}
                  onRefresh={(id) => handleRefresh(id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No repositories yet"
              description="Bind your first Git repository to start tracking your code."
              action={
                <Button onClick={() => setShowBindDialog(true)}>
                  <Plus size={14} />
                  Bind Repository
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Bind Repository Dialog */}
      {projects && projects.items.length > 0 && (
        <BindRepositoryDialog
          open={showBindDialog}
          onOpenChange={setShowBindDialog}
          projectId={projects.items[0]?.id}
          onSuccess={() => refetch()}
        />
      )}
    </PageShell>
  );
}

// Git 状态胶囊组件
interface GitToolStatusData {
  available: boolean;
  version?: string;
  path?: string;
  config?: Record<string, string>;
  error?: string;
  suggestion?: string;
}

interface GitStatusPillProps {
  status?: GitToolStatusData;
  isLoading: boolean;
  onSettingsClick: () => void;
}

function GitStatusPill({ status, isLoading, onSettingsClick }: GitStatusPillProps) {
  const content = isLoading ? (
    <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
      <RefreshCw size={12} className="animate-spin" />
      <span>Checking Git...</span>
    </div>
  ) : !status ? (
    <button
      onClick={onSettingsClick}
      className="flex items-center gap-2 rounded-full bg-accent-red/10 px-3 py-1.5 text-xs font-medium text-accent-red transition-colors hover:bg-accent-red/20"
    >
      <XCircle size={12} />
      <span>Git Not Configured</span>
      <ChevronRight size={12} />
    </button>
  ) : status.available ? (
    <button
      onClick={onSettingsClick}
      className="flex items-center gap-2 rounded-full bg-accent-green/10 px-3 py-1.5 text-xs font-medium text-accent-green transition-colors hover:bg-accent-green/20"
    >
      <CheckCircle2 size={12} />
      <span>Git {status.version || 'Ready'}</span>
      <ChevronRight size={12} />
    </button>
  ) : (
    <button
      onClick={onSettingsClick}
      className="flex items-center gap-2 rounded-full bg-accent-yellow/10 px-3 py-1.5 text-xs font-medium text-accent-yellow transition-colors hover:bg-accent-yellow/20"
      title={status.suggestion || status.error}
    >
      <AlertTriangleIcon size={12} />
      <span>Git Error</span>
      <ChevronRight size={12} />
    </button>
  );

  return content;
}
