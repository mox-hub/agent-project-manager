import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FolderGit2,
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  RefreshCw,
  Settings,
  Trash2,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { RightSidebar, SidebarButton, SidebarButtonGroup } from '@/components/ui/right-sidebar';
import { AsyncState } from '@/components/ui/async-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import { StatusPill } from '@/components/ui/status-pill';
import { SkeletonText } from '@/components/ui/skeleton';
import {
  AutoSizeTextarea,
  CapsuleSelect,
  PropertyRow,
  PropsCard,
} from '@/components/ui/property-panel';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { SubscribeButton } from '@/shared/subscription/subscribe-button';
import { toast } from '@/components/ui/toast';
import { BranchList } from '../components/branch-list';
import { CommitList } from '../components/commit-list';
import { DiffViewer } from '../components/diff-viewer';
import { GitCommandPanel } from '../components/git-command-panel';
import { PullRequestList } from '../components/pull-request-list';
import {
  useRepository,
  useRepositoryStatus,
  useUpdateRepository,
  useDeleteRepository,
} from '../hooks/use-repositories';
import { useWorkingDiff, useStagedDiff } from '../hooks/use-diff';
import { useCommits } from '../hooks/use-commits';
import { useBranches } from '../hooks/use-branches';
import { useSetViewingContext } from '@/shared/viewing-context';
import type { DiffResult } from '../api/git-api';

const PROVIDER_OPTIONS = ['github', 'gitlab', 'bitbucket'].map((value) => ({ value, label: value }));
const ROLE_OPTIONS = ['primary', 'secondary', 'mirror'].map((value) => ({ value, label: value }));

