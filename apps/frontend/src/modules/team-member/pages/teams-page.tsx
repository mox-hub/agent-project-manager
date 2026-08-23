import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Archive, CheckCircle2, LayoutGrid, List, Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { QuickCardsToggle } from '@/components/ui/quick-cards-toggle';
import { PageShell } from '@/components/ui/page-shell';
import { StatsCard } from '@/components/ui/stats-card';
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row';
import { ListActionButton } from '@/components/ui/data-list';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { usePersistentToggle } from '@/shared/hooks/use-persistent-toggle';
import { useTeams, useArchiveTeam } from '../hooks';
import { TeamCard } from '../components/team-card';
import { TeamList, type TeamListItem } from '../components/team-list';
import { TeamCreateDialog } from '../components/team-create-dialog';

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'active' | 'archived';

export default function TeamsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirmDialog = useConfirm();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCreate, setShowCreate] = useState(false);
  const stats = usePersistentToggle('teams-page.stats');

  // 深链入口：location.state 携带 openCreate 时自动打开创建弹窗（刷新不重复打开）。
  // 渲染期间检测 state 变化调整 showCreate，replaceState 副作用留在独立 effect。
  const location = useLocation();
  const [prevLocationState, setPrevLocationState] = useState(location.state);
  if (prevLocationState !== location.state) {
    setPrevLocationState(location.state);
    const st = (location.state ?? {}) as { openCreate?: boolean };
    if (st.openCreate) setShowCreate(true);
  }
  useEffect(() => {
    const st = (location.state ?? {}) as { openCreate?: boolean };
    if (st.openCreate) window.history.replaceState({}, '');
  }, [location.state]);

  // 已保存视图：快照记忆搜索 + 状态筛选 + 视图样式
  const toolbar = useToolbarViews({
    key: 'teams-page',
    defaults: [
      {
        id: 'all',
        name: t('teams.title', '团队'),
        icon: 'folder',
        builtIn: true,
        snapshot: { q: '', status: 'all', viewMode: 'grid' },
      },
    ],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        q: string;
        status: StatusFilter;
        viewMode: ViewMode;
      }>;
      setQ(snap.q ?? '');
      setStatus(snap.status ?? 'all');
      setViewMode(snap.viewMode ?? 'grid');
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ q, status, viewMode });
  }, [updateActiveSnapshot, q, status, viewMode]);

  const { data, isLoading } = useTeams({
    q: q || undefined,
    status: status === 'all' ? undefined : status,
    limit: 200,
  });
  const archiveTeam = useArchiveTeam();

  const teams = useMemo(() => (data?.teams ?? []) as TeamListItem[], [data]);

  // 快捷统计卡：总数 / 活跃 / 归档 / 成员合计
  const statsItems = useMemo(
    () => [
      { key: 'total', value: teams.length, label: t('teams.stats.total', '全部团队'), icon: Users },
      { key: 'active', value: teams.filter((tm) => tm.status === 'active').length, label: t('teams.status.active', '活跃'), icon: CheckCircle2, iconColorClass: 'text-accent-green' },
      { key: 'archived', value: teams.filter((tm) => tm.status === 'archived').length, label: t('teams.status.archived', '已归档'), icon: Archive, iconColorClass: 'text-muted-foreground' },
      {
        key: 'members',
        value: teams.reduce((sum, tm) => sum + (tm.memberCount ?? tm._count?.members ?? 0), 0),
        label: t('teams.stats.memberSum', '成员合计'),
        icon: Users,
        iconColorClass: 'text-accent-blue',
      },
    ],
    [teams, t],
  );

  const handleArchive = async (team: TeamListItem) => {
    const ok = await confirmDialog({
      title: t('teams.archive', '归档团队'),
      description: t('teams.archiveConfirm', {
        defaultValue: '归档团队 {{name}}？归档后可从状态筛选中找回。',
        name: team.name,
      }),
      variant: 'destructive',
    });
    if (ok) archiveTeam.mutate(team.id);
  };

  const handleBatchArchive = async (selected: TeamListItem[], close: () => void) => {
    const ok = await confirmDialog({
      title: t('teams.batchArchive', {
        defaultValue: '归档选中的 {{count}} 个团队？',
        count: selected.length,
      }),
      variant: 'destructive',
    });
    if (!ok) return;
    await Promise.allSettled(selected.map((tm) => archiveTeam.mutateAsync(tm.id)));
    close();
  };

  return (
    <PageShell className="overflow-hidden">
      <PageHeader
        aiId="team-member.teams"
        title={t('teams.title', '团队')}
        icon={Users}
        iconColor="text-accent-purple"
        metrics={[{ id: 'total', label: t('teams.title', '团队'), value: teams.length }]}
        actions={
          <>
            <QuickCardsToggle
              visible={stats.visible}
              onToggle={stats.toggle}
              label={t('teams.statsToggle', '统计')}
              aiId="team-member.teams.stats-toggle"
            />
            <HeaderActionButton
              icon={Plus}
              label={t('teams.create.title', '新建团队')}
              onClick={() => setShowCreate(true)}
              data-ai-component="team-member.teams.new-button"
              data-ai-action="team-member.teams.new-button.click"
              data-ai-role="submit"
            />
          </>
        }
      />

      <TeamCreateDialog open={showCreate} onOpenChange={setShowCreate} />

      {/* 统计卡区（默认隐藏，页头幽灵按钮切换） */}
      {stats.visible ? (
        <div className="border-b border-border bg-background px-6 py-4">
          <StatsCard items={statsItems} columns={4} />
        </div>
      ) : null}

      {/* 工具栏：左-已保存视图 / 中-视图样式切换 / 右-筛选·显示·下载下拉 */}
      <ToolbarRow
        aiId="team-member.teams"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        viewStyle={{
          value: viewMode,
          onChange: (v) => setViewMode(v as ViewMode),
          options: [
            { value: 'grid', label: t('teams.view.grid', '卡片'), icon: LayoutGrid },
            { value: 'list', label: t('teams.view.list', '列表'), icon: List },
          ],
        }}
        filterMenu={{
          badge: [status !== 'all', !!q].filter(Boolean).length,
          search: { value: q, onChange: setQ, placeholder: t('teams.searchPlaceholder', '搜索团队...') },
          items: [
            { type: 'label', label: t('teams.filter.status', '状态') },
            ...(['all', 'active', 'archived'] as const).map((value) => ({
              id: `status-${value}`,
              type: 'checkbox' as const,
              label: value === 'all' ? t('teams.filter.all', '全部') : value === 'active' ? t('teams.status.active', '活跃') : t('teams.status.archived', '已归档'),
              checked: status === value,
              onSelect: () => setStatus(value),
            })),
          ],
        }}
        displayMenu={{ items: [] }}
        downloadMenu={{
          items: [
            { id: 'export-label', type: 'label' as const, label: t('teams.export', '导出') },
            { id: 'csv', type: 'item' as const, label: 'CSV', disabled: true },
          ],
        }}
      />

      {/* 内容区：卡片/列表双视图 */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {viewMode === 'grid' ? (
          isLoading ? (
            <div className="py-12 text-center text-muted-foreground">{t('common.loading', '加载中…')}</div>
          ) : teams.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('teams.empty', '暂无团队，点击右上角创建第一个团队。')}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} onArchive={handleArchive} />
              ))}
            </div>
          )
        ) : (
          <TeamList
            teams={teams}
            loading={isLoading}
            emptyMessage={q || status !== 'all' ? t('teams.emptyFiltered', '没有符合条件的团队') : t('teams.emptyList', '暂无团队')}
            onTeamClick={(team) => navigate(`/app/teams/${team.id}`)}
            onArchive={handleArchive}
            selectionActions={(selected, close) =>
              selected.some((tm) => tm.status === 'active') ? (
                <ListActionButton
                  onClick={() => handleBatchArchive(selected.filter((tm) => tm.status === 'active'), close)}
                  title={t('teams.archive', '归档')}
                  className="text-accent-red"
                >
                  {t('teams.archive', '归档')}
                </ListActionButton>
              ) : null
            }
          />
        )}
      </div>
    </PageShell>
  );
}
