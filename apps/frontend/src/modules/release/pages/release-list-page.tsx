/**
 * 发版列表页（CAP-K-03 驱动型发版，list-page 模板骨架）。
 * ToolbarRow 筛选（项目/状态收进下拉，项目真相源仍在 URL searchParams 深链友好）；
 * 创建草案走对话框（版本可 AI/机械推荐），发布主链路（门禁→审批→执行）在详情页完成。
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { List, Rocket, Sparkles } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { IconStack } from '@/components/ui/icon-stack';
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
          const haystack = [`v${r.version}`, r.name ?? '', r.gitTag ?? '']
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

      {/* 内容区：状态分支 = 加载骨架 / 空发版（带创建动作）/ 筛选无结果 / 表格。
          CAP-A-15：无 ?project 时仍发起请求（后端返回全部项目），不再渲染“先选项目”引导 */}
      <div className="flex-1 overflow-auto p-6">
        {releasesQuery.isLoading ? (
          <SkeletonTable rows={4} columns={5} />
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
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">{t('release.table.version')}</TableHead>
                    <TableHead>{t('release.table.name')}</TableHead>
                    <TableHead className="w-28">{t('release.table.status')}</TableHead>
                    <TableHead className="w-36">{t('release.table.milestone')}</TableHead>
                    <TableHead className="w-32">{t('release.table.tag')}</TableHead>
                    <TableHead className="w-40">{t('release.table.releasedAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/app/releases/${r.id}`)}
                    >
                      <TableCell className="font-mono text-xs font-medium">
                        v{r.version}
                      </TableCell>
                      <TableCell className="text-xs">{r.name || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn('text-10', RELEASE_STATUS_TONE[r.status])}
                        >
                          {t(statusLabelKey(r.status))}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-content-text-secondary">
                        {r.milestone?.name || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-11 text-content-text-muted">
                        {r.gitTag || '—'}
                      </TableCell>
                      <TableCell className="text-11 text-content-text-muted">
                        {r.releasedAt
                          ? new Date(r.releasedAt).toLocaleDateString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('release.create.title')}</DialogTitle>
          <DialogDescription>{t('release.create.desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-content-text">
              {t('release.create.project')}
            </label>
            <NativeSelect
              value={pid}
              onChange={(e) => setPidOverride(e.target.value)}
              className="h-8 w-full text-xs"
            >
              <option value="">{t('release.filter.pickProject')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </NativeSelect>
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
              <p className="text-11 text-content-text-muted">{basis}</p>
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
            <NativeSelect
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              disabled={!pid}
              className="h-8 w-full text-xs"
            >
              <option value="">{t('release.create.milestoneNone')}</option>
              {(milestones ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </NativeSelect>
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
