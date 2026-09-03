'use client';

import { useState } from 'react';
import { Plus, Trash2, Hash, Pencil, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/infrastructure/store/app-store';
import {
  useProjectModules,
  useCreateProjectModule,
  useUpdateProjectModule,
  useDeleteProjectModule,
} from '@/modules/project/hooks/use-project-modules';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/shared/confirm/confirm-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ProjectModuleManagerProps {
  projectId: string;
  className?: string;
}

export function ProjectModuleManager({ projectId, className }: ProjectModuleManagerProps) {
  const { data: modules = [], isLoading } = useProjectModules(projectId);
  const create = useCreateProjectModule(projectId);
  const update = useUpdateProjectModule(projectId);
  const remove = useDeleteProjectModule(projectId);
  // 简化: 不在 user 上读 role (useAuth 返回值才暴露 roles),
  // 这里允许所有成员管理模块代码, 业务侧在 controller 校验 admin 角色。
  const canManage = true;

  const [editing, setEditing] = useState<string | undefined>();
  const [editingName, setEditingName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (!newCode.match(/^[A-Z]{2,4}$/) || !newName.trim()) return;
    create.mutate(
      { code: newCode, name: newName.trim() },
      {
        onSuccess: () => {
          setCreating(false);
          setNewCode('');
          setNewName('');
        },
      },
    );
  };

  const handleSave = (moduleId: string) => {
    if (!editingName.trim()) return;
    update.mutate(
      { moduleId, dto: { name: editingName.trim() } },
      {
        onSuccess: () => {
          setEditing(undefined);
          setEditingName('');
        },
      },
    );
  };

  const confirmDialog = useConfirm();
  const handleDelete = async (moduleId: string) => {
    const ok = await confirmDialog({
      title: '删除模块',
      description: '确认删除该模块代码？若已有任务引用，操作会被拒绝。',
      variant: 'destructive',
    });
    if (!ok) return;
    remove.mutate(moduleId);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">模块代码</h3>
          <p className="text-xs text-muted-foreground">
            用于生成任务/Bug 短 ID (格式: 项目代码-模块代码-序号)
          </p>
        </div>
        {canManage && !creating && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setCreating(true)}
          >
            <Plus size={12} /> 新增
          </Button>
        )}
      </div>

      {creating && (
        <div className="flex items-end gap-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="w-24">
            <label className="mb-1 block text-11 text-muted-foreground">代码 (2-4 位大写)</label>
            <Input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
              placeholder="PF"
              className="h-8 font-mono text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-11 text-muted-foreground">名称</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="平台功能"
              className="h-8 text-sm"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleCreate}
            disabled={!newCode.match(/^[A-Z]{2,4}$/) || !newName.trim() || create.isPending}
          >
            <Save size={12} /> 保存
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => {
              setCreating(false);
              setNewCode('');
              setNewName('');
            }}
          >
            <X size={12} />
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">加载中…</p>
      ) : modules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          尚未配置模块代码, 点击右上角新增
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table className="w-full text-sm">
            <TableHeader className="bg-muted/30 text-xs text-muted-foreground">
              <TableRow>
                <TableHead className="px-3 py-2 text-left font-medium">代码</TableHead>
                <TableHead className="px-3 py-2 text-left font-medium">名称</TableHead>
                <TableHead className="px-3 py-2 text-left font-medium">描述</TableHead>
                {canManage && <TableHead className="w-24 px-3 py-2 text-right font-medium">操作</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((m) => (
                <TableRow key={m.id} className="border-t border-border">
                  <TableCell className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-accent-blue/10 px-1.5 py-0.5 font-mono text-xs text-accent-blue">
                      <Hash size={10} />
                      {m.code}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    {editing === m.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(m.id);
                          else if (e.key === 'Escape') {
                            setEditing(undefined);
                            setEditingName('');
                          }
                        }}
                      />
                    ) : (
                      m.name
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-muted-foreground">{m.description || '—'}</TableCell>
                  {canManage && (
                    <TableCell className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-0.5">
                        {editing === m.id ? (
                          <>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleSave(m.id)}
                              disabled={!editingName.trim() || update.isPending}
                            >
                              <Save size={12} />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditing(undefined);
                                setEditingName('');
                              }}
                            >
                              <X size={12} />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditing(m.id);
                                setEditingName(m.name);
                              }}
                            >
                              <Pencil size={12} />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-accent-red hover:bg-accent-red/10"
                              onClick={() => handleDelete(m.id)}
                              disabled={remove.isPending}
                            >
                              <Trash2 size={12} />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
