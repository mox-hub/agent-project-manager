import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, LayoutGrid, List, Plus, User, Users } from 'lucide-react';
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
import { useMembers, useDeactivateMember } from '../hooks';
import { MemberCard } from '../components/member-card';
import { MemberList, type MemberListItem } from '../components/member-list';
import { MemberCreateDialog } from '../components/member-create-dialog';
import { useAuth } from '@/modules/auth/hooks/use-auth';

type ViewMode = 'grid' | 'list';
type TypeFilter = 'all' | 'human' | 'ai_agent';

export default function MembersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirmDialog = useConfirm();
  const { roles } = useAuth();

  const [q, setQ] = useState('');
  const [tab, setTab] = useState<TypeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCreate, setShowCreate] = useState(false);
  const stats = usePersistentToggle('members-page.stats');

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

  const isAdmin = roles.some((r) => r.role === 'admin' || r.role === 'maintainer');

  // 已保存视图：快照记忆搜索 + 类型筛选 + 视图样式
  const toolbar = useToolbarViews({
    key: 'members-page',
    defaults: [
      {
        id: 'all',
        name: t('members.filter.all', '全部'),
        icon: 'user',
        builtIn: true,
        snapshot: { q: '', tab: 'all', viewMode: 'grid' },
      },
    ],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        q: string;
        tab: TypeFilter;
        viewMode: ViewMode;
      }>;
      setQ(snap.q ?? '');
      setTab(snap.tab ?? 'all');
      setViewMode(snap.viewMode ?? 'grid');
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ q, tab, viewMode });
  }, [updateActiveSnapshot, q, tab, viewMode]);

  const { data, isLoading } = useMembers({
    q: q || undefined,
    type: tab === 'all' ? undefined : tab,
    limit: 200,
  });
  const deactivate = useDeactivateMember();

  const members = useMemo(() => (data?.items ?? []) as MemberListItem[], [data]);

  // 快捷统计卡：全部 / 人类 / AI / 在线
  const statsItems = useMemo(
    () => [
      { key: 'total', value: members.length, label: t('members.stats.total', '全部'), icon: Users },
      { key: 'human', value: members.filter((m) => m.type === 'human').length, label: t('members.stats.human', '人类'), icon: User, iconColorClass: 'text-accent-blue' },
      { key: 'ai', value: members.filter((m) => m.type === 'ai_agent').length, label: t('members.stats.ai', 'AI'), icon: Bot, iconColorClass: 'text-accent-purple' },
      { key: 'online', value: members.filter((m) => m.isOnline && m.status === 'active').length, label: t('members.stats.online', '在线'), icon: Users, iconColorClass: 'text-accent-green' },
    ],
    [members, t],
  );

  const handleDeactivate = async (member: MemberListItem) => {
    const ok = await confirmDialog({
      title: t('members.deactivate', '停用成员'),
      description: t('members.deactivateConfirm', {
        defaultValue: '停用成员 {{name}}？',
        name: member.displayName,
      }),
      variant: 'destructive',
    });
    if (ok) deactivate.mutate(member.id);
  };

  const handleBatchDeactivate = async (selected: MemberListItem[], close: () => void) => {
    const ok = await confirmDialog({
      title: t('members.batchDeactivate', {
        defaultValue: '停用选中的 {{count}} 个成员？',
        count: selected.length,
      }),
      description: t('members.batchDeactivateDesc', '停用后成员将无法继续接收任务派发。'),
      variant: 'destructive',
    });
    if (!ok) return;
    await Promise.allSettled(selected.map((m) => deactivate.mutateAsync(m.id)));
    close();
  };

  return (
    <PageShell className="overflow-hidden">
      <PageHeader
        aiId="team-member.members"
        title={t('members.title', '成员管理')}
        icon={Users}
        iconColor="text-accent-blue"
        metrics={[{ id: 'total', label: t('members.title', '成员'), value: members.length }]}
        actions={
          <>
            <QuickCardsToggle
              visible={stats.visible}
              onToggle={stats.toggle}
              label={t('members.statsToggle', '统计')}
              aiId="team-member.members.stats-toggle"
            />
            {isAdmin && (
              <HeaderActionButton
                icon={Plus}
                label={t('members.create', '新建成员')}
                onClick={() => setShowCreate(true)}
                data-ai-component="team-member.members.new-button"
                data-ai-action="team-member.members.new-button.click"
                data-ai-role="submit"
              />
            )}
          </>
        }
      />

      {isAdmin && (
        <MemberCreateDialog open={showCreate} onOpenChange={setShowCreate} />
      )}

      {/* 统计卡区（默认隐藏，页头幽灵按钮切换） */}
      {stats.visible ? (
        <div className="border-b border-border bg-background px-6 py-4">
          <StatsCard items={statsItems} columns={4} />
        </div>
      ) : null}

      {/* 工具栏：左-已保存视图 / 中-视图样式切换 / 右-筛选·显示·下载下拉 */}
      <ToolbarRow
        aiId="team-member.members"
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
            { value: 'grid', label: t('members.view.grid', '卡片'), icon: LayoutGrid },
            { value: 'list', label: t('members.view.list', '列表'), icon: List },
          ],
        }}
        filterMenu={{
          badge: [tab !== 'all', !!q].filter(Boolean).length,
          search: { value: q, onChange: setQ, placeholder: t('members.searchPlaceholder', '搜索 displayName / handle / email...') },
          items: [
            { type: 'label', label: t('members.filter.type', '类型') },
            ...(['all', 'human', 'ai_agent'] as const).map((value) => ({
              id: `type-${value}`,
              type: 'checkbox' as const,
              label: value === 'all' ? t('members.filter.all', '全部') : value === 'human' ? t('members.filter.human', '人类') : 'AI',
              checked: tab === value,
              onSelect: () => setTab(value),
            })),
          ],
        }}
        displayMenu={{ items: [] }}
        downloadMenu={{
          items: [
            { id: 'export-label', type: 'label' as const, label: t('members.export', '导出') },
            { id: 'csv', type: 'item' as const, label: 'CSV', disabled: true },
          ],
        }}
      />

      {/* 内容区：卡片/列表双视图 */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {viewMode === 'grid' ? (
          isLoading ? (
            <div className="py-12 text-center text-muted-foreground">{t('common.loading', '加载中…')}</div>
          ) : members.length === 0 ? (
            <EmptyState title={t('members.empty', '暂无成员')} />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {members.map((m) => (
                <MemberCard key={m.id} member={m} isAdmin={isAdmin} onDeactivate={handleDeactivate} />
              ))}
            </div>
          )
        ) : (
          <MemberList
            members={members}
            loading={isLoading}
            emptyMessage={q || tab !== 'all' ? t('members.emptyFiltered', '没有符合条件的成员') : t('members.empty', '暂无成员')}
            onMemberClick={(m) => navigate(`/app/members/${m.id}`)}
            isAdmin={isAdmin}
            onDeactivate={handleDeactivate}
            selectionActions={(selected, close) =>
              isAdmin && selected.some((m) => m.status === 'active') ? (
                <ListActionButton
                  onClick={() => handleBatchDeactivate(selected.filter((m) => m.status === 'active'), close)}
                  title={t('members.deactivate', '停用')}
                  className="text-accent-red"
                >
                  {t('members.deactivate', '停用')}
                </ListActionButton>
              ) : null
            }
          />
        )}
      </div>
    </PageShell>
  );
}
