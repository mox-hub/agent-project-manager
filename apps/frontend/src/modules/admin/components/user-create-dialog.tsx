import { useState } from 'react';
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { toast } from '@/components/ui/toast';
import { useCreateAdminUser } from '../hooks/use-admin';
import type { CreateAdminUserResponse } from '../api/admin-api';

/** 直接创建成员账号：系统生成随机密码，成功后一次性展示 */
export function UserCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 创建成功（携带一次性密码，由父级弹窗展示） */
  onCreated: (res: CreateAdminUserResponse) => void;
}) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('user');
  const createUser = useCreateAdminUser();

  const reset = () => {
    setDisplayName('');
    setEmail('');
    setUsername('');
    setRole('user');
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim()) return;
    try {
      const res = await createUser.mutateAsync({
        displayName: displayName.trim(),
        email: email.trim(),
        username: username.trim() || undefined,
        role,
      });
      toast.success(
        t('admin.userCreated', '账号已创建：{{name}}', { name: res.user.displayName }),
      );
      handleClose(false);
      onCreated(res);
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      const apiError = err as ApiError;
      toast.error(
        apiError.response?.data?.error?.message || t('admin.userCreateFailed', '创建账号失败'),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.createUser', '创建成员账号')}</DialogTitle>
          <DialogDescription>
            {t(
              'admin.createUserDesc',
              '直接生成登录账号并同步创建成员档案，初始密码由系统随机生成。',
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('admin.displayName', '姓名')} *</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('admin.displayNamePlaceholder', '如: 张三')}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('admin.email', '邮箱')} *</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                {t('admin.usernameOptional', '登录名（可选）')}
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('admin.usernamePlaceholder', '缺省由邮箱派生')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('admin.role', '角色')}</label>
              <NativeSelect value={role} onChange={(e) => setRole(e.target.value)}>
                <NativeSelectOption value="user">
                  {t('admin.roleUser', '普通成员')}
                </NativeSelectOption>
                <NativeSelectOption value="admin">
                  {t('admin.roleAdmin', '管理员')}
                </NativeSelectOption>
              </NativeSelect>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleClose(false)}>
              {t('common.cancel', '取消')}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createUser.isPending || !displayName.trim() || !email.trim()}
            >
              {createUser.isPending ? '…' : t('admin.createUser', '创建成员账号')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
