import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Check, CircleUser, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { AsyncState } from '@/components/ui/async-state';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import {
  useProjectRoles,
  useCreateProjectRole,
  useUpdateProjectRole,
  useDeleteProjectRole,
  type ProjectRoleDefinition,
} from '../hooks/use-metadata';

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

type RoleScopeFilter = 'all' | 'global' | 'project';

export function RoleManager() {
  const { t } = useTranslation();
  const confirmAction = useConfirm();
  const { isAdmin } = useAuth();
  const { data: roles = [], isLoading, error, refetch } = useProjectRoles();
  const createRole = useCreateProjectRole();
  const updateRole = useUpdateProjectRole();
  const deleteRole = useDeleteProjectRole();

  const roleForm = useForm<RoleFormData>({
    defaultValues: initialFormData,
  });
  const [editing, setEditing] = useState<ProjectRoleDefinition | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<RoleScopeFilter>('all');

  const displayRoles = roles.filter((role) => {
    if (scopeFilter === 'global') return !role.projectId;
    if (scopeFilter === 'project') return Boolean(role.projectId);
    return true;
  });

  const openCreate = () => {
    roleForm.reset(initialFormData);
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (role: ProjectRoleDefinition) => {
    roleForm.reset({
      key: role.key,
      name: role.name,
      description: role.description || '',
    });
    setEditing(role);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    roleForm.reset(initialFormData);
    setEditing(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = roleForm.getValues();
    try {
      if (editing) {
        await updateRole.mutateAsync({ id: editing.id, data: formData });
      } else {
        await createRole.mutateAsync(formData);
      }
      closeForm();
    } catch {
      toast.error(t('settings.saveFailed'));
    }
  };

  const handleDelete = async (role: ProjectRoleDefinition) => {
    const ok = await confirmAction({
      title: t('common.delete'),
      description: t('common.deleteConfirm'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteRole.mutateAsync(role.id);
    } catch {
      toast.error(t('settings.deleteFailed'));
    }
  };

  const addDefaultRole = async (role: { key: string; name: string }) => {
    try {
      await createRole.mutateAsync(role);
    } catch {
      toast.error(t('settings.saveFailed'));
    }
  };

  return (
    <PageShell
      variant="standard"
      contentClassName="gap-4"
      aiPage="settings.roles"
      className="bg-background text-foreground"
      title={t('settings.roles')}
      icon={CircleUser}
      iconColor="text-accent-purple"
      metrics={[{ id: 'total', label: t('settings.roles'), value: displayRoles.length }]}
      actions={
        // 角色创建是管理员能力（服务端 RolesGuard），普通用户隐藏入口避免必 403
        isAdmin ? (
          <HeaderActionButton icon={Plus} label={t('settings.addRole')} onClick={openCreate} />
        ) : null
      }
    >
      <div className="flex justify-center">
        <SegmentedControl<RoleScopeFilter>
          variant="rect"
          value={scopeFilter}
          onChange={setScopeFilter}
              options={[
                { value: 'all', label: t('common.all') },
                { value: 'global', label: t('settings.globalAccess'), tone: 'green' },
                { value: 'project', label: t('settings.projectOnlyRole'), tone: 'blue' },
              ]}
            />
          </div>

          <AsyncState
            isLoading={isLoading}
            error={error ? t('settings.roleLoadFailed') : null}
            onRetry={() => void refetch()}
            loadingFallback={
              <DataTableShell>
                <SkeletonTable rows={6} columns={5} />
              </DataTableShell>
            }
          >
            {roles.length === 0 ? (
              <div className="flex flex-col gap-4">
                <EmptyState title={t('settings.noRoles')} description={t('settings.rolesDesc')} />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('settings.quickAdd')}</span>
                  {DEFAULT_ROLES.slice(0, 5).map((role) => (
                    <Button
                      key={role.key}
                      variant="outline"
                      size="xs"
                      disabled={createRole.isPending}
                      onClick={() => addDefaultRole(role)}
                    >
                      <Plus className="size-3" />
                      {role.name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : displayRoles.length === 0 ? (
              <EmptyState title={t('settings.noRolesInScope')} />
            ) : (
              <DataTableShell>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>{t('settings.roleName')}</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>{t('settings.roleScope')}</TableHead>
                      <TableHead className="w-20">{t('settings.globalAccess')}</TableHead>
                      <TableHead className="w-20 text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="py-1.5 font-medium text-foreground">{role.name}</TableCell>
                        <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">
                          {role.key}
                        </TableCell>
                        <TableCell className="max-w-60 truncate py-1.5 text-muted-foreground">
                          {role.description || '—'}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {!role.projectId ? (
                            <span
                              className="inline-flex items-center text-accent-green"
                              title={t('settings.globalRole')}
                            >
                              <Check className="size-4" />
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center text-muted-foreground"
                              title={t('settings.projectOnlyRole')}
                            >
                              <Minus className="size-4 opacity-60" />
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label={t('common.edit')}
                              title={t('common.edit')}
                              onClick={() => openEdit(role)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label={t('common.delete')}
                              title={t('common.delete')}
                              disabled={deleteRole.isPending}
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(role)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableShell>
            )}
          </AsyncState>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('settings.editRole') : t('settings.addRole')}</DialogTitle>
            <DialogDescription>{t('settings.rolesDesc')}</DialogDescription>
          </DialogHeader>
          <Form {...roleForm}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={roleForm.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key *</FormLabel>
                      <Input
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(e.target.value.toLowerCase().replace(/\s+/g, '_'))
                        }
                        placeholder={t('settings.roleKeyPlaceholder')}
                        required
                      />
                    </FormItem>
                  )}
                />
                <FormField
                  control={roleForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings.roleName')} *</FormLabel>
                      <Input
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder={t('settings.roleNamePlaceholder')}
                        required
                      />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={roleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.roleScope')}</FormLabel>
                    <Input
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={t('settings.roleScopePlaceholder')}
                    />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeForm}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
                  {(createRole.isPending || updateRole.isPending) && <Spinner size="sm" />}
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
