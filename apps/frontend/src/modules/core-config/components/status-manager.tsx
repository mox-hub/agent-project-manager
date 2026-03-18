import { useState } from 'react';
import { useStatuses, useCreateStatus, useUpdateStatus, useDeleteStatus, type StatusDefinition } from '../hooks/use-metadata';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Circle, Zap, Eye, CheckCircle, MoreVertical, Layers, ArrowRight } from 'lucide-react';

const STATUS_TYPES = ['task', 'project'];

interface StatusFormData {
  type: string;
  key: string;
  name: string;
  order: number;
  isFinal: boolean;
  isBlockedState: boolean;
  allowedNextStatusKeys: string[];
}

const initialFormData: StatusFormData = {
  type: 'task',
  key: '',
  name: '',
  order: 0,
  isFinal: false,
  isBlockedState: false,
  allowedNextStatusKeys: [],
};

function getStatusDescription(status: StatusDefinition): string {
  if (status.isFinal) return '任务已完成并归档。';
  if (status.isBlockedState) return '当前处于阻塞状态。';
  const k = (status.key || '').toLowerCase();
  const n = (status.name || '').toLowerCase();
  if (k === 'todo' || n.includes('待办')) return '新任务的初始状态。';
  if (k === 'in_progress' || n.includes('进行')) return '正在处理中。';
  if (k === 'review' || n.includes('评审')) return '等待审批或 QA。';
  if (k === 'done' || n.includes('完成')) return '任务已成功完成。';
  return '工作流中的状态。';
}

function getStatusIcon(status: StatusDefinition) {
  const k = (status.key || '').toLowerCase();
  const n = (status.name || '').toLowerCase();
  if (k === 'todo' || n.includes('待办')) return { Icon: Circle, color: 'text-content-text-muted' };
  if (k === 'in_progress' || n.includes('进行')) return { Icon: Zap, color: 'text-blue-500' };
  if (k === 'review' || n.includes('评审')) return { Icon: Eye, color: 'text-amber-500' };
  if (k === 'done' || n.includes('完成')) return { Icon: CheckCircle, color: 'text-emerald-500' };
  return { Icon: Circle, color: 'text-content-text-muted' };
}

function getStatusDotColor(status: StatusDefinition): string {
  const k = (status.key || '').toLowerCase();
  const n = (status.name || '').toLowerCase();
  if (k === 'done' || n.includes('完成')) return 'bg-emerald-500';
  if (k === 'in_progress' || n.includes('进行')) return 'bg-blue-500';
  if (k === 'review' || n.includes('评审')) return 'bg-amber-500';
  return 'bg-content-text-muted';
}

interface TransitionRow {
  fromStatus: StatusDefinition;
  toStatus: StatusDefinition;
  fromKey: string;
  toKey: string;
}

function buildTransitions(statuses: StatusDefinition[], typeFilter: string): TransitionRow[] {
  const list = typeFilter === '' ? statuses : statuses.filter(s => s.type === typeFilter);
  const byKey = new Map(list.map(s => [s.key, s]));
  const rows: TransitionRow[] = [];
  list.sort((a, b) => a.order - b.order);
  for (const from of list) {
    const nextKeys = (from.allowedNextStatusKeys as string[]) || [];
    for (const toKey of nextKeys) {
      const toStatus = byKey.get(toKey);
      if (toStatus) rows.push({ fromStatus: from, toStatus, fromKey: from.key, toKey });
    }
  }
  return rows;
}

