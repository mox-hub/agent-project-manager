import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Archive, ArchiveRestore, GripVertical, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
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
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import {
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  type Tag,
} from '../hooks/use-metadata';
import { cn } from '@/lib/utils';

// 用户自选色板：存库的用户数据色值，非 UI 语义色（宪法 §5 豁免，见 PRINCIPLES 附录登记）
const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#6b7280',
];

type ResourceType = 'project' | 'task' | 'bug' | 'document';
type TagFilter = ResourceType;

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
    defaultValues: { name: '', color: TAG_COLORS[0], description: '', resourceType: filter },
  });
  const [editing, setEditing] = useState<Tag | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredTags = tags.filter((tag) => tag.resourceType === filter);

  const openCreate = () => {
    tagForm.reset({ name: '', color: TAG_COLORS[0], description: '', resourceType: filter });
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (tag: Tag) => {
    tagForm.reset({
      name: tag.name,
      color: tag.color || TAG_COLORS[0],
      description: tag.description || '',
      resourceType: tag.resourceType || filter,
    });
    setEditing(tag);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    tagForm.reset({ name: '', color: TAG_COLORS[0], description: '', resourceType: filter });
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

  // 拖拽排序：本地重排后按新顺序回写 order
  const handleDrop = async (dropIndex: number, dragIndex: number) => {
    if (dragIndex === dropIndex) return;
    const newTags = [...filteredTags];
    const [removed] = newTags.splice(dragIndex, 1);
    newTags.splice(dropIndex, 0, removed);
    try {
      for (let i = 0; i < newTags.length; i++) {
        if (newTags[i].order !== i) {
          await updateTag.mutateAsync({ id: newTags[i].id, data: { ...newTags[i], order: i } });
        }
      }
    } catch {
      toast.error(t('settings.saveFailed'));
    }
  };

  return (
    <PageShell aiPage="settings.labels" className="bg-background text-foreground">
      <PageHeader
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
      />

      <div className="p-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
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
                onReorder={handleDrop}
                deleting={deleteTag.isPending}
                archiving={updateTag.isPending}
              />
            </DataTableShell>
          </AsyncState>
        </div>
      </div>

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
                    <div className="flex flex-wrap gap-1.5">
                      {TAG_COLORS.map((color) => (
                        <Button
                          key={color}
                          type="button"
                          variant="outline"
                          size="xs"
                          aria-pressed={field.value === color}
                          aria-label={color}
                          onClick={() => field.onChange(color)}
                          className={cn(
                            'size-6 rounded-full p-0',
                            field.value === color &&
                              'ring-2 ring-ring ring-offset-2 ring-offset-background',
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
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
  onReorder: (dropIndex: number, dragIndex: number) => void;
  deleting: boolean;
  archiving: boolean;
}

function TagTable({ tags, onEdit, onArchive, onDelete, onReorder, deleting, archiving }: TagTableProps) {
  const { t } = useTranslation();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
      <TableBody>
        {tags.map((tag, index) => (
          <TableRow
            key={tag.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverIndex(index);
            }}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) onReorder(index, dragIndex);
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            className={cn(
              dragIndex === index && 'opacity-50',
              dragOverIndex === index && dragIndex !== null && dragIndex !== index && 'bg-accent',
            )}
          >
            <TableCell className="px-2 py-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t('common.dragToSort')}
                title={t('common.dragToSort')}
                className="cursor-grab text-muted-foreground active:cursor-grabbing"
              >
                <GripVertical />
              </Button>
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
