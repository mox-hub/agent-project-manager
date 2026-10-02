import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, ArchiveRestore, Plus, Tags, Trash2 } from 'lucide-react';
import { PageShell } from '@/components/semantic/page-shell';
import { nodeToText } from '@/components/semantic/page-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { HeaderActionButton } from '@/components/semantic/header-action-button';
import { AsyncState } from '@/components/semantic/async-state';
import { DefinitionRow } from '@/components/semantic/definition-row';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { SkeletonTable } from '@/components/ui/skeleton';
import { DataTableShell } from '@/components/semantic/data-table-shell';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { SegmentedTone } from '@/components/ui/segmented-control';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sortable } from '@/components/ui/sortable';
import { ColorPicker, DEFAULT_SWATCHES } from '@/components/ui/color-picker';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { cn } from '@/lib/utils';
import { formatDate } from '@/shared/lib/date-format';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import {
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  type Tag,
} from '../hooks/use-metadata';

type ResourceType = 'project' | 'task' | 'document';
type TagFilter = ResourceType;

// 标签色板 = ColorPicker 全局缺省 DEFAULT_SWATCHES（用户自选数据色，宪法 §5 豁免登记随组件迁移）
const TAG_DEFAULT_COLOR = DEFAULT_SWATCHES[0];

const TAG_FILTERS: ResourceType[] = ['project', 'task', 'document'];

const FILTER_I18N_KEY: Record<ResourceType, string> = {
  project: 'settings.typeProject',
  task: 'settings.typeTask',
  document: 'settings.typeDocument',
};

const FILTER_TONE: Record<ResourceType, SegmentedTone> = {
  project: 'blue',
  task: 'green',
  document: 'purple',
};

/** 单行表格列宽类（行与列头必须同款保证列对齐） */
const NAME_COL = 'w-40';
const USAGE_COL = 'w-28';
const UPDATED_COL = 'w-28';

interface TagDraft {
  name: string;
  color: string;
  description: string;
  /** 标签归属的单一功能域；创建时默认取当前筛选域，创建后不可更改 */
  resourceType: string;
}

/**
 * 设置·标签（管理面统一批 2026-10-01）：域分段 + DefinitionRow 行卡
 * （xl 色底框图标 + 双行文本 + hover 操作 + 拖拽排序），行点击编辑。
 */
