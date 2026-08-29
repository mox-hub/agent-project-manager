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
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useCreateRegistrationInvite } from '../hooks/use-admin';
import { buildRegisterInviteLink, type RegistrationInviteItem } from '../api/admin-api';

/** 创建注册邀请：可选限定邮箱 + 有效期；成功后展示邀请链接 */
export function InviteCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [created, setCreated] = useState<RegistrationInviteItem | null>(null);
  const createInvite = useCreateRegistrationInvite();
  const { copyToClipboard, isCopied } = useCopyToClipboard({ timeout: 2000 });

  const reset = () => {
    setEmail('');
    setExpiresInDays('7');
    setCreated(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const invite = await createInvite.mutateAsync({
        email: email.trim() || undefined,
        expiresInDays: Number(expiresInDays),
      });
      setCreated(invite);
      if (email.trim()) {
        toast.success(t('admin.inviteMailQueued', '邀请邮件已加入发件箱'));
      }
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      const apiError = err as ApiError;
      toast.error(
        apiError.response?.data?.error?.message || t('admin.inviteCreateFailed', '创建邀请失败'),
      );
    }
  };

  const link = created ? buildRegisterInviteLink(created.token) : '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('admin.inviteCreated', '邀请已创建')}</DialogTitle>
              <DialogDescription>
                {t('admin.inviteLinkDesc', '复制以下链接发给成员，打开后即可注册。')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => copyToClipboard(link)}
              >
                {isCopied ? t('admin.copied', '已复制') : t('admin.copy', '复制')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('admin.inviteExpiresIn', {
                defaultValue: '有效期 {{days}} 天',
                days: Number(expiresInDays),
              })}
              {created.email ? ` · ${created.email}` : ''}
            </p>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>
                {t('admin.done', '完成')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t('admin.createInvite', '邀请成员注册')}</DialogTitle>
              <DialogDescription>
                {t(
                  'admin.createInviteDesc',
                  '生成注册邀请链接；填写邮箱时将同时发送邀请邮件（发件箱可查）。',
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  {t('admin.inviteEmailOptional', '限定邮箱（可选）')}
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.inviteEmailHint', '留空则任意邮箱均可凭链接注册')}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">{t('admin.inviteExpiry', '有效期')}</label>
                <NativeSelect
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                >
                  <NativeSelectOption value="1">1 {t('admin.days', '天')}</NativeSelectOption>
                  <NativeSelectOption value="7">7 {t('admin.days', '天')}</NativeSelectOption>
                  <NativeSelectOption value="30">30 {t('admin.days', '天')}</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => handleClose(false)}>
                {t('common.cancel', '取消')}
              </Button>
              <Button type="submit" size="sm" disabled={createInvite.isPending}>
                {createInvite.isPending ? '…' : t('admin.createInvite', '邀请成员注册')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
