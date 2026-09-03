/**
 * 详情页模板 — 抽取自 modules/task/pages/task-detail-page.tsx（精简保留骨架）
 * 骨架：PageShell > SubPageToolbar(返回/面包屑/翻页/侧栏开关)
 *      > Body(flex: 主区纵向滚动 + RightSidebar)
 *      > 主区：错误条 > 标题热编辑 > 描述热编辑 > 子项/折叠区
 *      > 右栏：SidebarButtonGroup > PropsCard(PropertyRow+CapsuleSelect)
 *      > 底部：删除确认 Dialog
 *
 * 用法：复制到目标模块 pages/ 下，替换 Xxx 与 TODO 占位。
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2, User as UserIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageShell } from '@/components/ui/page-shell'
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar'
import { RightSidebar, SidebarButton, SidebarButtonGroup } from '@/components/ui/right-sidebar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AutoSizeTextarea,
  CapsuleSelect,
  DateCapsuleField,
  PropertyRow,
  PropsCard,
} from '@/components/ui/property-panel'
import { useConfirm } from '@/shared/confirm/use-confirm'
// TODO: 引入 useDebouncedCallback（@/shared/hooks/use-debounced-callback）做标题/描述防抖保存
// TODO: 引入 useTabs（@/shared/tabs/tabs-context）同步多标签页标题
// TODO: 引入 useEntityNavigation（@/shared/hooks/use-entity-navigation）做同集合翻页

/** 模板桩数据——保证模板可编译；实际使用时替换为 useXxxDetail 查询结果 */
type XxxItem = {
  id: string
  title: string
  shortId: string
  description?: string
  assignee?: { id: string; displayName: string } | null
  dueDate?: string | null
}