export function TagManager() {
  const { t } = useTranslation();
  const confirmAction = useConfirm();
  const { isAdmin } = useAuth();
  const { data: tags = [], isLoading, error, refetch } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [filter, setFilter] = useState<TagFilter>('project');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);

  const filteredTags = useMemo(
    () => tags.filter((tag) => tag.resourceType === filter),
    [tags, filter],
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (tag: Tag) => {
    if (!isAdmin) return;
    setEditing(tag);
    setDialogOpen(true);
  };

  const handleArchive = async (tag: Tag) => {
    try {
      await updateTag.mutateAsync({
        id: tag.id,
        data: { ...tag, isArchived: !tag.isArchived },
      });
    } catch {
      toast.error(t('settings.saveFailed'));
    }
  };

  const handleDelete = async (tag: Tag) => {
    const ok = await confirmAction({
      title: t('common.delete'),
      description: t('common.deleteConfirm'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteTag.mutateAsync(tag.id);
    } catch {
      toast.error(t('settings.deleteFailed'));
    }
  };

  // 拖拽排序：落放一次性提交，仅并发回写 order 发生变化的项
  const handleReorder = async (next: Tag[]) => {
    try {
      await Promise.all(
        next
          .map((tag, index) => ({ tag, order: index }))
          .filter(({ tag, order }) => tag.order !== order)
          .map(({ tag, order }) =>
            updateTag.mutateAsync({ id: tag.id, data: { ...tag, order } }),
          ),
      );
    } catch {
      toast.error(t('settings.saveFailed'));
    }
  };

  const handleSubmit = async (draft: TagDraft) => {
    try {
      if (editing) {
        await updateTag.mutateAsync({ id: editing.id, data: draft });
      } else {
        await createTag.mutateAsync(draft);
      }
      setDialogOpen(false);
      setEditing(null);
    } catch {
      toast.error(t('settings.saveFailed'));
    }
  };

  return (
    <PageShell
      variant="standard"
      contentClassName="gap-4"
      aiPage="settings.labels"
      className="bg-background text-foreground"
      title={t('settings.labels')}
      favorites={<FavoriteToggle label={nodeToText(t('settings.labels')).trim()} />}
      icon={Tags}
      iconColor="text-accent-blue"
      metrics={[{ id: 'total', label: t('settings.labels'), value: filteredTags.length }]}
      actions={
        // 标签创建是管理员能力（服务端 RolesGuard），普通用户隐藏入口避免必 403
        isAdmin ? (
          <HeaderActionButton icon={Plus} label={t('settings.addLabel')} onClick={openCreate} />
        ) : null
      }
    >
      <div className="flex justify-center">
        <SegmentedControl<TagFilter>
          variant="rect"
          value={filter}
          onChange={setFilter}
          options={TAG_FILTERS.map((f) => ({
            value: f,
            label: t(FILTER_I18N_KEY[f]),
            tone: FILTER_TONE[f],
          }))}
        />
      </div>

      <AsyncState
        isLoading={isLoading}
        error={error ? t('settings.loadFailed') : null}
        onRetry={() => void refetch()}
        isEmpty={filteredTags.length === 0}
        emptyTitle={t('settings.noTags')}
        loadingFallback={
          <DataTableShell>
            <SkeletonTable rows={6} columns={3} />
          </DataTableShell>
        }
      >
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          {/* 列头（与行同款列宽类保证对齐） */}
          <div className="flex items-center gap-2.5 border-b border-border/60 px-1.5 py-2 text-3xs font-medium text-content-text-muted">
            <span className="w-3.5 shrink-0" />
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="size-3 shrink-0" />
              <span className={cn('shrink-0', NAME_COL)}>{t('settings.labelName')}</span>
              <span className="min-w-0 flex-1">{t('settings.labelDesc')}</span>
            </div>
            <span className={cn('shrink-0', USAGE_COL)}>{t('settings.labelUsage')}</span>
            <span className={cn('shrink-0', UPDATED_COL)}>{t('settings.labelUpdatedAt')}</span>
            <span className="w-14 shrink-0" />
          </div>
          <Sortable
            value={filteredTags}
            getItemValue={(tag) => tag.id}
            onValueChange={() => {
              // 受控源为 React Query：落放经 onValueCommit 持久化后回读生效
            }}
            onValueCommit={isAdmin ? (next) => void handleReorder(next) : undefined}
            render={<div className="divide-y divide-border/60" />}
          >
            {filteredTags.map((tag) => (
              <DefinitionRow
                key={tag.id}
                id={tag.id}
                singleLine
                onClick={() => openEdit(tag)}
                leading={
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color || TAG_DEFAULT_COLOR }}
                  />
                }
                title={tag.name}
                description={tag.description || undefined}
                trailing={
                  <>
                    <span className={cn('shrink-0 text-xs text-content-text-muted', USAGE_COL)}>
                      {t('settings.labelUsageCount', { count: tag.usageCount ?? 0 })}
                    </span>
                    <span className={cn('shrink-0 text-xs text-content-text-muted', UPDATED_COL)}>
                      {formatDate(tag.updatedAt)}
                    </span>
                    {isAdmin ? (
                      <div className="mr-1 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={tag.isArchived ? t('settings.restore') : t('common.archive')}
                          title={tag.isArchived ? t('settings.restore') : t('common.archive')}
                          disabled={updateTag.isPending}
                          onClick={() => void handleArchive(tag)}
                        >
                          {tag.isArchived ? <ArchiveRestore /> : <Archive />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t('common.delete')}
                          title={t('common.delete')}
                          disabled={deleteTag.isPending}
                          className="text-destructive hover:text-destructive"
                          onClick={() => void handleDelete(tag)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ) : (
                      <span className="w-14 shrink-0" />
                    )}
                  </>
                }
              />
            ))}
          </Sortable>
        </section>
      </AsyncState>

      <TagDialog
        key={`${editing?.id ?? 'new'}-${String(dialogOpen)}`}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        editing={editing}
        defaultResourceType={filter}
        onSubmit={handleSubmit}
        saving={createTag.isPending || updateTag.isPending}
      />
    </PageShell>
  );
}

function TagDialog({
  open,
  onOpenChange,
  editing,
  defaultResourceType,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Tag | null;
  defaultResourceType: TagFilter;
  onSubmit: (draft: TagDraft) => void | Promise<void>;
  saving?: boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<TagDraft>(() =>
    editing
      ? {
          name: editing.name,
          color: editing.color || TAG_DEFAULT_COLOR,
          description: editing.description || '',
          resourceType: editing.resourceType || defaultResourceType,
        }
      : { name: '', color: TAG_DEFAULT_COLOR, description: '', resourceType: defaultResourceType },
  );

  const submit = async () => {
    if (!draft.name.trim()) return;
    await onSubmit({ ...draft, name: draft.name.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? t('settings.editLabel') : t('settings.addLabel')}</DialogTitle>
          <DialogDescription>{t('settings.labelFormDesc')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <div className="text-xs text-content-text-secondary">
              {t('settings.labelTypes')}
            </div>
            <SelectField
              value={draft.resourceType}
              onChange={(e) => setDraft({ ...draft, resourceType: e.target.value })}
              disabled={Boolean(editing)}
            >
              {TAG_FILTERS.map((type) => (
                <SelectFieldOption key={type} value={type}>
                  {t(FILTER_I18N_KEY[type])}
                </SelectFieldOption>
              ))}
            </SelectField>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs text-content-text-secondary">
              {t('settings.labelName')} *
            </div>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder={t('settings.labelNamePlaceholder')}
              maxLength={30}
            />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs text-content-text-secondary">
              {t('settings.labelColor')}
            </div>
            <ColorPicker
              value={draft.color}
              onValueChange={(color) => setDraft({ ...draft, color })}
              allowCustom={false}
              placeholder={t('settings.labelColor')}
            />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs text-content-text-secondary">
              {t('settings.labelDesc')}
            </div>
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder={t('settings.labelDescPlaceholder')}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving || !draft.name.trim()}>
            {editing ? t('common.save') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
