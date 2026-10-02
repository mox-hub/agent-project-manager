import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleUser, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageShell } from '@/components/semantic/page-shell';
import { nodeToText } from '@/components/semantic/page-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { HeaderActionButton } from '@/components/semantic/header-action-button';
import { AsyncState } from '@/components/semantic/async-state';
import { DataTableShell } from '@/components/semantic/data-table-shell';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/semantic/empty-state';
import { DefinitionRow } from '@/components/semantic/definition-row';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { deriveSlugKey } from '@/shared/lib/slug-key';
import {
  useProjectRoles,
  useCreateProjectRole,
  useUpdateProjectRole,
  useDeleteProjectRole,
  type ProjectRoleDefinition,
} from '../hooks/use-metadata';

interface RoleDraft {
  key: string;
  name: string;
  description: string;
}

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

/**
 * 设置·角色（管理面统一批 2026-10-01）：作用域分段 + DefinitionRow 行卡
 * （xl 底框图标 + 双行文本 + hover 操作），行点击编辑；角色无 order 能力，不做拖拽。
 * key 由名称自动派生（内部标识，弹窗只读展示）。
 */
export function RoleManager() {
  const { t } = useTranslation();
  const confirmAction = useConfirm();
  const { isAdmin } = useAuth();
  const { data: roles = [], isLoading, error, refetch } = useProjectRoles();
  const createRole = useCreateProjectRole();
  const updateRole = useUpdateProjectRole();
  const deleteRole = useDeleteProjectRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRoleDefinition | null>(null);
  const [scopeFilter, setScopeFilter] = useState<RoleScopeFilter>('all');

  const displayRoles = roles.filter((role) => {
    if (scopeFilter === 'global') return !role.projectId;
    if (scopeFilter === 'project') return Boolean(role.projectId);
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (role: ProjectRoleDefinition) => {
    if (!isAdmin) return;
    setEditing(role);
    setDialogOpen(true);
  };

  const handleSubmit = async (draft: RoleDraft) => {
    try {
      if (editing) {
        await updateRole.mutateAsync({ id: editing.id, data: draft });
      } else {
        await createRole.mutateAsync(draft);
      }
      setDialogOpen(false);
      setEditing(null);
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
      favorites={<FavoriteToggle label={nodeToText(t('settings.roles')).trim()} />}
      icon={CircleUser}
      iconColor="text-accent-purple"
      metrics={[{ id: 'total', label: t('settings.roles'), value: displayRoles.length }]}
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
            <SkeletonTable rows={6} columns={3} />
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
                  onClick={() => void addDefaultRole(role)}
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
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            {/* 列头（与行同款列宽类保证对齐） */}
            <div className="flex items-center gap-2.5 border-b border-border/60 px-3 py-2 text-3xs font-medium text-content-text-muted">
              <span className="flex w-40 shrink-0 items-center gap-2.5">
                <span className="size-3 shrink-0" />
                {t('settings.roleName')}
              </span>
              <span className="min-w-0 flex-1">{t('settings.roleScope')}</span>
              <span className="w-24 shrink-0">{t('settings.roleScopeType')}</span>
              <span className="w-14 shrink-0" />
            </div>
            <div className="divide-y divide-border/60">
              {displayRoles.map((role) => (
                <DefinitionRow
                  key={role.id}
                  id={role.id}
                  sortable={false}
                  singleLine
                  onClick={() => openEdit(role)}
                  leading={
                    <StatusIconFrame
                      icon={CircleUser}
                      tone={role.projectId ? 'info' : 'success'}
                      size="md"
                      className="rounded-lg"
                    />
                  }
                  title={role.name}
                  description={role.description || role.key}
                  trailing={
                    <>
                      <span className="w-24 shrink-0 text-xs text-content-text-muted">
                        {role.projectId ? (
                          <Badge variant="outline">{t('settings.projectOnlyRole')}</Badge>
                        ) : (
                          <Badge variant="secondary">{t('settings.globalRole')}</Badge>
                        )}
                      </span>
                      {isAdmin ? (
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
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
                            onClick={() => void handleDelete(role)}
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
            </div>
          </section>
        )}
      </AsyncState>

      <RoleDialog
        key={`${editing?.id ?? 'new'}-${String(dialogOpen)}`}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        editing={editing}
        existingKeys={roles.map((r) => r.key)}
        onSubmit={handleSubmit}
        saving={createRole.isPending || updateRole.isPending}
      />
    </PageShell>
  );
}

function RoleDialog({
  open,
  onOpenChange,
  editing,
  existingKeys,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ProjectRoleDefinition | null;
  existingKeys: string[];
  onSubmit: (draft: RoleDraft) => void | Promise<void>;
  saving?: boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<RoleDraft>(() =>
    editing
      ? { key: editing.key, name: editing.name, description: editing.description || '' }
      : { key: '', name: '', description: '' },
  );

  // 编辑态 key 冻结；新建态随名称派生（deriveSlugKey 纯函数，与状态弹窗同源）
  const effectiveKey = editing
    ? editing.key
    : deriveSlugKey(draft.name, existingKeys, 'role');

  const submit = async () => {
    if (!draft.name.trim()) return;
    await onSubmit({ ...draft, name: draft.name.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? t('settings.editRole') : t('settings.addRole')}</DialogTitle>
          <DialogDescription>{t('settings.rolesDesc')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <div className="text-xs text-content-text-secondary">
              {t('settings.roleName')} *
            </div>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder={t('settings.roleNamePlaceholder')}
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs text-content-text-secondary">
              {t('settings.roleScope')}
            </div>
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder={t('settings.roleScopePlaceholder')}
              rows={2}
            />
          </div>
          <p className="font-mono text-3xs text-content-text-muted">
            {t('settings.statusKeyDisplay', { key: effectiveKey })}
          </p>
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
