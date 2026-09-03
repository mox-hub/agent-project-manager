/**
 * 列表页模板 — 抽取自 modules/task/pages/tasks-page.tsx
 * 骨架：PageShell > PageHeader(操作组) > 统一创建弹窗 > StatsCard(可切换)
 *      > ToolbarRow(useToolbarViews) > 内容区(列表/看板双视图)
 *
 * 用法：复制本文件到目标模块 pages/ 下，替换 Xxx 与 TODO 占位。
 * 组件清单见 apps/frontend/COMPONENTS.md；样式规范见 apps/frontend/AGENTS.md。
 */
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Kanban, List, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/ui/page-header'
import { HeaderActionButton } from '@/components/ui/header-action-button'
import { QuickCardsToggle } from '@/components/ui/quick-cards-toggle'
import { PageShell } from '@/components/ui/page-shell'
import { StatsCard } from '@/components/ui/stats-card'
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row'
import { UnifiedCreateDialog } from '@/components/ui/unified-create-dialog'
// TODO: 引入 usePersistentToggle（@/shared/hooks/use-persistent-toggle）持久化统计卡开关
// TODO: 引入本模块列表组件（基于 DataList 封装）与看板 BoardView（@/shared/components）

type ViewMode = 'list' | 'board'

export function XxxListPage() {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [statsVisible, setStatsVisible] = useState(false) // TODO: usePersistentToggle('xxx-page.stats')

  // 深链入口：location.state 携带 openCreate 时自动打开创建弹窗（刷新不重复打开）。
  // 渲染期间检测 state 变化调整弹窗状态，replaceState 副作用留在独立 effect。
  const location = useLocation()
  const [prevLocationState, setPrevLocationState] = useState(location.state)
  if (prevLocationState !== location.state) {
    setPrevLocationState(location.state)
    const st = (location.state ?? {}) as { openCreate?: boolean }
    if (st.openCreate) setShowCreateDialog(true)
  }
  useEffect(() => {
    const st = (location.state ?? {}) as { openCreate?: boolean }
    if (st.openCreate) window.history.replaceState({}, '')
  }, [location.state])

  // 已保存视图：快照记忆当前页全部筛选 + 显示样式
  const toolbar = useToolbarViews({
    key: 'xxx-page', // localStorage: toolbar-views:xxx-page
    defaults: [
      {
        id: 'all',
        name: t('xxx.filter.all', 'All'),
        icon: 'list',
        builtIn: true,
        snapshot: { search: '', status: 'all', viewMode: 'list' },
      },
    ],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{ search: string; status: string; viewMode: ViewMode }>
      setSearch(snap.search ?? '')
      setStatusFilter(snap.status ?? 'all')
      setViewMode(snap.viewMode ?? 'list')
    },
  })
  const { updateActiveSnapshot } = toolbar
  useEffect(() => {
    updateActiveSnapshot({ search, status: statusFilter, viewMode })
  }, [updateActiveSnapshot, search, statusFilter, viewMode])

  // TODO: 数据获取（TanStack Query）
  // const { data, isLoading, refetch } = useXxxList()

  // TODO: 客户端筛选（search/status/... 逐项过滤）
  const filteredItems = useMemo(() => [] as Array<{ id: string }>, [])

  return (
    <PageShell aiPage="xxx.xxx-list" className="overflow-hidden">
      {/* 页头：图标 + 标题 + 计数胶囊 + 右侧操作按钮组 */}
      <PageHeader
        aiId="xxx.xxx-list"
        title={t('xxx.title')}
        icon={Kanban}
        iconColor="text-accent-blue"
        metrics={[{ id: 'total', label: t('xxx.title'), value: filteredItems.length }]}
        actions={
          <>
            <QuickCardsToggle
              visible={statsVisible}
              onToggle={() => setStatsVisible((v) => !v)}
              aiId="xxx.xxx-list.stats-toggle"
            />
            <HeaderActionButton
              icon={Plus}
              label={t('xxx.create')}
              onClick={() => setShowCreateDialog(true)}
              data-ai-component="xxx.xxx-list.new-button"
              data-ai-action="xxx.xxx-list.new-button.click"
              data-ai-role="submit"
            />
          </>
        }
      />

      {/* 统一创建弹窗（task/bug/doc/project/milestone 五类型） */}
      <UnifiedCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultType="task"
        onSuccess={() => {
          /* TODO: refetch() */
        }}
      />

      {/* 统计卡区（默认隐藏，页头幽灵按钮切换） */}
      {statsVisible ? (
        <div className="border-b border-border bg-background px-6 py-4">
          <StatsCard
            items={
              [
                /* TODO: 4-6 项 { key, value, label, icon, ...STATS_THEMES } */
              ]
            }
            columns={6}
            className="grid grid-cols-6 gap-3"
          />
        </div>
      ) : null}

      {/* 工具栏：左-已保存视图 / 中-视图样式切换 / 右-筛选·显示·下载下拉 */}
      <ToolbarRow
        aiId="xxx.xxx-list"
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
            { value: 'list', label: t('xxx.view.list', 'List'), icon: List },
            { value: 'board', label: t('xxx.view.board', 'Board'), icon: Kanban },
          ],
        }}
        filterMenu={{
          badge: [statusFilter !== 'all'].filter(Boolean).length, // 生效筛选数红点
          search: { value: search, onChange: setSearch, placeholder: t('xxx.filter.searchPlaceholder') },
          items: [
            { type: 'label', label: t('xxx.status.group', 'Status') },
            {
              id: 'status-all',
              type: 'checkbox',
              label: t('xxx.status.all', 'All'),
              checked: statusFilter === 'all',
              onSelect: () => setStatusFilter('all'),
            },
            // TODO: 其余筛选维度（severity/project/…），同上 label + checkbox 模式
            { type: 'separator' },
          ],
        }}
        displayMenu={{ items: [] /* TODO: 分组/显示项 checkbox */ }}
        downloadMenu={{ items: [] /* TODO: 导出项，未实现时 disabled: true */ }}
      />

      {/* 内容区：列表/看板双视图 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="w-full">
          {viewMode === 'list' ? (
            /* TODO: 列表组件（DataList 封装）：
               <XxxSimpleList items={filteredItems} loading={isLoading}
                 onItemClick={(item) => navigate(`/app/xxx/${item.id}`)}
                 selectionActions={(selected, close) => (
                   <ListActionButton onClick={async () => { await Promise.allSettled(selected.map((i) => deleteXxx.mutateAsync(i.id))); close(); refetch() }}>
                     删除
                   </ListActionButton>
                 )} /> */
            null
          ) : (
            /* TODO: 看板视图（BoardView 泛型组件 + 列预设）：
               <BoardView columns={columns} items={filteredItems} groupBy={groupByFn} card={card}
                 onItemMove={(item, toCol) => updateXxx.mutate({ id: item.id, data: { status: toCol } })}
                 onItemClick={(item) => navigate(`/app/xxx/${item.id}`)} /> */
            null
          )}
        </div>
      </div>
    </PageShell>
  )
}
