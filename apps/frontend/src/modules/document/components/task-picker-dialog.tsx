'use client';

import { useMemo, useState } from 'react';
import { Search, Plus, Loader2, CheckSquare, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { taskApi } from '@/modules/task/api/task-api';
import type { LinkType } from '@/modules/document/api/document-task-link-api';
import { cn } from '@/lib/utils';

interface TaskPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSelect: (taskId: string, linkType: LinkType) => void;
}

const LINK_TYPE_OPTIONS: { value: LinkType; label: string; color: string }[] = [
  { value: 'references', label: '引用', color: 'bg-accent-blue/10 text-accent-blue' },
  { value: 'blocks', label: '阻塞', color: 'bg-accent-red/10 text-accent-red' },
  { value: 'relates', label: '相关', color: 'bg-accent-yellow/10 text-accent-yellow' },
  { value: 'implements', label: '实现', color: 'bg-accent-green/10 text-accent-green' },
];

export function TaskPickerDialog({ open, onOpenChange, projectId, onSelect }: TaskPickerDialogProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'task' | 'bug'>('all');
  const [linkType, setLinkType] = useState<LinkType>('references');

  const { data, isLoading, error } = useQuery({
    queryKey: ['task-picker', projectId ?? '__accessible__', search, filterType],
    queryFn: async () => {
      const params: Parameters<typeof taskApi.getProjectTasks>[1] = {
        page: 1,
        pageSize: 50,
        q: search || undefined,
        type: filterType === 'all' ? undefined : filterType,
      } as any;
      const res = projectId
        ? await taskApi.getProjectTasks(projectId, params)
        : await taskApi.getAccessibleTasks(params);
      return res.data;
    },
    enabled: open,
    retry: 1,
  });

  const tasks = useMemo(() => {
    const list: any[] = Array.isArray(data) ? data : data?.data ?? [];
    return list;
  }, [data]);

  const handleSelect = (taskId: string) => {
    onSelect(taskId, linkType);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>选择任务或 Bug</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* 关联类型 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">关联类型</span>
            {LINK_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLinkType(opt.value)}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium transition-all',
                  opt.color,
                  linkType === opt.value ? 'ring-2 ring-foreground/30' : 'opacity-60',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="按标题搜索…"
              className="pl-7"
            />
          </div>

          {/* 类型过滤 */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all' as const, label: '全部' },
              { id: 'task' as const, label: '任务' },
              { id: 'bug' as const, label: 'Bug' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilterType(opt.id)}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs transition-colors',
                  filterType === opt.id
                    ? 'bg-foreground text-background'
                    : 'border border-border text-muted-foreground hover:border-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 任务列表 */}
          <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border">
            {isLoading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在加载任务…
              </div>
            ) : error ? (
              <div className="p-6 text-center text-sm text-destructive">
                加载任务失败: {(error as Error)?.message ?? '未知错误'}
              </div>
            ) : tasks.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {search || filterType !== 'all'
                  ? '未找到匹配的任务, 试试调整过滤条件'
                  : '当前项目下还没有任务可关联, 请先在任务模块创建'}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(t.id)}
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                    >
                      {t.type === 'bug' ? (
                        <Bug size={14} className="mt-0.5 shrink-0 text-accent-red" />
                      ) : (
                        <CheckSquare size={14} className="mt-0.5 shrink-0 text-accent-blue" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{t.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {t.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {t.priority}
                          </Badge>
                          {t.assignee?.displayName && (
                            <span>· {t.assignee.displayName}</span>
                          )}
                        </div>
                      </div>
                      <Plus size={14} className="shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
