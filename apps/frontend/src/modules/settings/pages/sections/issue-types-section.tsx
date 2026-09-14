import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable';
import {
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  Plus,
  Shapes,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/ui/page-shell';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu';
import { AsyncState } from '@/components/ui/async-state';
import {
  useIssueTypes,
  useCreateIssueType,
  useUpdateIssueType,
  useDeleteIssueType,
} from '@/modules/issue/hooks/use-issue-types';
import { RECOMMENDED_ISSUE_TYPES } from '@/modules/issue/constants/recommended-issue-types';
import type { IssueTypeMeta } from '@/modules/issue/api/issue-type-api';
import { ISSUE_TYPE_ICONS, IssueTypeIcon, issueTypeIcon } from '@/shared/components/issue-type-icon';
import { useStatuses } from '@/modules/core-config/hooks/use-metadata';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { toast } from '@/components/ui/toast';

const ICON_CHOICES = Object.keys(ISSUE_TYPE_ICONS);

/**
 * 任务类型与状态管理（设置 · 任务类型，CAP-A-04 增强重设计）：
 * 类型列表（启用开关 / 拖拽排序 / 统计行）+ 推荐类型库一键添加；
 * 类型详情（基本信息 / 自定义字段 / 状态分组）见 issue-type-detail-section。
 */
export function IssueTypesSettingsSection() {
  const { t } = useTranslation();

  return (
    <PageShell
      variant="standard"
      icon={Shapes}
      iconColor="text-accent-blue"
      title={t('settings.issueTypesTitle', '任务类型 & 状态')}
      actions={
        <HeaderActionButton icon={Plus} label={t('settings.addIssueType', '添加任务类型')} />
      }
      className="bg-background text-foreground"
      contentClassName="space-y-6"
    >
      <TypesListCard />
      <RecommendedTypesCard />
    </PageShell>
  );
}

/** 类型统计行：N 个状态 · M 个自定义字段 · K 个任务（状态为全局共享族） */
function useTypeStats() {
  const statusesQuery = useStatuses();
  const globalStatuses = useMemo(
    () => (statusesQuery.data ?? []).filter((s) => !s.projectId),
    [statusesQuery.data],
  );
  return globalStatuses.length;
}

function TypesListCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirmAction = useConfirm();
  const { types, isLoading } = useIssueTypes(true);
  const updateType = useUpdateIssueType();
  const deleteType = useDeleteIssueType();
  const statusCount = useTypeStats();
  const [createOpen, setCreateOpen] = useState(false);

  // 落放一次性提交：order 以 10 步长重排，仅提交位置变化的项；真实顺序由服务端回读生效
  const persistOrder = async (next: IssueTypeMeta[]) => {
    try {
      await Promise.all(
        next
          .map((ty, index) => ({ id: ty.id, currentOrder: ty.order, order: (index + 1) * 10 }))
          .filter(({ currentOrder, order }) => currentOrder !== order)
          .map(({ id, order }) => updateType.mutateAsync({ id, data: { order } })),
      );
    } catch (e) {
      toast.error((e as Error).message || t('settings.updateFailed'));
    }
  };

  const handleEnabledChange = async (type: IssueTypeMeta, enabled: boolean) => {
    try {
      await updateType.mutateAsync({ id: type.id, data: { enabled } });
      toast.success(t('settings.issueTypesUpdated'));
    } catch (e) {
      toast.error((e as Error).message || t('settings.updateFailed'));
    }
  };

  const handleDelete = async (type: IssueTypeMeta) => {
    const ok = await confirmAction({
      title: t('settings.issueTypesDeleteConfirmTitle'),
      description: t('settings.issueTypesDeleteConfirm', { name: type.name }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteType.mutateAsync(type.id);
      toast.success(t('settings.issueTypesDeleted'));
    } catch (e) {
      toast.error((e as Error).message || t('settings.deleteFailed'));
    }
  };

  return (
    <SectionCard
      title={t('settings.issueTypesListTitle', '任务类型')}
      description={t('settings.issueTypesListDesc', '任务类型及其状态按空间配置。')}
      actions={
        <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
          <Plus size={14} />
          {t('settings.addIssueType', '添加任务类型')}
        </Button>
      }
    >
      <AsyncState
        isLoading={isLoading}
        isEmpty={!isLoading && types.length === 0}
        emptyTitle={t('settings.issueTypesEmpty', '暂无任务类型')}
      >
        <Sortable
          value={types}
          getItemValue={(ty) => ty.id}
          onValueChange={() => {
            // 受控源为 React Query：不做本地乐观重排，落放经 onValueCommit 持久化后回读生效
          }}
          onValueCommit={(next) => void persistOrder(next)}
          render={<div className="divide-y divide-border rounded-lg border border-border" />}
        >
          {types.map((type) => (
            <SortableTypeRow
              key={type.id}
              type={type}
              statusCount={statusCount}
              isDefault={type.key === 'task'}
              onOpen={() => navigate(`/app/settings/issue-types/${type.key}`)}
              onEnabledChange={(enabled) => void handleEnabledChange(type, enabled)}
              onDelete={() => void handleDelete(type)}
            />
          ))}
        </Sortable>
      </AsyncState>
      <CreateTypeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </SectionCard>
  );
}

function SortableTypeRow({
  type,
  statusCount,
  isDefault,
  onOpen,
  onEnabledChange,
  onDelete,
}: {
  type: IssueTypeMeta;
  statusCount: number;
  isDefault: boolean;
  onOpen: () => void;
  onEnabledChange: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <SortableItem
      value={type.id}
      className={`flex items-center gap-3 bg-card px-3 py-2.5 motion-shift ${
        type.enabled ? '' : 'opacity-60'
      }`}
    >
      <SortableItemHandle
        render={<button type="button" aria-label={t('common.reorder', '拖拽排序')} />}
        className="touch-none text-content-text-muted hover:text-content-text-secondary"
      >
        <GripVertical size={14} />
      </SortableItemHandle>
      <IssueTypeIcon meta={type} />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{type.name}</span>
          {isDefault ? <Badge variant="secondary">{t('settings.defaultType', '默认')}</Badge> : null}
          {!type.enabled ? <Badge variant="outline">{t('settings.typeDisabled', '已停用')}</Badge> : null}
        </div>
        <div className="truncate text-xs text-content-text-secondary">
          {type.description || t('settings.issueTypesStats', '{{status}} 个状态 · {{fields}} 个自定义字段 · {{tasks}} 个任务', {
            status: statusCount,
            fields: type.fieldSchema?.length ?? 0,
            tasks: type._count?.tasks ?? 0,
          })}
        </div>
        {type.description ? (
          <div className="truncate text-xs text-content-text-muted">
            {t('settings.issueTypesStats', '{{status}} 个状态 · {{fields}} 个自定义字段 · {{tasks}} 个任务', {
              status: statusCount,
              fields: type.fieldSchema?.length ?? 0,
              tasks: type._count?.tasks ?? 0,
            })}
          </div>
        ) : null}
      </button>
      <Switch
        checked={type.enabled}
        disabled={isDefault}
        onCheckedChange={onEnabledChange}
        aria-label={t('settings.enabled', '启用')}
      />
      <Menu>
        <MenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={t('common.more', '更多')}>
              <MoreHorizontal size={14} />
            </Button>
          }
        />
        <MenuPopup align="end">
          <MenuItem
            variant="destructive"
            disabled={isDefault || type.isSystem}
            onSelect={onDelete}
          >
            <Trash2 size={14} />
            {type.isSystem || isDefault
              ? t('settings.builtinTypeNoDelete', '内置类型不可删除')
              : t('common.delete')}
          </MenuItem>
        </MenuPopup>
      </Menu>
      <button
        type="button"
        onClick={onOpen}
        className="text-content-text-muted hover:text-content-text-secondary"
        aria-label={t('settings.openTypeDetail', '查看类型详情')}
      >
        <ChevronRight size={14} />
      </button>
    </SortableItem>
  );
}

const EMPTY_DRAFT = {
  name: '',
  description: '',
  icon: 'Circle',
  color: '#5E6AD2',
};

function CreateTypeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const createType = useCreateIssueType();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [key, setKey] = useState('');

  const submit = async () => {
    if (!key || !draft.name) {
      toast.error(t('settings.issueTypesRequired'));
      return;
    }
    try {
      await createType.mutateAsync({
        key,
        name: draft.name,
        description: draft.description || undefined,
        icon: draft.icon,
        color: draft.color,
      });
      toast.success(t('settings.issueTypesCreated'));
      setDraft(EMPTY_DRAFT);
      setKey('');
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || t('settings.updateFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.issueTypesCreateTitle', '创建任务类型')}</DialogTitle>
          <DialogDescription>
            {t('settings.issueTypesCreateDesc', '为空间新增一种任务类型，可在详情中继续配置字段与状态。')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-content-text-secondary">{t('settings.issueTypeKeyLabel', '键（小写 slug）')}</label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase())}
              placeholder="story"
              className="font-mono"
              maxLength={32}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-content-text-secondary">{t('settings.issueTypeNameLabel', '名称')}</label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder={t('settings.issueTypesNamePlaceholder')}
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-content-text-secondary">{t('settings.issueTypeDescLabel', '描述')}</label>
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder={t('settings.issueTypeDescPlaceholder', '一句话说明该类型跟踪什么工作')}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-content-text-secondary">{t('settings.issueTypeIcon', '图标')}</label>
            <IconPicker value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-content-text-secondary">{t('settings.issueTypeColor', '颜色')}</label>
            <Input
              type="color"
              value={draft.color}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              className="h-9 w-20 cursor-pointer p-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={createType.isPending}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecommendedTypesCard() {
  const { t } = useTranslation();
  const { byKey } = useIssueTypes();
  const createType = useCreateIssueType();

  const handleAdd = async (rec: (typeof RECOMMENDED_ISSUE_TYPES)[number]) => {
    try {
      await createType.mutateAsync({
        key: rec.key,
        name: t(`settings.recommendedTypes.${rec.key}.name`),
        description: t(`settings.recommendedTypes.${rec.key}.desc`),
        icon: rec.icon,
        color: rec.color,
      });
      toast.success(t('settings.issueTypesCreated'));
    } catch (e) {
      toast.error((e as Error).message || t('settings.updateFailed'));
    }
  };

  return (
    <SectionCard
      title={t('settings.recommended', '推荐')}
      description={t('settings.recommendedDesc', '常用任务类型，一键添加。')}
    >
      <div className="divide-y divide-border rounded-lg border border-border">
        {RECOMMENDED_ISSUE_TYPES.map((rec) => {
          const exists = byKey.has(rec.key);
          const Icon = issueTypeIcon(rec.icon);
          return (
            <div key={rec.key} className="flex items-center gap-3 bg-card px-3 py-2.5">
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${rec.color}1A`, color: rec.color }}
              >
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">
                  {t(`settings.recommendedTypes.${rec.key}.name`)}
                </div>
                <div className="truncate text-xs text-content-text-secondary">
                  {t(`settings.recommendedTypes.${rec.key}.desc`)}
                </div>
              </div>
              <div className="hidden items-center gap-1 sm:flex">
                {rec.categories.map((cat) => (
                  <Badge key={cat} variant="outline">
                    {t(`settings.typeCategory.${cat}`)}
                  </Badge>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={exists || createType.isPending}
                onClick={() => void handleAdd(rec)}
              >
                {exists ? t('settings.added', '已添加') : t('settings.addOne', '添加')}
              </Button>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {ICON_CHOICES.map((iconName) => {
        const Icon = ISSUE_TYPE_ICONS[iconName];
        return (
          <button
            key={iconName}
            type="button"
            onClick={() => onChange(iconName)}
            className={`flex size-7 items-center justify-center rounded-md border motion-shift ${
              value === iconName
                ? 'border-accent-blue bg-accent-blue/10'
                : 'border-transparent hover:bg-accent'
            }`}
            title={iconName}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
