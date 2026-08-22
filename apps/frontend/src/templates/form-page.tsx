/**
 * 表单/设置页模板 — 抽取自 modules/git/pages/repository-settings-page.tsx
 * 骨架：PageShell > SubPageToolbar(面包屑) > PageHeader > 居中窄栏表单 Card
 *      （查询回填 + 受控字段 + 保存/删除双 mutation + Alert 反馈 + 三态 guards）
 *
 * 用法：复制到目标模块 pages/ 下，替换 Xxx 与 TODO 占位。
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Settings, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageShell } from '@/components/ui/page-shell'
import { PageHeader } from '@/components/ui/page-header'
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { useConfirm } from '@/shared/confirm/use-confirm'
// TODO: 引入本模块 hooks（useXxx / useUpdateXxx / useDeleteXxx）

export function XxxSettingsPage() {
  const { xxxId } = useParams<{ xxxId: string }>() // 路由参数模式：/app/xxx/:xxxId/settings
  const navigate = useNavigate()
  const { t } = useTranslation()
  const confirmAction = useConfirm()

  // TODO: 查询 + mutations
  // const { data: item, isLoading, error } = useXxx(xxxId!)
  // const updateXxx = useUpdateXxx(); const deleteXxx = useDeleteXxx()
  const isLoading = false
  const error: unknown = null
  const item: { id: string; name: string } | null = { id: 'tpl', name: '' }
  const savePending = false
  const saved = false

  const [name, setName] = useState('')
  // TODO: 其余表单字段 state

  // 查询数据回填表单
  useEffect(() => {
    if (item) {
      const timer = setTimeout(() => {
        setName(item.name)
        // TODO: 其余字段回填
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [item])

  const handleSave = async () => {
    if (!xxxId || !name.trim()) return
    /* TODO: await updateXxx.mutateAsync({ id: xxxId, dto: { name: name.trim() } }) */
  }

  const handleDelete = async () => {
    if (!xxxId) return
    const ok = await confirmAction({
      title: t('xxxSettings.deleteTitle'),
      description: t('xxxSettings.deleteConfirm', { name: item?.name }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    })
    if (!ok) return
    /* TODO: await deleteXxx.mutateAsync(xxxId) */
    navigate('/app/xxx') // 回列表
  }

  // Guards：三态
  if (!xxxId || error || !item) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center p-12 text-muted-foreground">
          {t('xxxSettings.notFound')}
        </div>
      </PageShell>
    )
  }
  if (isLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center p-12">
          <Spinner />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell className="overflow-hidden">
      <SubPageToolbar
        aiId="xxx.xxx-settings"
        onBack={() => navigate(`/app/xxx/${xxxId}`)}
        breadcrumbs={[
          { label: 'Xxx', to: '/app/xxx' },
          { label: item.name, to: `/app/xxx/${xxxId}` },
          { label: t('xxxSettings.title') },
        ]}
      />
      <PageHeader
        aiId="xxx.xxx-settings"
        title={t('xxxSettings.title')}
        icon={Settings}
        iconColor="text-accent-blue"
      />

      {/* 居中窄栏表单卡片 */}
      <div className="mx-auto max-w-2xl p-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">{t('xxxSettings.name')}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('xxxSettings.namePlaceholder')}
              />
            </div>

            {/* TODO: 其余文本字段（label + Input + 可选说明 <p className="text-xs text-muted-foreground">） */}

            {/* 并排字段模式 */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-foreground">{t('xxxSettings.fieldA')}</label>
                <Input value="" onChange={() => {}} placeholder="…" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-foreground">{t('xxxSettings.fieldB')}</label>
                <Input value="" onChange={() => {}} placeholder="…" />
              </div>
            </div>

            {/* 底部操作行：左删除（destructive）+ 右保存 */}
            <div className="flex items-center justify-between pt-4">
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 size={14} className="mr-1" />
                {t('common.delete')}
              </Button>
              <Button onClick={handleSave} disabled={savePending || !name.trim()}>
                {savePending ? <Spinner size="sm" /> : t('common.save')}
              </Button>
            </div>

            {/* 保存成功反馈 */}
            {saved ? (
              <Alert>
                <AlertTitle>{t('xxxSettings.savedTitle')}</AlertTitle>
                <AlertDescription>{t('xxxSettings.savedDescription')}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
