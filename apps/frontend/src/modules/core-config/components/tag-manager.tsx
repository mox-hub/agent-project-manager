import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag, type Tag } from '../hooks/use-metadata';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { Pencil, GripVertical, Trash2, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#6b7280',
];

type ResourceType = 'project' | 'task' | 'bug' | 'document';
type TagFilter = ResourceType;

const TAG_FILTERS: { id: TagFilter; label: string; labelEn: string }[] = [
  { id: 'project', label: '项目', labelEn: 'Project' },
  { id: 'task', label: '任务', labelEn: 'Task' },
  { id: 'bug', label: 'Bug', labelEn: 'Bug' },
  { id: 'document', label: '文档', labelEn: 'Document' },
];

interface TagFormData {
  name: string;
  color: string;
  description: string;
  resourceTypes: string[];
}

const initialFormData: TagFormData = {
  name: '',
  color: TAG_COLORS[0],
  description: '',
  resourceTypes: [],
};

export function TagManager() {
  const { t, i18n } = useTranslation();
  const confirmAction = useConfirm();
  const { data: tags = [], isLoading, error } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const tagForm = useForm<TagFormData>({
    defaultValues: initialFormData,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<TagFilter>('project');

  // Filter tags based on selected resource type
  const filteredTags = tags.filter((tag) => {
    const types = (tag.resourceTypes as string[]) || [];
    if (filter === 'project') return types.includes('project') || types.length === 0;
    if (filter === 'task') return types.includes('task');
    if (filter === 'bug') return types.includes('bug');
    if (filter === 'document') return types.includes('document');
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = tagForm.getValues();
      const finalData = {
        ...formData,
        resourceTypes: formData.resourceTypes.length > 0 ? formData.resourceTypes : [filter],
      };
      if (editingId) {
        await updateTag.mutateAsync({ id: editingId, data: finalData });
      } else {
        await createTag.mutateAsync(finalData);
      }
      tagForm.reset(initialFormData);
      setEditingId(null);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save tag:', err);
    }
  };

  const handleEdit = (tag: Tag) => {
    const types = (tag.resourceTypes as string[]) || [];
    tagForm.reset({
      name: tag.name,
      color: tag.color || TAG_COLORS[0],
      description: tag.description || '',
      resourceTypes: types.length > 0 ? types : [filter],
    });
    setEditingId(tag.id);
    setIsFormOpen(true);
  };

  const handleArchive = async (tag: Tag) => {
    try {
      await updateTag.mutateAsync({
        id: tag.id,
        data: {
          ...tag,
          isArchived: !(tag as Tag & { isArchived?: boolean }).isArchived,
        },
      });
    } catch (err) {
      console.error('Failed to archive tag:', err);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmAction({
      title: t('common.delete'),
      description: t('common.deleteConfirm'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (ok) {
      try {
        await deleteTag.mutateAsync(id);
      } catch (err) {
        console.error('Failed to delete tag:', err);
      }
    }
  };

  const handleCancel = () => {
    tagForm.reset(initialFormData);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const toggleResourceType = (type: string) => {
    const current = tagForm.getValues('resourceTypes');
    tagForm.setValue(
      'resourceTypes',
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    );
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = draggedIndex;

    if (dragIndex === null || dragIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder locally
    const newTags = [...filteredTags];
    const [removed] = newTags.splice(dragIndex, 1);
    newTags.splice(dropIndex, 0, removed);

    // Update order for all tags
    try {
      for (let i = 0; i < newTags.length; i++) {
        await updateTag.mutateAsync({
          id: newTags[i].id,
          data: { ...newTags[i], order: i },
        });
      }
    } catch (err) {
      console.error('Failed to reorder tags:', err);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const isLoadingState = isLoading;
  const hasError = !!error;

  return (
    <div className="space-y-4">
      {/* 类型切换 Tabs */}
      <div className="flex items-center justify-between gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as TagFilter)}>
          <TabsList>
            {TAG_FILTERS.map((f) => (
              <TabsTrigger key={f.id} value={f.id}>
                {i18n.language.startsWith('zh') ? f.label : f.labelEn}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredTags.length} {t('settings.labels')}
          </span>
          {!isFormOpen && (
            <Button onClick={() => setIsFormOpen(true)} variant="default" size="sm">
              + {t('settings.addLabel')}
            </Button>
          )}
        </div>
      </div>

      {/* 标签表格 */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/50/50 hover:bg-muted/50/50">
              <TableHead className="py-1.5 px-2 font-medium text-muted-foreground w-8"></TableHead>
              <TableHead className="py-1.5 px-3 font-medium text-muted-foreground">{t('settings.labelName')}</TableHead>
              <TableHead className="py-1.5 px-3 font-medium text-muted-foreground">{t('settings.labelDesc')}</TableHead>
              <TableHead className="py-1.5 px-3 font-medium text-muted-foreground w-10">{t('settings.labelColor')}</TableHead>
              <TableHead className="py-1.5 px-3 font-medium text-muted-foreground w-16">{t('settings.labelUsage')}</TableHead>
              <TableHead className="py-1.5 px-2 text-right font-medium text-muted-foreground w-28">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingState ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            ) : hasError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-accent-red">
                  {t('settings.loadFailed')}
                </TableCell>
              </TableRow>
            ) : filteredTags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t('settings.noTags')}
                </TableCell>
              </TableRow>
            ) : (
              filteredTags.map((tag, index) => (
                <TableRow
                  key={tag.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'border-b border-border last:border-b-0',
                    'hover:bg-muted/50/30 transition-colors',
                    draggedIndex === index && 'opacity-50',
                    dragOverIndex === index && 'bg-muted/50/50'
                  )}
                >
                  <TableCell className="py-1.5 px-2">
                    <button
                      type="button"
                      className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-grab active:cursor-grabbing"
                      title={t('common.dragToSort')}
                    >
                      <GripVertical size={12} />
                    </button>
                  </TableCell>
                  <TableCell className="py-1.5 px-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: tag.color || '#6b7280' }}
                    >
                      {tag.name}
                    </span>
                  </TableCell>
                  <TableCell className="py-1.5 px-3 text-muted-foreground max-w-xs truncate">
                    {tag.description || '—'}
                  </TableCell>
                  <TableCell className="py-1.5 px-3">
                    <span
                      className="inline-block w-4 h-4 rounded-full border border-border shrink-0"
                      style={{ backgroundColor: tag.color || '#6b7280' }}
                      title={tag.color || ''}
                    />
                  </TableCell>
                  <TableCell className="py-1.5 px-3 text-muted-foreground">—</TableCell>
                  <TableCell className="py-1.5 px-2 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(tag)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        title={t('common.edit')}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchive(tag)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        title={t('common.archive')}
                      >
                        <Archive size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tag.id)}
                        disabled={deleteTag.isPending}
                        className="p-1 rounded text-accent-red hover:bg-accent-red-light"
                        title={t('common.delete')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 添加/编辑表单 */}
      {isFormOpen && (
        <Form {...tagForm}>
          <form
            onSubmit={handleSubmit}
            className="space-y-3 p-4 rounded-lg border border-border bg-muted/50/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={tagForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      {t('settings.labelName')} *
                    </FormLabel>
                    <Input
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={t('settings.labelNamePlaceholder')}
                      required
                      className="h-9"
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={tagForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      {t('settings.labelColor')}
                    </FormLabel>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => field.onChange(color)}
                          className={cn(
                            'w-6 h-6 rounded-full border-2 transition-all',
                            field.value === color
                              ? 'border-foreground ring-2 ring-offset-1 ring-offset-background ring-foreground'
                              : 'border-transparent hover:scale-110'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={tagForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    {t('settings.labelDesc')}
                  </FormLabel>
                  <Input
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder={t('settings.labelDescPlaceholder')}
                    className="h-9"
                  />
                </FormItem>
              )}
            />
            <FormField
              control={tagForm.control}
              name="resourceTypes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    {t('settings.labelTypes')}
                  </FormLabel>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {TAG_FILTERS.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => toggleResourceType(type.id)}
                        className={cn(
                          'px-3 py-1 text-xs rounded-full border transition-all',
                          field.value.includes(type.id)
                            ? 'bg-accent-blue text-white border-accent-blue'
                            : 'bg-background border-border text-muted-foreground hover:border-muted-foreground'
                        )}
                      >
                        {i18n.language.startsWith('zh') ? type.label : type.labelEn}
                      </button>
                    ))}
                  </div>
                </FormItem>
              )}
            />
            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={createTag.isPending || updateTag.isPending}
              >
                {editingId ? t('common.update') : t('common.create')} {t('settings.label')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
