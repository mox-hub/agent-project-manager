/**
 * 发版列表页（CAP-K-03 驱动型发版，list-page 模板骨架）。
 * ToolbarRow 筛选（项目/状态收进下拉，项目真相源仍在 URL searchParams 深链友好）；
 * 创建草案走对话框（版本可 AI/机械推荐），发布主链路（门禁→审批→执行）在详情页完成。
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  List, Rocket, Sparkles,
  CircleAlert, CircleCheck, CircleDashed, CircleX, Loader2,
  type LucideIcon,
} from 'lucide-react';
import { PageShell } from '@/components/semantic/page-shell';
import { PageHeader, nodeToText } from '@/components/semantic/page-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { HeaderActionButton } from '@/components/semantic/header-action-button';
import { ToolbarRow, useToolbarViews } from '@/components/semantic/toolbar-row';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { DataList, DataListSkeleton, ListChip, ListDate, ListText } from '@/shared/components/data-list';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import type { StatusTone } from '@/shared/status/status-visuals';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/semantic/empty-state';
import { IconStack } from '@/components/semantic/icon-stack';
import { toast } from '@/components/ui/toast';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useProjectMilestones } from '@/modules/issue/hooks/use-project-tasks';
import {
  useCreateRelease,
  useRecommendVersion,
  useReleases,
} from '../hooks/use-releases';
import type { ReleaseStatus } from '../api/release-api';
import { cn } from '@/lib/utils';

export const RELEASE_STATUS_TONE: Record<ReleaseStatus, string> = {
  draft: 'bg-muted/50 text-muted-foreground',
  gated: 'bg-accent-yellow-light text-accent-yellow',
  approved: 'bg-accent-blue-light text-accent-blue',
  publishing: 'bg-accent-yellow-light text-accent-yellow animate-pulse',
  released: 'bg-accent-green-light text-accent-green',
  failed: 'bg-accent-red-light text-accent-red',
};

/** 发版状态 → 行首图标/tone（与任务列表行首 StatusIconFrame 同构；tone 色系对齐 RELEASE_STATUS_TONE） */
const RELEASE_STATUS_VISUALS: Record<ReleaseStatus, { icon: LucideIcon; tone: StatusTone }> = {
  draft: { icon: CircleDashed, tone: 'default' },
  gated: { icon: CircleAlert, tone: 'warning' },
  approved: { icon: CircleCheck, tone: 'info' },
  publishing: { icon: Loader2, tone: 'warning' },
  released: { icon: Rocket, tone: 'success' },
  failed: { icon: CircleX, tone: 'danger' },
};

export const RELEASE_STATUSES = Object.keys(RELEASE_STATUS_TONE) as ReleaseStatus[];

export function statusLabelKey(status: ReleaseStatus): string {
  return `release.status.${status}`;
}