export function RepositoryDetailPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const confirmAction = useConfirm();

  const [activeTab, setActiveTab] = useState<string>('commits');
  const [asideHidden, setAsideHidden] = useState(false);
  const [propsCollapsed, setPropsCollapsed] = useState(false);

  const { data: repository, isLoading, error, refetch } = useRepository(repoId ?? '');
  // 向 AI 助手侧边栏上报「正在查看」上下文（卸载自动清除）
  useSetViewingContext(
    repository ? { type: 'repository', id: repository.id, title: repository.name } : null,
  );
  const { data: status } = useRepositoryStatus(repoId ?? '');
  const { data: workingDiff } = useWorkingDiff(repoId ?? '');
  const { data: stagedDiff } = useStagedDiff(repoId ?? '');
  const { data: commitsData } = useCommits(repoId ?? '', { page: 1, pageSize: 1 });
  const { data: branches } = useBranches(repoId ?? '');
  const updateRepository = useUpdateRepository();
  const deleteRepository = useDeleteRepository();

  const changedCount =
    (workingDiff?.files?.length ?? 0) + (stagedDiff?.files?.length ?? 0);

  const tabs = [
    { value: 'commits', label: t('git.detail.tabCommits'), icon: GitCommit, count: commitsData?.total },
    { value: 'diff', label: t('git.detail.tabChanges'), icon: GitMerge, count: changedCount },
    { value: 'commands', label: t('git.detail.tabCommands'), icon: Settings },
    { value: 'pull-requests', label: t('git.detail.tabPullRequests'), icon: GitPullRequest },
  ];

  // 标题热编辑：1200ms 防抖保存
  const persistTitle = useDebouncedCallback((value: string) => {
    if (!repoId || !value.trim()) return;
    updateRepository
      .mutateAsync({ repoId, dto: { name: value.trim() } })
      .then(() => toast.success(t('git.detail.renamed')))
      .catch(() => toast.error(t('git.detail.renameFailed')));
  }, 1200);

  const updateField = async (patch: Record<string, unknown>) => {
    if (!repoId || !patch) return;
    try {
      await updateRepository.mutateAsync({ repoId, dto: patch });
    } catch {
      toast.error(t('git.detail.updateFailed'));
    }
  };

  const handleDelete = async () => {
    if (!repository || !repoId) return;
    const ok = await confirmAction({
      title: t('git.deleteRepository'),
      description: t('git.confirmDelete', { name: repository.name }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    await deleteRepository.mutateAsync(repoId);
    navigate('/app/repositories');
  };

  const backToList = () => navigate('/app/repositories');

  // Guards：无 ID / 加载中 / 不存在 / 加载失败
  if (!repoId) {
    return (
      <PageShell>
        <EmptyState
          title={t('git.detail.notFound')}
          description={t('git.detail.notFoundHint')}
          action={<Button onClick={backToList}>{t('git.detail.backToList')}</Button>}
        />
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell className="overflow-hidden" aiPage="git.repository-detail">
        <SubPageToolbar
          aiId="git.repository-detail"
          breadcrumbs={[{ label: t('git.title'), to: '/app/repositories' }]}
          sidebar={{ open: !asideHidden, onToggle: () => setAsideHidden((v) => !v) }}
        />
        <div className="flex flex-1 flex-col gap-3 px-6 py-5">
          <SkeletonText lines={2} />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <SkeletonText lines={1} />
              </div>
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <AsyncState
          error={error instanceof Error ? error.message : t('git.detail.loadFailed')}
          onRetry={() => refetch()}
        >
          <span />
        </AsyncState>
      </PageShell>
    );
  }

  if (!repository) {
    return (
      <PageShell>
        <EmptyState
          title={t('git.detail.notFound')}
          description={t('git.detail.notFoundHint')}
          action={<Button onClick={backToList}>{t('git.detail.backToList')}</Button>}
        />
      </PageShell>
    );
  }

  const branchOptions = [
    ...new Set(
      [
        repository.defaultBranch,
        status?.currentBranch,
        ...(branches?.local.map((b) => b.name) ?? []),
      ].filter(Boolean) as string[],
    ),
  ].map((value) => ({ value, label: value }));

  return (
    <PageShell className="overflow-hidden" aiPage="git.repository-detail">
      {/* SubPageToolbar：返回 + 面包屑 + 居中页签 + 侧栏开关 */}
      <SubPageToolbar
        aiId="git.repository-detail"
        onBack={backToList}
        breadcrumbs={[{ label: t('git.title'), to: '/app/repositories' }, { label: repository.name }]}
        tabs={{
          value: activeTab,
          onChange: setActiveTab,
          items: tabs.map((tab) => ({
            value: tab.value,
            label: tab.count != null ? `${tab.label} ${tab.count}` : tab.label,
            icon: tab.icon,
          })),
        }}
        actions={
          <>
            <FavoriteToggle label={repository.name} />
            <SubscribeButton />
            <HeaderActionButton icon={RefreshCw} label={t('common.refresh')} onClick={() => refetch()} />
            <HeaderActionButton
              icon={Settings}
              label={t('git.menu.settings')}
              onClick={() => navigate(`/app/repositories/${repoId}/settings`)}
            />
          </>
        }
        sidebar={{ open: !asideHidden, onToggle: () => setAsideHidden((v) => !v) }}
      />

      {/* Body：主区 + 右栏并列 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 主区（纵向滚动） */}
        <div className="flex flex-1 min-w-0 flex-col overflow-y-auto">
          {/* 标题区：图标框 + 热编辑标题 + 元信息行 */}
          <div className="shrink-0 border-b px-6 pb-3 pt-5">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-blue/10">
                <FolderGit2 className="size-4 text-accent-blue" />
              </span>
              <AutoSizeTextarea
                key={`title-${repository.id}`}
                defaultValue={repository.name}
                rows={1}
                placeholder={t('git.detail.unnamedTitle')}
                onChange={(e) => persistTitle(e.target.value)}
                className="w-full text-lg! font-semibold placeholder:text-muted-foreground/40 focus-visible:ring-0"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <StatusPill tone={status?.clean ? 'success' : 'warning'}>
                {status?.clean ? t('git.detail.clean') : t('git.detail.hasChanges')}
              </StatusPill>
              {status?.currentBranch && (
                <span className="flex items-center gap-1">
                  <GitBranch className="size-3" />
                  <span className="font-mono">{status.currentBranch}</span>
                </span>
              )}
              {(status?.ahead ?? 0) > 0 && <span>↑{status?.ahead}</span>}
              {(status?.behind ?? 0) > 0 && <span>↓{status?.behind}</span>}
              {repository.project && (
                <span className="flex items-center gap-1">
                  <span className="opacity-50">•</span>
                  {repository.project.name}
                </span>
              )}
            </div>
          </div>

          {/* 内容区：随页签切换 */}
          <div className="flex-1 p-6">
            {activeTab === 'commits' && <CommitList repoId={repoId} />}
            {activeTab === 'diff' && (
              <div className="space-y-6">
                <DiffSection
                  title={t('git.detail.stagedChanges')}
                  subtitle={t('git.detail.readyToCommit')}
                  emptyText={t('git.detail.noChanges')}
                  diff={stagedDiff}
                />
                <DiffSection
                  title={t('git.detail.unstagedChanges')}
                  subtitle={t('git.detail.notYetStaged')}
                  emptyText={t('git.detail.noChanges')}
                  diff={workingDiff}
                />
              </div>
            )}
            {activeTab === 'commands' && <GitCommandPanel repoId={repoId} />}
            {activeTab === 'pull-requests' && <PullRequestList repoId={repoId} />}
          </div>
        </div>

        {/* 右侧栏（320px，可收起） */}
        <RightSidebar hidden={asideHidden} width={320}>
          <SidebarButtonGroup className="px-1">
            <SidebarButton
              icon={RefreshCw}
              label={t('common.refresh')}
              onClick={() => refetch()}
            />
            <SidebarButton
              icon={Settings}
              label={t('git.menu.settings')}
              onClick={() => navigate(`/app/repositories/${repoId}/settings`)}
            />
            <SidebarButton
              icon={Trash2}
              label={t('common.delete')}
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            />
          </SidebarButtonGroup>

          {/* 分支面板 */}
          <div className="px-3">
            <BranchList repoId={repoId} />
          </div>

          {/* 属性卡 */}
          <PropsCard
            title={t('git.detail.properties')}
            collapsed={propsCollapsed}
            onToggleCollapse={() => setPropsCollapsed((v) => !v)}
          >
            <PropertyRow icon={<FolderGit2 className="size-3.5" />} label={t('git.detail.project')}>
              <span className="max-w-40 truncate text-xs text-foreground" title={repository.project?.name}>
                {repository.project?.name ?? '—'}
              </span>
            </PropertyRow>
            <PropertyRow icon={<GitMerge className="size-3.5" />} label={t('git.detail.provider')}>
              <CapsuleSelect
                value={repository.provider ?? ''}
                active={!!repository.provider}
                options={PROVIDER_OPTIONS}
                placeholder={t('git.detail.unset')}
                onChange={(v) => updateField({ provider: v || undefined })}
              />
            </PropertyRow>
            <PropertyRow icon={<GitBranch className="size-3.5" />} label={t('git.detail.role')}>
              <CapsuleSelect
                value={repository.role ?? ''}
                active={!!repository.role}
                options={ROLE_OPTIONS}
                placeholder={t('git.detail.unset')}
                onChange={(v) => updateField({ role: v || undefined })}
              />
            </PropertyRow>
            <PropertyRow icon={<GitBranch className="size-3.5" />} label={t('git.detail.defaultBranch')}>
              <CapsuleSelect
                value={repository.defaultBranch ?? ''}
                active={!!repository.defaultBranch}
                options={branchOptions}
                placeholder={t('git.detail.unset')}
                onChange={(v) => updateField({ defaultBranch: v || undefined })}
              />
            </PropertyRow>
            {repository.localPath && (
              <PropertyRow icon={<FolderGit2 className="size-3.5" />} label={t('git.detail.localPath')}>
                <span className="max-w-40 truncate font-mono text-xs text-foreground" title={repository.localPath}>
                  {repository.localPath}
                </span>
              </PropertyRow>
            )}
            {repository.remoteUrl && (
              <PropertyRow icon={<GitPullRequest className="size-3.5" />} label={t('git.detail.remoteUrl')}>
                <span className="max-w-40 truncate font-mono text-xs text-foreground" title={repository.remoteUrl}>
                  {repository.remoteUrl}
                </span>
              </PropertyRow>
            )}
            <PropertyRow icon={<GitCommit className="size-3.5" />} label={t('git.detail.aheadBehind')}>
              <span className="text-xs text-foreground">
                ↑{status?.ahead ?? 0} / ↓{status?.behind ?? 0}
              </span>
            </PropertyRow>
          </PropsCard>
        </RightSidebar>
      </div>
    </PageShell>
  );
}

// Diff 区块组件
function DiffSection({
  title,
  subtitle,
  emptyText,
  diff,
}: {
  title: string;
  subtitle: string;
  emptyText: string;
  diff?: DiffResult;
}) {
  const hasChanges = (diff?.files?.length ?? 0) > 0;

  return (
    <SectionCard title={title} description={subtitle}>
      {hasChanges ? (
        <DiffViewer diff={diff} />
      ) : (
        <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
      )}
    </SectionCard>
  );
}