export function StatusManager() {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const { data: statuses = [], isLoading, error } = useStatuses(undefined, typeFilter || undefined);
  const createStatus = useCreateStatus();
  const updateStatus = useUpdateStatus();
  const deleteStatus = useDeleteStatus();

  const [formData, setFormData] = useState<StatusFormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateStatus.mutateAsync({ id: editingId, data: formData });
      } else {
        await createStatus.mutateAsync(formData);
      }
      setFormData(initialFormData);
      setEditingId(null);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save status:', err);
    }
  };

  const handleEdit = (status: StatusDefinition) => {
    setFormData({
      type: status.type,
      key: status.key,
      name: status.name,
      order: status.order,
      isFinal: status.isFinal,
      isBlockedState: status.isBlockedState,
      allowedNextStatusKeys: (status.allowedNextStatusKeys as string[]) || [],
    });
    setEditingId(status.id);
    setIsFormOpen(true);
    setMenuOpenId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除该状态吗？')) {
      try {
        await deleteStatus.mutateAsync(id);
      } catch (err) {
        console.error('Failed to delete status:', err);
      }
    }
    setMenuOpenId(null);
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleNextStatusKeyChange = (value: string) => {
    const keys = value.split(',').map(k => k.trim()).filter(k => k);
    setFormData({ ...formData, allowedNextStatusKeys: keys });
  };

  const taskStatuses = statuses.filter(s => s.type === 'task').sort((a, b) => a.order - b.order);
  const displayStatuses = typeFilter === '' ? statuses.sort((a, b) => a.order - b.order) : taskStatuses;
  const transitions = buildTransitions(statuses, typeFilter);

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-content-text">状态定义管理</h2>
        <p className="mt-1 text-sm text-content-text-secondary">配置工作流管道与拖拽顺序。</p>
        <div className="mt-4 p-4 text-content-text-secondary">加载中…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-content-text">状态定义管理</h2>
        <p className="mt-1 text-sm text-content-text-secondary">配置工作流管道与拖拽顺序。</p>
        <div className="mt-4 p-4 text-red-500">加载状态失败</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Layers size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-content-text">状态定义管理</h2>
            <p className="text-sm text-content-text-secondary">配置工作流管道与状态流转。</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={typeFilter} onValueChange={setTypeFilter}>
            <TabsList>
              <TabsTrigger value="">全部</TabsTrigger>
              {STATUS_TYPES.map((type) => (
                <TabsTrigger key={type} value={type}>
                  {type === 'task' ? '任务' : '项目'}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm">保存顺序</Button>
        </div>
      </div>

      {/* Status Definition Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayStatuses.map((status) => {
          const { Icon, color } = getStatusIcon(status);
          return (
            <div
              key={status.id}
              className="relative rounded-xl border border-content-border bg-content-bg shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <Icon size={20} className={`shrink-0 ${color}`} />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpenId(menuOpenId === status.id ? null : status.id)}
                    className="p-1 rounded text-content-text-secondary hover:bg-content-bg-secondary"
                    aria-label="更多"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {menuOpenId === status.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                      <div className="absolute right-0 top-full mt-1 z-20 min-w-[100px] rounded-lg border border-content-border bg-content-bg py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => handleEdit(status)}
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-content-bg-secondary"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(status.id)}
                          disabled={deleteStatus.isPending}
                          className="w-full px-3 py-1.5 text-left text-sm text-red-500 hover:bg-red-500/10"
                        >
                          删除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-content-text uppercase tracking-wide text-sm mb-1">
                {status.name}
              </h3>
              <p className="text-sm text-content-text-secondary">
                {getStatusDescription(status)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Workflow Loop & Transitions */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Layers size={18} />
            </div>
            <h3 className="text-base font-semibold text-content-text">工作流与流转</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">定义循环规则</Button>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
              + 新建流转
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-content-border overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-content-border bg-content-bg-secondary/50">
                <th className="text-left py-3 px-4 font-semibold text-content-text-secondary uppercase tracking-wide text-xs">来源状态</th>
                <th className="text-left py-3 px-4 font-semibold text-content-text-secondary uppercase tracking-wide text-xs">条件 / 触发</th>
                <th className="text-left py-3 px-4 font-semibold text-content-text-secondary uppercase tracking-wide text-xs">目标状态</th>
                <th className="text-left py-3 px-4 font-semibold text-content-text-secondary uppercase tracking-wide text-xs">规则类型</th>
              </tr>
            </thead>
            <tbody>
              {transitions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center text-content-text-secondary">
                    暂无流转规则。请在状态定义中配置「允许的下一状态」，或点击「新建流转」添加。
                  </td>
                </tr>
              ) : (
                transitions.map((row, i) => (
                  <tr key={`${row.fromKey}-${row.toKey}-${i}`} className="border-b border-content-border last:border-b-0 hover:bg-content-bg-secondary/30">
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotColor(row.fromStatus)}`} />
                        {row.fromStatus.name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-content-bg-secondary text-content-text-secondary">
                        手动
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-2">
                        <ArrowRight size={14} className="text-content-text-muted shrink-0" />
                        <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotColor(row.toStatus)}`} />
                        {row.toStatus.name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        流转
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Form */}
      {!isFormOpen ? (
        <Button onClick={() => setIsFormOpen(true)} variant="default">
          添加状态
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-4 rounded-lg border border-content-border bg-content-bg-secondary/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content-text-secondary mb-1">类型 *</label>
              <NativeSelect
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full"
                required
              >
                {STATUS_TYPES.map((type) => (
                  <NativeSelectOption key={type} value={type}>
                    {type === 'task' ? '任务' : '项目'}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-text-secondary mb-1">Key *</label>
              <Input
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="如：in_progress"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content-text-secondary mb-1">名称 *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：进行中"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-text-secondary mb-1">排序</label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-content-text-secondary mb-1">允许的下一状态 Key（逗号分隔）</label>
            <Input
              value={formData.allowedNextStatusKeys.join(', ')}
              onChange={(e) => handleNextStatusKeyChange(e.target.value)}
              placeholder="如：done, in_review"
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={formData.isFinal}
                onCheckedChange={(checked) => setFormData({ ...formData, isFinal: checked })}
              />
              <span className="text-sm">终态</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={formData.isBlockedState}
                onCheckedChange={(checked) => setFormData({ ...formData, isBlockedState: checked })}
              />
              <span className="text-sm">阻塞状态</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="default" disabled={createStatus.isPending || updateStatus.isPending}>
              {editingId ? '更新' : '创建'} 状态
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancel}>
              取消
            </Button>
          </div>
        </form>
      )}

      {statuses.length === 0 && !isLoading && (
        <p className="text-sm text-content-text-secondary">暂无状态，请添加第一个状态。</p>
      )}
    </div>
  );
}