export function ReleaseListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // 项目聚焦统一参数名 ?project（CAP-A-15，与管道筛选器联动）；无参 = 全部项目
  const projectId = searchParams.get('project') ?? '';
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReleaseStatus | 'all'>('all');

  const projectsQuery = useProjectList();
  const projects = projectsQuery.data?.items ?? [];
  const releasesQuery = useReleases(projectId || undefined);
  const releases = useMemo(
    () => releasesQuery.data ?? [],
    [releasesQuery.data],
  );

  // 客户端过滤（搜索 version/name/tag + 状态）
  const filtered = useMemo(
    () =>
      releases.filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (search) {
          const kw = search.toLowerCase();
          const haystack = [`v${r.version}`, r.name ?? '', r.gitTag ?? '', r.project?.name ?? '']
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(kw)) return false;
        }
        return true;
      }),
    [releases, statusFilter, search],
  );

  // 项目筛选的真相源在 URL（深链/详情页返回/管道聚焦），工具栏快照 apply 时写回 URL；
  // 保留其他 searchParams（如管道聚焦未来追加的参数），仅增删 project
  const setProjectFilter = (pid: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (pid) next.set('project', pid);
        else next.delete('project');
        return next;
      },
      { replace: true },
    );
  };

  const toolbar = useToolbarViews({
    key: 'releases-page',
    defaults: [
      {
        id: 'all',
        name: t('common.all'),
        icon: 'list',
        builtIn: true,
        snapshot: { search: '', status: 'all', projectId: '' },
      },
    ],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string;
        status: ReleaseStatus | 'all';
        projectId: string;
      }>;
      setSearch(snap.search ?? '');
      setStatusFilter(snap.status ?? 'all');
      const nextPid = snap.projectId ?? '';
      if (nextPid !== projectId) setProjectFilter(nextPid);
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, status: statusFilter, projectId });
  }, [updateActiveSnapshot, search, statusFilter, projectId]);

  const hasActiveFilters = statusFilter !== 'all' || !!search || !!projectId;
  const openCreate = () => {
    if (!projectId) {
      toast.error(t('release.create.needProject'));
      return;
    }
    setCreateOpen(true);
  };

  return (
    <PageShell className="overflow-hidden" aiPage="releases.list">
      <PageHeader
        aiId="releases.list"
        title={t('release.title')}
        favorites={<FavoriteToggle label={nodeToText(t('release.title')).trim()} aiId="releases.list" />}
        icon={Rocket}
        iconColor="text-accent-green"
        metrics={[{ id: 'total', label: t('release.title'), value: filtered.length }]}
        actions={
          <HeaderActionButton
            icon={Rocket}
            label={t('release.create.open')}
            onClick={openCreate}
          />
        }
      />

      <ToolbarRow
        aiId="releases.list"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        viewStyle={{
          value: 'list',
          onChange: () => {},
          options: [{ value: 'list', label: t('viewDisplay.views.list', 'List'), icon: List }],
        }}
        filterMenu={{
          badge: hasActiveFilters ? 1 : 0,
          search: { value: search, onChange: setSearch, placeholder: t('release.filter.searchPlaceholder') },
          items: [
            { type: 'label', label: t('release.filter.projectGroup') },
            {
              id: 'project-all',
              type: 'checkbox',
              label: t('common.all'),
              checked: !projectId,
              onSelect: () => setProjectFilter(''),
            },
            ...projects.map((p) => ({
              id: `project-${p.id}`,
              type: 'checkbox' as const,
              label: p.name,
              checked: projectId === p.id,
              onSelect: () => setProjectFilter(projectId === p.id ? '' : p.id),
            })),
            { type: 'separator' },
            { type: 'label', label: t('release.filter.statusGroup') },
            {
              id: 'status-all',
              type: 'checkbox',
              label: t('common.all'),
              checked: statusFilter === 'all',
              onSelect: () => setStatusFilter('all'),
            },
            ...RELEASE_STATUSES.map((s) => ({
              id: `status-${s}`,
              type: 'checkbox' as const,
              label: t(statusLabelKey(s)),
              checked: statusFilter === s,
              onSelect: () => setStatusFilter(statusFilter === s ? 'all' : s),
            })),
          ],
        }}
      />

      {/* 内容区：状态分支 = 加载骨架 / 空发版（带创建动作）/ 筛选无结果 / 任务列表基座（DataList）。
          CAP-A-15：无 ?project 时仍发起请求（后端返回全部项目），不再渲染“先选项目”引导 */}
      <div className="flex-1 overflow-auto p-6">
        {releasesQuery.isLoading ? (
          <DataListSkeleton />
        ) : filtered.length === 0 ? (
          releases.length === 0 ? (
            <EmptyState
              variant="page"
              visual={
                <IconStack aria-hidden="true" className="text-accent-purple">
                  <Rocket className="size-4 text-accent-purple" />
                </IconStack>
              }
              title={t('release.empty.none')}
              description={t('release.empty.noneDesc')}
              action={
                <Button size="sm" onClick={openCreate}>
                  <Sparkles className="mr-1 size-3 text-accent-purple" />
                  {t('release.empty.createAction')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={t('release.empty.filtered')}
              description={t('release.empty.filteredDesc')}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                >
                  {t('common.filterClear')}
                </Button>
              }
            />
          )
        ) : (
          <DataList
            items={filtered}
            onItemClick={(r) => navigate(`/app/releases/${r.id}`)}
            renderLeading={(r) => {
              const visual = RELEASE_STATUS_VISUALS[r.status];
              return (
                <>
                  <StatusIconFrame
                    icon={visual.icon}
                    tone={visual.tone}
                    size="list"
                    spin={r.status === 'publishing'}
                    title={t(statusLabelKey(r.status))}
                  />
                  <span className="shrink-0 whitespace-nowrap font-mono text-sm font-medium text-muted-foreground/50">
                    v{r.version}
                  </span>
                  <ListText className="min-w-0 flex-1 text-md font-medium">{r.name || '—'}</ListText>
                </>
              );
            }}
            renderTrailing={(r) => (
              <>
                {/* 尾列流式贴右（与任务列表同口径）：无值不渲染，头像位由状态日期兜底 */}
                {r.project?.name ? (
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{r.project.name}</span>
                ) : null}
                {r.milestone?.name ? (
                  <ListChip className="max-w-27.5 truncate border border-border bg-muted/40 text-muted-foreground">
                    {r.milestone.name}
                  </ListChip>
                ) : null}
                {r.gitTag ? (
                  <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground/50">{r.gitTag}</span>
                ) : null}
                {r.releasedAt ? <ListDate value={r.releasedAt} /> : null}
              </>
            )}
          />
        )}
      </div>

      <CreateReleaseDialog
        open={createOpen}
        projectId={projectId}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => navigate(`/app/releases/${id}`)}
      />
    </PageShell>
  );
}

