import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  FolderGit2,
  GitBranch,
  GitFork,
  Globe,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { QuickCardsToggle } from '@/components/ui/quick-cards-toggle';
import { StatsCard, STATS_THEMES } from '@/components/ui/stats-card';
import {
  ToolbarRow,
  useToolbarViews,
  normalizeFilterSelection,
  toggleFilterValue,
} from '@/components/ui/toolbar-row';
import {
  DataList,
  ListActionButton,
  ListChip,
  ListDate,
  ListIcon,
  ListText,
} from '@/components/ui/data-list';
import type { DataListItem } from '@/components/ui/data-list';
import { AsyncState } from '@/components/ui/async-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import type { MenuItem } from '@/components/ui/context-menu';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { usePersistentToggle } from '@/shared/hooks/use-persistent-toggle';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { BindRepositoryDialog } from '../components/bind-repository-dialog';
import {
  useRepositories,
  useDeleteRepository,
  useUpdateRepository,
} from '../hooks/use-repositories';
import { useGitToolStatus } from '../hooks/use-git-tool';
import type { GitToolStatusData } from '../api/git-api';
import type { Repository } from '../api/git-api';
import { useProjectList } from '@/modules/project/hooks/use-project-list';

interface RepositoryRow extends DataListItem, Repository {}

const PROVIDER_OPTIONS = ['github', 'gitlab', 'bitbucket'] as const;