export function XxxDetailPage() {
  const navigate = useNavigate()
  const { xxxId } = useParams<{ xxxId: string }>() // 路由参数模式：/app/xxx/:xxxId
  const { t } = useTranslation()
  const confirmAction = useConfirm()

  const [asideHidden, setAsideHidden] = useState(false)
  const [propsCollapsed, setPropsCollapsed] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  // TODO: 数据获取（TanStack Query）
  // const { data: item, isLoading } = useXxxDetail(xxxId)
  // const { data: members = [] } = useMembers(item?.parentId)
  // const updateXxx = useUpdateXxx(); const deleteXxx = useDeleteXxx()
  const isLoading = false
  const item: XxxItem = { id: 'tpl', title: '', shortId: 'XXX-1', description: '' }

  // TODO: 多标签页标题同步——useTabs().updateTabByPath(`/app/xxx/${xxxId}`, { title: item.title })

  // TODO: 标题/描述热编辑——用 useDebouncedCallback 包裹 updateXxx.mutateAsync，1500ms 防抖
  const persistTitle = (value: string) => {
    if (!xxxId || !value.trim()) return
    setMutationError(null)
    /* TODO: await updateXxx.mutateAsync({ id: xxxId, data: { title: value.trim() } }) */
  }
  const persistDescription = (value: string) => {
    if (!xxxId || !value) return
    /* TODO: 同上，保存 description（跳过未变更值） */
  }

  // Guards：无 ID / 加载中 / 不存在
  if (!xxxId)
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          {t('xxxDetail.notExists')}
        </div>
      </PageShell>
    )
  if (isLoading)
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          {t('common.loading')}
        </div>
      </PageShell>
    )
  if (!item)
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          {t('xxxDetail.notFound')}
        </div>
      </PageShell>
    )

  // 通用字段更新（右栏属性胶囊直接调用）
  const updateField = async (patch: Record<string, unknown>) => {
    if (!xxxId || !patch) return
    setMutationError(null)
    try {
      /* TODO: await updateXxx.mutateAsync({ id: xxxId, data: patch }) */
    } catch {
      setMutationError(t('xxxDetail.updateFailed'))
    }
  }
  const handleDelete = async () => {
    const ok = await confirmAction({
      title: t('common.delete'),
      variant: 'destructive',
    })
    if (!ok) return
    setShowDeleteDialog(false)
    navigate('/app/xxx') // 回列表
  }

  return (
    <PageShell aiPage="xxx.xxx-detail" className="overflow-hidden">
      {/* SubPageToolbar：返回 + 面包屑 + 翻页器 + 侧栏开关 */}
      <SubPageToolbar
        aiId="xxx.xxx-detail"
        backLabel={t('common.back')}
        breadcrumbs={[
          { label: 'Xxx', to: '/app/xxx' },
          /* TODO: 中间层级 { label: parent.name, to: `/app/parent/${item.parentId}` } */
          { label: item.shortId },
        ]}
        pager={
          {
            /* TODO: useEntityNavigation 提供 hasPrev/hasNext/onPrev/onNext/position */
            hasPrev: false,
            hasNext: false,
            onPrev: () => {},
            onNext: () => {},
            position: '—',
          }
        }
        sidebar={{ open: !asideHidden, onToggle: () => setAsideHidden((v) => !v) }}
      />

      {/* Body：主区 + 右栏并列 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 主区（纵向滚动） */}
        <div className="flex flex-1 min-w-0 flex-col overflow-y-auto">
          {mutationError && (
            <div className="mx-6 mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {mutationError}
            </div>
          )}

          {/* 标题区：状态图标 + 热编辑大标题 + 短ID 元信息行（图标与标题首行 items-center 对齐） */}
          <div className="shrink-0 border-b px-6 pb-3 pt-5">
            <div className="flex items-center gap-3">
              {/* TODO: <StatusIcon className="size-5 shrink-0" style={{ color: statusOpt.color }} /> */}
              <AutoSizeTextarea
                key={`title-${item.id}`}
                defaultValue={item.title}
                rows={1}
                placeholder={t('xxxDetail.unnamedTitle')}
                onChange={(e) => persistTitle(e.target.value)}
                className="w-full text-lg! font-semibold placeholder:text-muted-foreground/40 focus-visible:ring-0"
              />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{item.shortId}</span>
              <span className="opacity-50">•</span>
              {/* TODO: 创建时间 / 外部同步徽标等元信息 */}
            </div>
          </div>

          {/* 描述区：热编辑（需 @ 提及时换 MentionTextarea） */}
          <div className="shrink-0 border-b px-6 pb-4 pt-4">
            <label className="mb-2 block text-10 font-semibold uppercase tracking-wider text-muted-foreground">
              {t('xxxDetail.description')}
            </label>
            <AutoSizeTextarea
              rows={3}
              defaultValue={item.description ?? ''}
              onChange={(e) => persistDescription(e.target.value)}
              placeholder={t('xxxDetail.addDescription')}
              className="w-full border-0 px-0 text-sm leading-relaxed focus-visible:border-0"
            />
          </div>

          {/* TODO: 子项列表区（计数 + 折叠开关 + 行列表 + 内联新建表单） */}
          {/* TODO: 折叠区（文档/讨论等 ExpandableSection × N） */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-4">
            {/* TODO */}
          </div>
        </div>

        {/* 右侧栏（320px，可收起） */}
        <RightSidebar hidden={asideHidden} width={320}>
          {/* 顶部操作条 */}
          <SidebarButtonGroup className="px-1">
            {/* TODO: 领域操作按钮 */}
            <SidebarButton
              icon={Trash2}
              label={t('common.delete')}
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:text-destructive"
            />
          </SidebarButtonGroup>

          {/* 属性卡：每行 图标 + label + 可编辑胶囊 */}
          <PropsCard
            title={t('xxxDetail.properties')}
            collapsed={propsCollapsed}
            onToggleCollapse={() => setPropsCollapsed((v) => !v)}
          >
            <PropertyRow icon={<UserIcon className="size-3.5" />} label={t('xxxDetail.assignee')}>
              <CapsuleSelect
                value={item.assignee?.id ?? ''}
                active={!!item.assignee}
                placeholder={t('xxxDetail.unassigned')}
                options={
                  [
                    /* TODO: members.map((m) => ({ value: m.id, label: m.displayName })) */
                  ]
                }
                onChange={(v) => updateField({ assigneeId: v || undefined })}
              />
            </PropertyRow>
            {/* TODO: Status/Priority/Project/Milestone/Labels 同模式 PropertyRow + CapsuleSelect */}
            <PropertyRow icon={<UserIcon className="size-3.5" />} label={t('xxxDetail.dueDate')}>
              <DateCapsuleField
                value={item.dueDate ?? ''}
                onChange={(v) => updateField({ dueDate: v || undefined })}
              />
            </PropertyRow>
          </PropsCard>

          {/* TODO: 其余右栏面板（SuggestionsCard / 外部集成 / 执行记录），按需保留 */}
        </RightSidebar>
      </div>

      {/* 删除确认弹窗 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('xxxDetail.deleteTitle')}</DialogTitle>
            <DialogDescription>{t('xxxDetail.deleteConfirm', { title: item.title })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