function CreateReleaseDialog({
  open,
  projectId,
  projects,
  onClose,
  onCreated,
}: {
  open: boolean;
  projectId: string;
  projects: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [pidOverride, setPidOverride] = useState<string | null>(null);
  const pid = pidOverride ?? projectId;
  const [version, setVersion] = useState('');
  const [name, setName] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [basis, setBasis] = useState('');

  const recommend = useRecommendVersion(pid || undefined);
  const create = useCreateRelease();
  // 所属里程碑（CAP-A-16 计划-交付轴）：数据源 = 该项目的 milestones 列表
  const { data: milestones } = useProjectMilestones(pid || undefined);

  const handleRecommend = () => {
    recommend.mutate(undefined, {
      onSuccess: (r) => {
        setVersion(r.recommended);
        setBasis(t('release.create.basis', {
          base: r.base,
          type: t(`release.create.type.${r.releaseType}`),
        }));
      },
      onError: (err) => toast.error((err as Error).message),
    });
  };

  const handleCreate = () => {
    create.mutate(
      {
        projectId: pid,
        version: version.trim(),
        name: name.trim() || undefined,
        milestoneId: milestoneId || null,
      },
      {
        onSuccess: (release) => {
          toast.success(t('release.create.created'));
          onClose();
          onCreated(release.id);
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-dialog-scroll overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('release.create.title')}</DialogTitle>
          <DialogDescription>{t('release.create.desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-content-text">
              {t('release.create.project')}
            </label>
            <SelectField
              value={pid}
              onChange={(e) => setPidOverride(e.target.value)}
              className="h-8 w-full text-xs"
            >
              <option value="">{t('release.filter.pickProject')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </SelectField>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-content-text">
              {t('release.create.version')}
            </label>
            <div className="flex gap-2">
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                className="h-8 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 text-xs"
                disabled={!pid || recommend.isPending}
                onClick={handleRecommend}
              >
                <Sparkles className={cn('mr-1 size-3 text-accent-purple', recommend.isPending && 'animate-pulse')} />
                {t('release.create.recommend')}
              </Button>
            </div>
            {basis ? (
              <p className="text-2xs text-content-text-muted">{basis}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-content-text">
              {t('release.create.nameLabel')}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5" data-testid="release-milestone-select">
            <label className="text-xs font-medium text-content-text">
              {t('release.create.milestoneLabel')}
            </label>
            <SelectField
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              disabled={!pid}
              className="h-8 w-full text-xs"
            >
              <option value="">{t('release.create.milestoneNone')}</option>
              {(milestones ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </SelectField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            disabled={create.isPending || !pid || !version.trim()}
            onClick={handleCreate}
          >
            {t('release.create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
