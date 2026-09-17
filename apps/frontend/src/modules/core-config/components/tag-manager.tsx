import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Archive, ArchiveRestore, GripVertical, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { AsyncState } from '@/components/ui/async-state';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { SkeletonTable } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { toast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable';
import { ColorPicker, DEFAULT_SWATCHES } from '@/components/ui/color-picker';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import {
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  type Tag,
} from '../hooks/use-metadata';

type ResourceType = 'project' | 'task' | 'bug' | 'document';
type TagFilter = ResourceType;

// 标签色板 = ColorPicker 全局缺省 DEFAULT_SWATCHES（用户自选数据色，宪法 §5 豁免登记随组件迁移）
const TAG_DEFAULT_COLOR = DEFAULT_SWATCHES[0];

const TAG_FILTERS: ResourceType[] = ['project', 'task', 'bug', 'document'];

const FILTER_I18N_KEY: Record<ResourceType, string> = {
  project: 'settings.typeProject',
  task: 'settings.typeTask',
  bug: 'settings.typeBug',
  document: 'settings.typeDocument',
};

const FILTER_TONE: Record<ResourceType, SegmentedTone> = {
  project: 'blue',
  task: 'green',
  bug: 'red',
  document: 'purple',
};

interface TagFormData {
  name: string;
  color: string;
  description: string;
  /** 标签归属的单一功能域；创建时默认取当前筛选页签，创建后不可更改 */
  resourceType: string;
}

export function TagManager() {
  const { t } = useTranslation();
  const confirmAction = useConfirm();
  const { isAdmin } = useAuth();
  const { data: tags = [], isLoading, error, refetch } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [filter, setFilter] = useState<TagFilter>('project');
  const tagForm = useForm<TagFormData>({
    defaultValues: { name: '', color: TAG_DEFAULT_COLOR, description: '', resourceType: filter },
  });
  const [editing, setEditing] = useState<Tag | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredTags = tags.filter((tag) => tag.resourceType === filter);

  const openCreate = () => {
    tagForm.reset({ name: '', color: TAG_DEFAULT_COLOR, description: '', resourceType: filter });
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (tag: Tag) => {
    tagForm.reset({
      name: tag.name,
      color: tag.color || TAG_DEFAULT_COLOR,
      description: tag.description || '',
      resourceType: tag.resourceType || filter,
    });
    setEditing(tag);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    tagForm.reset({ name: '', color: TAG_DEFAULT_COLOR, description: '', resourceType: filter });
    setEditing(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = tagForm.getValues();
    try {
      if (editing) {
        await updateTag.mutateAsync({ id: editing.id, data: formData });
      } else {
        await createTag.mutateAsync(formData);
      }
      closeForm();
    } catch {
      toast.error(t('settings.saveFailed'));
    }
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

  // 拖拽排序：落放一次性提交，仅并发回写 order 发生变化的项（对齐 issue-types-section 口径）
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

  return (
    <PageShell
      variant="standard"
      contentClassName="gap-4"
      aiPage="settings.labels"
      className="bg-background text-foreground"
      title={t('settings.labels')}
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
                <SkeletonTable rows={6} columns={4} />
              </DataTableShell>
            }
          >
            <DataTableShell>
              <TagTable
                tags={filteredTags}
                onEdit={openEdit}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onReorder={handleReorder}
                deleting={deleteTag.isPending}
                archiving={updateTag.isPending}
              />
            </DataTableShell>
          </AsyncState>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('settings.editLabel') : t('settings.addLabel')}</DialogTitle>
            <DialogDescription>{t('settings.labelFormDesc')}</DialogDescription>
          </DialogHeader>
          <Form {...tagForm}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FormField
                control={tagForm.control}
                name="resourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.labelTypes')}</FormLabel>
                    <NativeSelect
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      disabled={Boolean(editing)}
                    >
                      {TAG_FILTERS.map((type) => (
                        <NativeSelectOption key={type} value={type}>
                          {t(FILTER_I18N_KEY[type])}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FormItem>
                )}
              />
              <FormField
                control={tagForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.labelName')} *</FormLabel>
                    <Input
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={t('settings.labelNamePlaceholder')}
                      required
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={tagForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.labelColor')}</FormLabel>
                    <ColorPicker
                      value={field.value}
                      onValueChange={field.onChange}
                      allowCustom={false}
                      placeholder={t('settings.labelColor')}
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={tagForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.labelDesc')}</FormLabel>
                    <Input
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={t('settings.labelDescPlaceholder')}
                    />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeForm}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createTag.isPending || updateTag.isPending}>
                  {(createTag.isPending || updateTag.isPending) && <Spinner size="sm" />}
                  {editing ? t('common.save') : t('common.create')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

interface TagTableProps {
  tags: Tag[];
  onEdit: (tag: Tag) => void;
  onArchive: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
  onReorder: (next: Tag[]) => void;
  deleting: boolean;
  archiving: boolean;
}

/** 标签表（Sort 语义 = 同列表重排）：tbody/tr 经 render 槽渲染为表格元素，把手承载拖拽（键盘可达） */
function TagTable({ tags, onEdit, onArchive, onDelete, onReorder, deleting, archiving }: TagTableProps) {
  const { t } = useTranslation();

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableHead className="w-8 px-2" />
          <TableHead>{t('settings.labelName')}</TableHead>
          <TableHead>{t('settings.labelDesc')}</TableHead>
          <TableHead className="w-28 text-right">{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <Sortable
        value={tags}
        getItemValue={(tag) => tag.id}
        onValueChange={onReorder}
        render={<TableBody />}
      >
        {tags.map((tag) => (
          <SortableItem key={tag.id} value={tag.id} render={<TableRow />}>
            <TableCell className="px-2 py-1.5">
              <SortableItemHandle
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t('common.dragToSort')}
                    title={t('common.dragToSort')}
                  />
                }
                className="touch-none text-muted-foreground"
              >
                <GripVertical />
              </SortableItemHandle>
            </TableCell>
            <TableCell className="py-1.5">
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: tag.color || '#6b7280' }}
              >
                {tag.name}
              </span>
            </TableCell>
            <TableCell className="max-w-50 truncate py-1.5 text-muted-foreground">
              {tag.description || '—'}
            </TableCell>
            <TableCell className="py-1.5 text-right">
              <div className="flex items-center justify-end gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('common.edit')}
                  title={t('common.edit')}
                  onClick={() => onEdit(tag)}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={tag.isArchived ? t('settings.restore') : t('common.archive')}
                  title={tag.isArchived ? t('settings.restore') : t('common.archive')}
                  disabled={archiving}
                  onClick={() => onArchive(tag)}
                >
                  {tag.isArchived ? <ArchiveRestore /> : <Archive />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('common.delete')}
                  title={t('common.delete')}
                  disabled={deleting}
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(tag)}
                >
                  <Trash2 />
                </Button>
              </div>
            </TableCell>
          </SortableItem>
        ))}
      </Sortable>
    </Table>
  );
}