export function RepositoryListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const confirmAction = useConfirm();

  const [showBindDialog, setShowBindDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [providers, setProviders] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const stats = usePersistentToggle('repository-list-page.stats');

  const { data: repositories, isLoading, error, refetch } = useRepositories();
  const { data: gitToolStatus, isLoading: isGitLoading } = useGitToolStatus();
  const { data: projects } = useProjectList();
  const deleteRepository = useDeleteRepository();
  const updateRepository = useUpdateRepository();

  const repositoryList = useMemo(() => repositories ?? [], [repositories]);

  // 已保存视图：快照记忆搜索 + 双维度筛选
  const toolbar = useToolbarViews({
    key: 'repository-list-page',
    defaults: [
      {
        id: 'all',
        name: t('git.allRepositories'),
        icon: 'list',
        builtIn: true,
        snapshot: { search: '', providers: [] as string[], projectIds: [] as string[] },
      },
    ],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string;
        providers: string[];
        projectIds: string[];
      }>;
      setSearch(snap.search ?? '');
      setProviders(normalizeFilterSelection(snap.providers));
      setProjectIds(normalizeFilterSelection(snap.projectIds));
    },
  });
  const { updateActiveSnapshot } = toolbar;
  useEffect(() => {
    updateActiveSnapshot({ search, providers, projectIds });
  }, [updateActiveSnapshot, search, providers, projectIds]);

  const overview = useMemo(() => {
    const total = repositoryList.length;
    const withLocal = repositoryList.filter((r) => r.localPath).length;
    const withRemote = repositoryList.filter((r) => r.remoteUrl).length;
    const providerCount = new Set(repositoryList.map((r) => r.provider).filter(Boolean)).size;
    return { total, withLocal, withRemote, providerCount };
  }, [repositoryList]);

  const filteredRepositories = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return repositoryList.filter((repository) => {
      if (providers.length && (!repository.provider || !providers.includes(repository.provider))) {
        return false;
      }
      if (projectIds.length && !projectIds.includes(repository.projectId)) {
        return false;
      }
      if (!normalizedQuery) return true;
      const haystack =
        `${repository.name} ${repository.localPath ?? ''} ${repository.remoteUrl ?? ''} ${repository.defaultBranch ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [search, providers, projectIds, repositoryList]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) + providers.length + projectIds.length;

  const handleDelete = async (repo: Repository) => {
    const ok = await confirmAction({
      title: t('git.deleteRepository'),
      description: t('git.confirmDelete', { name: repo.name }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteRepository.mutateAsync(repo.id);
      toast.success(t('git.repositoryDeleted', { name: repo.name }));
    } catch {
      toast.error(t('git.deleteRepositoryFailed', { name: repo.name }));
    }
  };

  const handleBatchDelete = async (selected: Repository[], close: () => void) => {
    const ok = await confirmAction({
      title: t('git.deleteRepository'),
      description: t('git.batchDeleteConfirm', { count: selected.length }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    close();
    await Promise.allSettled(selected.map((repo) => deleteRepository.mutateAsync(repo.id)));
    setSelectedIds(new Set());
    refetch();
  };

  const handleRefresh = async (repo: Repository) => {
    try {
      await updateRepository.mutateAsync({ repoId: repo.id, dto: {} });
      toast.success(t('git.toast.refreshed'));
      refetch();
    } catch {
      toast.error(t('git.toast.refreshFailed'));
    }
  };

  const rowMenu = (repo: Repository): MenuItem[] => [
    {
      id: 'refresh',
      label: t('common.refresh'),
      icon: <RefreshCw className="size-3.5" />,
      onClick: () => handleRefresh(repo),
    },
    {
      id: 'settings',
      label: t('git.menu.settings'),
      icon: <Settings className="size-3.5" />,
      onClick: () => navigate(`/app/repositories/${repo.id}/settings`),
    },
    {
      id: 'delete',
      label: t('common.delete'),
      icon: <Trash2 className="size-3.5" />,
      destructive: true,
      separatorAfter: true,
      onClick: () => handleDelete(repo),
    },
  ];

  const emptyMessage =
    repositoryList.length === 0 ? (
      <EmptyState
        title={t('git.noRepositories')}
        description={t('git.noRepositoriesHint')}
        action={
          <Button onClick={() => setShowBindDialog(true)}>
            <Plus className="size-3.5" />
            {t('git.bindRepository.title')}
          </Button>
        }
      />
    ) : (
      <EmptyState
        title={t('git.filter.noMatch')}
        description={t('git.filter.noMatchHint')}
      />
    );

  return (
    <PageShell className="overflow-hidden" aiPage={CORE_AI_PAGE_IDS.repositoryList}>
      <PageHeader
        aiId="git.repository-list"
        title={t('git.title')}
        icon={GitBranch}
        iconColor="text-accent-blue"
        metrics={[{ id: 'total', label: t('git.title'), value: filteredRepositories.length }]}
        actions={
          <>
            <QuickCardsToggle
              visible={stats.visible}
              onToggle={stats.toggle}
              aiId="git.repository-list.stats-toggle"
            />
            <HeaderActionButton
              icon={Plus}
              label={t('git.bindRepository.title')}
              onClick={() => setShowBindDialog(true)}
              data-ai-component="git.repository-list.header.bind-repository"
              data-ai-action="git.repository-list.header.bind-repository.click"
              data-ai-role="submit"
            />
          </>
        }
      />

      {/* 统计卡区（默认隐藏，页头幽灵按钮切换） */}
      {stats.visible ? (
        <div className="border-b border-border bg-background px-6 py-4">
          <StatsCard
            items={[
              { key: 'total', value: overview.total, label: t('git.stats.total'), icon: GitBranch, ...STATS_THEMES.blue },
              { key: 'local', value: overview.withLocal, label: t('git.stats.local'), icon: FolderGit2, ...STATS_THEMES.green },
              { key: 'remote', value: overview.withRemote, label: t('git.stats.remote'), icon: Globe, ...STATS_THEMES.purple },
              { key: 'providers', value: overview.providerCount, label: t('git.stats.providers'), icon: GitFork, ...STATS_THEMES.gray },
            ]}
            columns={4}
          />
        </div>
      ) : null}

      <ToolbarRow
        aiId="git.repository-list"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        filterMenu={{
          badge: activeFilterCount,
          search: { value: search, onChange: setSearch, placeholder: t('git.searchRepositories') },
          items: [
            { type: 'label', label: t('git.allProviders') },
            ...PROVIDER_OPTIONS.map((provider) => ({
              type: 'checkbox' as const,
              id: `provider-${provider}`,
              label: provider,
              checked: providers.includes(provider),
              onSelect: () => setProviders((prev) => toggleFilterValue(prev, provider)),
            })),
            { type: 'separator' as const },
            { type: 'label' as const, label: t('git.filter.projects') },
            ...(projects?.items ?? []).map((project) => ({
              type: 'checkbox' as const,
              id: `project-${project.id}`,
              label: project.name,
              checked: projectIds.includes(project.id),
              onSelect: () => setProjectIds((prev) => toggleFilterValue(prev, project.id)),
            })),
          ],
        }}
        extraActions={[
          {
            id: 'git-status',
            icon: GitBranch,
            label: 'Git',
            render: () => (
              <GitStatusPill
                status={gitToolStatus}
                isLoading={isGitLoading}
                onSettingsClick={() => navigate('/app/settings')}
              />
            ),
          },
          {
            id: 'refresh',
            icon: RefreshCw,
            label: t('common.refresh'),
            onClick: () => refetch(),
          },
        ]}
      />

      {/* 内容区：高密列表 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="w-full">
          <AsyncState
            error={
              error
                ? error instanceof Error
                  ? error.message
                  : t('git.loadFailedDesc')
                : null
            }
            onRetry={() => refetch()}
          >
            <DataList
              items={filteredRepositories}
              loading={isLoading}
              emptyMessage={emptyMessage}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onItemClick={(repo) => navigate(`/app/repositories/${repo.id}`)}
              onItemContextMenu={rowMenu}
              selectionActions={(selected, close) => (
                <ListActionButton
                  onClick={() => handleBatchDelete(selected as Repository[], close)}
                >
                  <Trash2 className="size-3.5" />
                  {t('common.delete')}
                </ListActionButton>
              )}
              renderLeading={(repo) => (
                <span className="flex min-w-0 items-center gap-2">
                  <ListIcon icon={FolderGit2} className="text-accent-blue" />
                  <ListText className="font-medium">{repo.name}</ListText>
                  {(repo.localPath || repo.remoteUrl) && (
                    <span
                      className="hidden truncate font-mono text-xs text-muted-foreground lg:inline"
                      title={repo.localPath ?? repo.remoteUrl}
                    >
                      {repo.localPath ?? repo.remoteUrl}
                    </span>
                  )}
                </span>
              )}
              renderTrailing={(repo) => (
                <span className="flex shrink-0 items-center gap-3">
                  {repo.project && <span className="text-xs text-muted-foreground">{repo.project.name}</span>}
                  {repo.provider && <ListChip>{repo.provider}</ListChip>}
                  {repo.defaultBranch && (
                    <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                      <GitBranch className="size-3" />
                      {repo.defaultBranch}
                    </span>
                  )}
                  <ListDate value={repo.updatedAt} />
                </span>
              )}
            />
          </AsyncState>
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

// Git 工具状态胶囊（ToolbarRow 附加动作位）
interface GitStatusPillProps {
  status?: GitToolStatusData;
  isLoading: boolean;
  onSettingsClick: () => void;
}

function GitStatusPill({ status, isLoading, onSettingsClick }: GitStatusPillProps) {
  if (isLoading) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
        <RefreshCw className="size-3 animate-spin" />
        <span>Git…</span>
      </span>
    );
  }
  if (!status) {
    return (
      <button
        type="button"
        onClick={onSettingsClick}
        className="flex items-center gap-1.5 rounded-full bg-accent-red/10 px-2.5 py-1 text-xs font-medium text-accent-red transition-colors hover:bg-accent-red/20"
      >
        <XCircle className="size-3" />
        <span>Git</span>
      </button>
    );
  }
  if (status.available) {
    return (
      <button
        type="button"
        onClick={onSettingsClick}
        title={`Git ${status.version ?? ''}`.trim()}
        className="flex items-center gap-1.5 rounded-full bg-accent-green/10 px-2.5 py-1 text-xs font-medium text-accent-green transition-colors hover:bg-accent-green/20"
      >
        <CheckCircle2 className="size-3" />
        <span>Git</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onSettingsClick}
      title={status.suggestion ?? status.error}
      className={cn(
        'flex items-center gap-1.5 rounded-full bg-accent-yellow/10 px-2.5 py-1 text-xs font-medium',
        'text-accent-yellow transition-colors hover:bg-accent-yellow/20',
      )}
    >
      <AlertTriangle className="size-3" />
      <span>Git</span>
    </button>
  );
}
