import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pencil,
  KeyRound,
  ShieldCheck,
  ShieldOff,
  MoreHorizontal,
  Ban,
  CheckCircle,
} from 'lucide-react';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { Menu, MenuTrigger, MenuPopup, MenuItem } from '@/components/ui/menu';
import { AsyncState } from '@/components/ui/async-state';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { toast } from '@/components/ui/toast';
import { useAdminUsers, useToggleAdminRole, useUpdateAdminUser } from '../hooks/use-admin';
import type { AdminUser } from '../api/admin-api';
import { UserEditDialog } from './user-edit-dialog';
import { GeneratedPasswordDialog } from './generated-password-dialog';

/** 账号列表（搜索/状态筛选由页面 ToolbarRow 承载） */
export function UserAccountsSection({
  search,
  statusFilter,
}: {
  search: string;
  statusFilter: string;
}) {
  const { t } = useTranslation();
  const { data: users, isLoading } = useAdminUsers();
  const updateUser = useUpdateAdminUser();
  const toggleAdminRole = useToggleAdminRole();
  const confirmDialog = useConfirm();

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [passwordInfo, setPasswordInfo] = useState<{
    password: string;
    displayName: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const list = users ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((u) => {
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter]);

  const handleResetPassword = async (user: AdminUser) => {
    const ok = await confirmDialog({
      title: t('admin.resetPassword', '重置密码'),
      description: t('admin.resetPasswordConfirm', {
        defaultValue: '为 {{name}} 生成新的随机密码？',
        name: user.displayName,
      }),
    });
    if (!ok) return;
    try {
      const res = await updateUser.mutateAsync({
        id: user.id,
        data: { resetPassword: true },
      });
      if (res.generatedPassword) {
        setPasswordInfo({
          password: res.generatedPassword,
          displayName: res.displayName,
        });
      }
    } catch {
      toast.error(t('admin.resetPasswordFailed', '重置密码失败'));
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    if (user.isActive) {
      const ok = await confirmDialog({
        title: t('admin.deactivateAccount', '停用账号'),
        description: t('admin.deactivateAccountConfirm', {
          defaultValue: '停用 {{name}}？该账号的所有会话将被吊销。',
          name: user.displayName,
        }),
        variant: 'destructive',
      });
      if (!ok) return;
    }
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: { isActive: !user.isActive },
      });
      toast.success(
        user.isActive
          ? t('admin.accountDeactivated', '账号已停用')
          : t('admin.accountActivated', '账号已启用'),
      );
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      const apiError = err as ApiError;
      toast.error(
        apiError.response?.data?.error?.message || t('admin.userUpdateFailed', '更新账号失败'),
      );
    }
  };

  const handleToggleAdmin = async (user: AdminUser) => {
    const isAdmin = user.roles.some((r) => r.role === 'admin');
    const ok = await confirmDialog({
      title: isAdmin
        ? t('admin.removeAdmin', '取消管理员')
        : t('admin.makeAdmin', '设为管理员'),
      description: isAdmin
        ? t('admin.removeAdminConfirm', {
            defaultValue: '取消 {{name}} 的管理员权限？',
            name: user.displayName,
          })
        : t('admin.makeAdminConfirm', {
            defaultValue: '授予 {{name}} 管理员权限？',
            name: user.displayName,
          }),
      variant: isAdmin ? 'destructive' : 'default',
    });
    if (!ok) return;
    try {
      await toggleAdminRole.mutateAsync({
        userId: user.id,
        makeAdmin: !isAdmin,
        roleAssignmentId: user.roles.find((r) => r.role === 'admin')?.id,
      });
      toast.success(t('admin.roleUpdated', '角色已更新'));
    } catch {
      toast.error(t('admin.roleUpdateFailed', '角色更新失败'));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t('admin.userCount', { defaultValue: '{{count}} 个账号', count: filtered.length })}
      </p>

      <AsyncState isLoading={isLoading} isEmpty={filtered.length === 0}>
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.user', '用户')}</TableHead>
                <TableHead>{t('admin.email', '邮箱')}</TableHead>
                <TableHead>{t('admin.role', '角色')}</TableHead>
                <TableHead>{t('admin.status', '状态')}</TableHead>
                <TableHead>{t('admin.memberShortId', '成员')}</TableHead>
                <TableHead>{t('admin.createdAt', '创建时间')}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const isAdmin = u.roles.some((r) => r.role === 'admin');
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          {u.avatarUrl ? <AvatarImage src={u.avatarUrl} /> : null}
                          <AvatarFallback>{u.displayName.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{u.displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.email ?? '—'}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Badge variant="secondary" className="gap-1">
                          <ShieldCheck className="size-3" />
                          {t('admin.roleAdmin', '管理员')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{t('admin.roleUser', '普通成员')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <StatusPill tone="success">
                          {t('admin.active', '已启用')}
                        </StatusPill>
                      ) : (
                        <StatusPill tone="danger">
                          {t('admin.inactive', '已停用')}
                        </StatusPill>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {u.memberShortId ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Menu>
                        <MenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" aria-label="more">
                              <MoreHorizontal />
                            </Button>
                          }
                        />
                        <MenuPopup align="end">
                          <MenuItem onClick={() => setEditing(u)}>
                            <Pencil className="size-3.5" />
                            {t('admin.editUser', '编辑账号')}
                          </MenuItem>
                          <MenuItem onClick={() => handleResetPassword(u)}>
                            <KeyRound className="size-3.5" />
                            {t('admin.resetPassword', '重置密码')}
                          </MenuItem>
                          <MenuItem onClick={() => handleToggleAdmin(u)}>
                            {isAdmin ? (
                              <ShieldOff className="size-3.5" />
                            ) : (
                              <ShieldCheck className="size-3.5" />
                            )}
                            {isAdmin
                              ? t('admin.removeAdmin', '取消管理员')
                              : t('admin.makeAdmin', '设为管理员')}
                          </MenuItem>
                          <MenuItem
                            variant={u.isActive ? 'destructive' : 'default'}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.isActive ? (
                              <Ban className="size-3.5" />
                            ) : (
                              <CheckCircle className="size-3.5" />
                            )}
                            {u.isActive
                              ? t('admin.deactivateAccount', '停用账号')
                              : t('admin.accountActivated', '启用账号')}
                          </MenuItem>
                        </MenuPopup>
                      </Menu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      </AsyncState>

      <UserEditDialog user={editing} open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)} />
      <GeneratedPasswordDialog
        open={Boolean(passwordInfo)}
        onOpenChange={(o) => !o && setPasswordInfo(null)}
        password={passwordInfo?.password ?? ''}
        displayName={passwordInfo?.displayName}
      />
    </div>
  );
}
