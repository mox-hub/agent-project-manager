import { useState } from 'react';
import { useProjectRoles, useCreateProjectRole, useUpdateProjectRole, useDeleteProjectRole, type ProjectRoleDefinition } from '../hooks/use-metadata';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { Check, Circle } from 'lucide-react';

interface RoleFormData {
  key: string;
  name: string;
  description: string;
}

const initialFormData: RoleFormData = {
  key: '',
  name: '',
  description: '',
};

const DEFAULT_ROLES = [
  { key: 'frontend-dev', name: 'Frontend Developer' },
  { key: 'backend-dev', name: 'Backend Developer' },
  { key: 'fullstack-dev', name: 'Fullstack Developer' },
  { key: 'qa', name: 'QA Engineer' },
  { key: 'pm', name: 'Product Manager' },
  { key: 'designer', name: 'Designer' },
  { key: 'devops', name: 'DevOps Engineer' },
];

export function RoleManager() {
  const confirmAction = useConfirm();
  const { data: roles = [], isLoading, error } = useProjectRoles();
  const createRole = useCreateProjectRole();
  const updateRole = useUpdateProjectRole();
  const deleteRole = useDeleteProjectRole();

  const [formData, setFormData] = useState<RoleFormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateRole.mutateAsync({ id: editingId, data: formData });
      } else {
        await createRole.mutateAsync(formData);
      }
      setFormData(initialFormData);
      setEditingId(null);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save role:', err);
    }
  };

  const handleEdit = (role: ProjectRoleDefinition) => {
    setFormData({
      key: role.key,
      name: role.name,
      description: role.description || '',
    });
    setEditingId(role.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmAction({
      title: '删除角色',
      description: '确定要删除该角色吗？',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'destructive',
    });
    if (!ok) {
      return;
    }
    try {
      await deleteRole.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete role:', err);
    }
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const addDefaultRole = async (role: { key: string; name: string }) => {
    try {
      await createRole.mutateAsync(role);
    } catch (err) {
      console.error('Failed to add default role:', err);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-content-text">项目角色定义</h2>
        <p className="mt-1 text-sm text-content-text-secondary">为项目成员定义权限与访问级别。</p>
        <div className="mt-4 p-4 text-content-text-secondary">加载中…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-content-text">项目角色定义</h2>
        <p className="mt-1 text-sm text-content-text-secondary">为项目成员定义权限与访问级别。</p>
        <div className="mt-4 p-4 text-red-500">加载角色失败</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-content-text">项目角色定义</h2>
        <p className="mt-1 text-sm text-content-text-secondary">
          为项目成员定义权限与访问级别。
        </p>
      </div>

      <div className="rounded-lg border border-content-border overflow-hidden">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="border-b border-content-border bg-content-bg-secondary/50 hover:bg-content-bg-secondary/50">
              <TableHead className="py-3 px-4 font-medium text-content-text-secondary">角色名称</TableHead>
              <TableHead className="py-3 px-4 font-medium text-content-text-secondary">权限范围</TableHead>
              <TableHead className="py-3 px-4 font-medium text-content-text-secondary w-24">全局访问</TableHead>
              <TableHead className="py-3 px-4 text-right font-medium text-content-text-secondary w-20">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow
                key={role.id}
                className="border-b border-content-border last:border-b-0 hover:bg-content-bg-secondary/30 transition-colors"
              >
                <TableCell className="py-3 px-4 font-medium text-content-text">{role.name}</TableCell>
                <TableCell className="py-3 px-4 text-content-text-secondary max-w-md">
                  {role.description || '—'}
                </TableCell>
                <TableCell className="py-3 px-4">
                  {!role.projectId ? (
                    <span className="inline-flex items-center text-green-600 dark:text-green-400" title="全局">
                      <Check size={18} />
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-content-text-muted" title="仅项目">
                      <Circle size={16} className="opacity-50" />
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleEdit(role)}
                    className="text-content-text hover:underline text-sm"
                  >
                    编辑
                  </button>
                  <span className="mx-1 text-content-text-tertiary">|</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(role.id)}
                    disabled={deleteRole.isPending}
                    className="text-red-500 hover:underline text-sm"
                  >
                    删除
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!isFormOpen ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setIsFormOpen(true)} variant="default">
            添加角色
          </Button>
          {roles.length === 0 && (
            <>
              <span className="text-sm text-content-text-secondary">快速添加：</span>
              {DEFAULT_ROLES.slice(0, 5).map((role) => (
              <Button
                key={role.key}
                variant="outline"
                size="sm"
                onClick={() => addDefaultRole(role)}
                disabled={createRole.isPending}
              >
                + {role.name}
              </Button>
            ))}
            </>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-4 rounded-lg border border-content-border bg-content-bg-secondary/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content-text-secondary mb-1">Key *</label>
              <Input
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="如：frontend-dev"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-text-secondary mb-1">名称 *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：前端开发"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-content-text-secondary mb-1">说明（权限范围）</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="角色说明与权限描述"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="default" disabled={createRole.isPending || updateRole.isPending}>
              {editingId ? '更新' : '创建'} 角色
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancel}>
              取消
            </Button>
          </div>
        </form>
      )}

      {roles.length === 0 && !isLoading && (
        <p className="text-sm text-content-text-secondary">暂无角色，请添加第一个角色。</p>
      )}
    </div>
  );
}

