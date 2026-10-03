/**
 * 发版列表页（CAP-K-03 驱动型发版，list-page 模板骨架；批三发版中心扩展）。
 * ToolbarRow 筛选（项目/状态/平台/通道收进下拉，项目真相源仍在 URL searchParams 深链友好）；
 * 创建草案走对话框（版本可 AI/机械推荐，计划时间/平台/热修基线批三补齐），
 * 发布主链路（门禁→审批→执行）在详情页完成；
 * 内容区顶部「即将发版」区：未发布且有计划时间的发版按计划升序预告。
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { List, Rocket, Sparkles } from 'lucide-react';
import { DomainEventTypes } from '@apm/shared/events/domain-events';
import { PageShell } from '@/components/semantic/page-shell';
import { PageHeader, nodeToText } from '@/components/semantic/page-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { HeaderActionButton } from '@/components/semantic/header-action-button';
import { ToolbarRow, useToolbarViews } from '@/components/semantic/toolbar-row';
import { useEventSubscription } from '@/infrastructure/hooks/use-event-subscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { SelectField } from '@/components/ui/select-field';
import { DataList, DataListSkeleton, ListChip, ListDate, ListText } from '@/shared/components/data-list';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/semantic/empty-state';
import { IconStack } from '@/components/semantic/icon-stack';
import { toast } from '@/components/ui/toast';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useProjectMilestones } from '@/modules/issue/hooks/use-project-tasks';
import { useCreateRelease, useRecommendVersion, useReleases, releaseKeys } from '../hooks/use-releases';
import {
  deriveReleaseChannel,
  RELEASE_PLATFORMS,
  RELEASE_PLATFORM_LABELS,
  type ReleaseChannel,
  type ReleasePlatform,
  type ReleaseStatus,
} from '../api/release-api';
import { RELEASE_STATUSES, RELEASE_STATUS_VISUALS, isPlannedOverdue, statusLabelKey } from '../release-status-meta';
import { ReleaseChannelChip, ReleasePlatformBadges } from '../components/release-platform-badges';
import { ReleaseUpcomingSection } from '../components/release-upcoming-section';
import { cn } from '@/lib/utils';

// 兼容既有消费方（详情页/测试从本页导入）：视觉元信息已抽至 release-status-meta
export { RELEASE_STATUS_TONE, RELEASE_STATUS_VISUALS, RELEASE_STATUSES, statusLabelKey, isPlannedOverdue } from '../release-status-meta';

export function ReleaseListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  // 本页自治的项目深链参数 ?project（CAP-A-15 遗产口径，参数名与各管道页一致）；无参 = 全部项目
  // 批四：status/q 同入 URL（与 project 同真相源，深链/刷新不丢）
  const projectId = searchParams.get('project') ?? '';
  const statusFilter = (searchParams.get('status') as ReleaseStatus | null) ?? 'all';
  const search = searchParams.get('q') ?? '';
  const [createOpen, setCreateOpen] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<ReleasePlatform | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<ReleaseChannel | 'all'>('all');

  // 筛选参数统一写回 URL（replace 不留历史；null = 删除该参数）
  const patchParams = (patch: Record<string, string | null>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        return next;
      },
      { replace: true },
    );
  };
  const setSearch = (q: string) => patchParams({ q: q || null });
  const setStatusFilter = (s: ReleaseStatus | 'all') =>
    patchParams({ status: s === 'all' ? null : s });

  const projectsQuery = useProjectList();
  const projects = projectsQuery.data?.items ?? [];
  const releasesQuery = useReleases(projectId || undefined);
  const releases = useMemo(
    () => releasesQuery.data ?? [],
    [releasesQuery.data],
  );

  // 批四：发布状态变化实时失效（事件驱动，React Query 轮询兜底不存在——列表无轮询）
  useEventSubscription(DomainEventTypes.ReleaseStatusChanged, () => {
    queryClient.invalidateQueries({ queryKey: releaseKeys.all });
  });

  // 页头状态统计（批四）：全量客户端 reduce，零后端
  const statusCounts = useMemo(() => {
    const counts: Record<ReleaseStatus, number> = {
      draft: 0,
      gated: 0,
      approved: 0,
      publishing: 0,
      released: 0,
      failed: 0,
    };
    for (const r of releases) {
      if (r.status in counts) counts[r.status] += 1;
    }
    return counts;
  }, [releases]);

  // 客户端过滤（搜索 version/name/tag + 状态/平台/通道）
  const filtered = useMemo(
    () =>
      releases.filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (
          platformFilter !== 'all' &&
          !(r.platforms ?? []).includes(platformFilter)
        )
          return false;
        if (
          channelFilter !== 'all' &&
          deriveReleaseChannel(r.version) !== channelFilter
        )
          return false;
        if (search) {
          const kw = search.toLowerCase();
          const haystack = [`v${r.version}`, r.name ?? '', r.gitTag ?? '', r.project?.name ?? '']
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(kw)) return false;
        }
        return true;
      }),
    [releases, statusFilter, platformFilter, channelFilter, search],
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
        snapshot: {
          search: '',
          status: 'all',
          platform: 'all',
          channel: 'all',
          projectId: '',
        },
      },
    ],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string;
        status: ReleaseStatus | 'all';
        platform: ReleasePlatform | 'all';
        channel: ReleaseChannel | 'all';
        projectId: string;
      }>;
      setSearch(snap.search ?? '');
      setStatusFilter(snap.status ?? 'all');
      setPlatformFilter(snap.platform ?? 'all');
      setChannelFilter(snap.channel ?? 'all');
      const nextPid = snap.projectId ?? '';
      if (nextPid !== projectId) setProjectFilter(nextPid);
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, status: statusFilter, platform: platformFilter, channel: channelFilter, projectId });
  }, [updateActiveSnapshot, search, statusFilter, platformFilter, channelFilter, projectId]);

  const hasActiveFilters =
    statusFilter !== 'all' || !!search || !!projectId || platformFilter !== 'all' || channelFilter !== 'all';
  // 批四：项目闸放开——无 ?project 直开对话框（对话框内自选项目），不再 toast 拦截
  const openCreate = () => {
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
        metrics={[
          { id: 'total', label: t('release.title'), value: filtered.length },
          ...RELEASE_STATUSES.map((s) => ({
            id: s,
            label: t(statusLabelKey(s)),
            value: statusCounts[s],
          })),
        ]}
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
            { type: 'separator' },
            { type: 'label', label: t('release.filter.platformGroup') },
            {
              id: 'platform-all',
              type: 'checkbox',
              label: t('common.all'),
              checked: platformFilter === 'all',
              onSelect: () => setPlatformFilter('all'),
            },
            ...RELEASE_PLATFORMS.map((p) => ({
              id: `platform-${p}`,
              type: 'checkbox' as const,
              label: RELEASE_PLATFORM_LABELS[p],
              checked: platformFilter === p,
              onSelect: () => setPlatformFilter(platformFilter === p ? 'all' : p),
            })),
            { type: 'separator' },
            { type: 'label', label: t('release.filter.channelGroup') },
            {
              id: 'channel-all',
              type: 'checkbox',
              label: t('common.all'),
              checked: channelFilter === 'all',
              onSelect: () => setChannelFilter('all'),
            },
            ...(['alpha', 'beta', 'rc'] as const).map((c) => ({
              id: `channel-${c}`,
              type: 'checkbox' as const,
              label: c,
              checked: channelFilter === c,
              onSelect: () => setChannelFilter(channelFilter === c ? 'all' : c),
            })),
          ],
        }}
      />

      {/* 内容区：即将发版告示条 + 状态分支（加载骨架 / 空发版（带创建动作）/ 筛选无结果 / 任务列表基座 DataList）。
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
          <>
            <ReleaseUpcomingSection
              releases={filtered}
              onItemClick={(r) => navigate(`/app/releases/${r.id}`)}
            />
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
                      title={
                        r.status === 'failed' && r.failureReason
                          ? `${t(statusLabelKey(r.status))}：${r.failureReason}`
                          : t(statusLabelKey(r.status))
                      }
                    />
                    <span className="shrink-0 whitespace-nowrap font-mono text-sm font-medium text-muted-foreground/50">
                      v{r.version}
                    </span>
                    <ReleaseChannelChip channel={deriveReleaseChannel(r.version)} />
                    {/* 行级卡点（批四）：待审批蓝 / 门禁未过红——流水线操作台一眼见卡在哪 */}
                    {r.hasPendingApproval ? (
                      <ListChip className="shrink-0 bg-accent-blue-light text-accent-blue">
                        {t('release.list.pendingApproval')}
                      </ListChip>
                    ) : null}
                    {r.gateFailedChecks ? (
                      <ListChip className="shrink-0 bg-accent-red-light text-accent-red">
                        {t('release.list.gateFailed', { count: r.gateFailedChecks })}
                      </ListChip>
                    ) : null}
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
                  <ReleasePlatformBadges platforms={r.platforms} />
                  {r.plannedAt ? (
                    <ListDate value={r.plannedAt} overdue={isPlannedOverdue(r)} />
                  ) : null}
                  {r.gitTag ? (
                    <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground/50">{r.gitTag}</span>
                  ) : null}
                  {r.releasedAt ? <ListDate value={r.releasedAt} /> : null}
                </>
              )}
            />
          </>
        )}
      </div>

      <CreateReleaseDialog
        open={createOpen}
        projectId={projectId}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        releases={releases}
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
  releases,
  onClose,
  onCreated,
}: {
  open: boolean;
  projectId: string;
  projects: Array<{ id: string; name: string }>;
  releases: Array<{
    id: string;
    projectId: string;
    status: ReleaseStatus;
    version: string;
    name?: string | null;
  }>;
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
  const [plannedAt, setPlannedAt] = useState<Date | undefined>(undefined);
  const [platforms, setPlatforms] = useState<ReleasePlatform[]>([]);
  const [hotfixOfId, setHotfixOfId] = useState('');

  const recommend = useRecommendVersion(pid || undefined);
  const create = useCreateRelease();
  // 所属里程碑（CAP-A-16 计划-交付轴）：数据源 = 该项目的 milestones 列表；
  // 选中里程碑且未手选计划时间时预填 targetDate（计划轴单一来源不双填）
  const { data: milestones } = useProjectMilestones(pid || undefined);
  // 热修基线候选（批三血缘）：同项目已发布发版，版本倒序
  const hotfixCandidates = useMemo(
    () =>
      releases
        .filter((r) => r.projectId === pid && r.status === 'released')
        .sort((a, b) => b.version.localeCompare(a.version)),
    [releases, pid],
  );

  const handleMilestoneChange = (mid: string) => {
    setMilestoneId(mid);
    if (mid) {
      const target = milestones?.find((m) => m.id === mid)?.targetDate;
      if (target && !plannedAt) setPlannedAt(new Date(target));
    }
  };

  const togglePlatform = (p: ReleasePlatform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

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
        plannedAt: plannedAt ? plannedAt.toISOString() : null,
        platforms: platforms.length ? platforms : null,
        hotfixOfId: hotfixOfId || null,
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
              onChange={(e) => handleMilestoneChange(e.target.value)}
              disabled={!pid}
              className="h-8 w-full text-xs"
            >
              <option value="">{t('release.create.milestoneNone')}</option>
              {(milestones ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </SelectField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5" data-testid="release-plannedat-picker">
              <label className="text-xs font-medium text-content-text">
                {t('release.create.plannedAt')}
              </label>
              <DatePicker
                value={plannedAt}
                onValueChange={setPlannedAt}
                placeholder={t('release.create.plannedAtPlaceholder')}
                buttonClassName="h-8 w-full text-xs"
              />
            </div>
            <div className="space-y-1.5" data-testid="release-hotfix-select">
              <label className="text-xs font-medium text-content-text">
                {t('release.create.hotfixOf')}
              </label>
              <SelectField
                value={hotfixOfId}
                onChange={(e) => setHotfixOfId(e.target.value)}
                disabled={!pid || hotfixCandidates.length === 0}
                className="h-8 w-full text-xs"
              >
                <option value="">{t('release.create.hotfixNone')}</option>
                {hotfixCandidates.map((r) => (
                  <option key={r.id} value={r.id}>
                    v{r.version}{r.name ? ` ${r.name}` : ''}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
          <div className="space-y-1.5" data-testid="release-platform-checks">
            <label className="text-xs font-medium text-content-text">
              {t('release.create.platforms')}
            </label>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {RELEASE_PLATFORMS.map((p) => (
                <label key={p} className="flex cursor-pointer items-center gap-1.5 text-xs text-content-text">
                  <Checkbox
                    checked={platforms.includes(p)}
                    onCheckedChange={() => togglePlatform(p)}
                  />
                  {RELEASE_PLATFORM_LABELS[p]}
                </label>
              ))}
            </div>
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
