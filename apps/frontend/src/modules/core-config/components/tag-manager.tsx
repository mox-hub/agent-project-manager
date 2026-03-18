import { useState } from 'react';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag, type Tag } from '../hooks/use-metadata';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { Pencil, GripVertical, Trash2, Archive } from 'lucide-react';

const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#6b7280',
];

const RESOURCE_TYPES = ['project', 'task', 'document', 'iteration'];

type TagFilter = 'all' | 'project' | 'task';

const TAG_FILTERS: { id: TagFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'project', label: '项目' },
  { id: 'task', label: '任务' },
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
  const confirmAction = useConfirm();
  const { data: tags = [], isLoading, error } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [formData, setFormData] = useState<TagFormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<TagFilter>('all');

  // Filter tags based on selected view
  const filteredTags = tags.filter((tag) => {
    const types = (tag.resourceTypes as string[]) || [];
    if (filter === 'all') return true;
    if (filter === 'project') return types.includes('project') || types.length === 0;
    if (filter === 'task') return types.includes('task');
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateTag.mutateAsync({ id: editingId, data: formData });
      } else {
        await createTag.mutateAsync(formData);
      }
      setFormData(initialFormData);
      setEditingId(null);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save tag:', err);
    }
  };

  const handleEdit = (tag: Tag) => {
    setFormData({
      name: tag.name,
      color: tag.color || TAG_COLORS[0],
      description: tag.description || '',
      resourceTypes: (tag.resourceTypes as string[]) || [],
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
      title: '删除标签',
      description: '确定要删除该标签吗？',
      confirmText: '删除',
      cancelText: '取消',
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
    setFormData(initialFormData);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const toggleResourceType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      resourceTypes: prev.resourceTypes.includes(type)
        ? prev.resourceTypes.filter(t => t !== type)
        : [...prev.resourceTypes, type],
    }));
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
    const newTags = [...tags];
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

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-content-text">全局标签管理</h2>
        <p className="mt-1 text-sm text-content-text-secondary">管理与分类所有 AI 项目中的标签。</p>
        <div className="mt-4 p-4 text-content-text-secondary">加载中…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-content-text">全局标签管理</h2>
        <p className="mt-1 text-sm text-content-text-secondary">管理与分类所有 AI 项目中的标签。</p>
        <div className="mt-4 p-4 text-red-500">加载标签失败</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-content-text">全局标签管理</h2>
          <p className="mt-1 text-sm text-content-text-secondary">
            管理与分类所有 AI 项目中的标签。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as TagFilter)}>
            <TabsList>
              {TAG_FILTERS.map((f) => (
                <TabsTrigger key={f.id} value={f.id}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {!isFormOpen && (
            <Button onClick={() => setIsFormOpen(true)} variant="default" size="sm">
              + 添加标签
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-content-border overflow-hidden">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="border-b border-content-border bg-content-bg-secondary/50 hover:bg-content-bg-secondary/50">
              <TableHead className="py-1.5 px-2 font-medium text-content-text-secondary w-8"></TableHead>
              <TableHead className="py-1.5 px-3 font-medium text-content-text-secondary">标签名称</TableHead>
              <TableHead className="py-1.5 px-3 font-medium text-content-text-secondary">说明</TableHead>
              <TableHead className="py-1.5 px-3 font-medium text-content-text-secondary w-10">颜色</TableHead>
              <TableHead className="py-1.5 px-3 font-medium text-content-text-secondary w-16">使用数</TableHead>
              <TableHead className="py-1.5 px-2 text-right font-medium text-content-text-secondary w-28">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTags.map((tag, index) => (
              <TableRow
                key={tag.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  border-b border-content-border last:border-b-0
                  hover:bg-content-bg-secondary/30 transition-colors
                  ${draggedIndex === index ? 'opacity-50' : ''}
                  ${dragOverIndex === index ? 'bg-content-bg-secondary/50' : ''}
                `}
              >
                <TableCell className="py-1.5 px-2">
                  <button
                    type="button"
                    className="p-0.5 rounded text-content-text-secondary hover:text-content-text hover:bg-content-bg-secondary cursor-grab active:cursor-grabbing"
                    title="拖动排序"
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
                  {tag.projectId && (
                    <span className="ml-1.5 text-xs text-content-text-secondary">(项目)</span>
                  )}
                </TableCell>
                <TableCell className="py-1.5 px-3 text-content-text-secondary max-w-xs truncate">
                  {tag.description || '—'}
                </TableCell>
                <TableCell className="py-1.5 px-3">
                  <span
                    className="inline-block w-4 h-4 rounded-full border border-content-border shrink-0"
                    style={{ backgroundColor: tag.color || '#6b7280' }}
                    title={tag.color || ''}
                  />
                </TableCell>
                <TableCell className="py-1.5 px-3 text-content-text-secondary">—</TableCell>
                <TableCell className="py-1.5 px-2 text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleEdit(tag)}
                      className="p-1 rounded text-content-text-secondary hover:text-content-text hover:bg-content-bg-secondary"
                      title="编辑"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchive(tag)}
                      className="p-1 rounded text-content-text-secondary hover:text-content-text hover:bg-content-bg-secondary"
                      title="存档"
                    >
                      <Archive size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tag.id)}
                      disabled={deleteTag.isPending}
                      className="p-1 rounded text-red-500 hover:bg-red-500/10"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 p-3 rounded-lg border border-content-border bg-content-bg-secondary/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-text-secondary mb-1">名称 *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="标签名称"
                required
                className="h-8"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-text-secondary mb-1">颜色</label>
              <div className="flex flex-wrap gap-1">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-5 h-5 rounded-full border-2 ${
                      formData.color === color ? 'border-content-text ring-1 ring-content-text' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-content-text-secondary mb-1">说明</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="标签说明"
              className="h-8"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-text-secondary mb-1">资源类型</label>
            <div className="flex flex-wrap gap-1">
              {RESOURCE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleResourceType(type)}
                  className={`px-2 py-0.5 text-xs rounded-full border ${
                    formData.resourceTypes.includes(type)
                      ? 'bg-content-primary text-content-bg border-content-primary'
                      : 'bg-content-bg border-content-border text-content-text-secondary'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="default" size="sm" disabled={createTag.isPending || updateTag.isPending}>
              {editingId ? '更新' : '创建'} 标签
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              取消
            </Button>
          </div>
        </form>
      )}

      {tags.length === 0 && !isLoading && (
        <p className="text-sm text-content-text-secondary">暂无标签，请添加第一个标签。</p>
      )}
    </div>
  );
}

