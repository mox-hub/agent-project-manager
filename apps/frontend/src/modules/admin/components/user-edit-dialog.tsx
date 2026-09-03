import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { useUpdateAdminUser } from '../hooks/use-admin';
import type { AdminUser } from '../api/admin-api';

/** 编辑账号资料（姓名/邮箱；停用与重置密码在行菜单中） */
export function UserEditDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const updateUser = useUpdateAdminUser();

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName);
      setEmail(user.email ?? '');
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          displayName: displayName.trim(),
          email: email.trim() || undefined,
        },
      });
      toast.success(t('admin.userUpdated', '账号已更新'));
      onOpenChange(false);
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      const apiError = err as ApiError;
      toast.error(
        apiError.response?.data?.error?.message || t('admin.userUpdateFailed', '更新账号失败'),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.editUser', '编辑账号')}</DialogTitle>
          <DialogDescription>
            @{user?.username} · {t('admin.usernameImmutable', '登录名不可修改')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('admin.displayName', '姓名')} *</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('admin.email', '邮箱')}</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {t('common.cancel', '取消')}
            </Button>
            <Button type="submit" size="sm" disabled={updateUser.isPending || !displayName.trim()}>
              {updateUser.isPending ? '…' : t('common.save', '保存')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
