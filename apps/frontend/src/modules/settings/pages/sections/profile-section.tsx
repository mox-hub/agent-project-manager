import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UserRound, KeyRound, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/input';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { AvatarPickerField } from '@/components/ui/avatar-picker-field';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageShell } from '@/components/semantic/page-shell';
import { nodeToText } from '@/components/semantic/page-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { toast } from '@/components/ui/toast';
import { useAppStore } from '@/infrastructure/store/app-store';
import { authApi } from '@/modules/auth/api/auth-api';
import { useAuth } from '@/modules/auth/hooks/use-auth';

/** 常用时区清单（空值 = 不设置）；城市名走 i18n（settings.timezone.*） */
const TIMEZONES: Array<{ value: string; label?: string; labelKey?: string }> = [
  { value: '', label: '—' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Shanghai', labelKey: 'settings.timezone.shanghai' },
  { value: 'Asia/Hong_Kong', labelKey: 'settings.timezone.hongKong' },
  { value: 'Asia/Singapore', labelKey: 'settings.timezone.singapore' },
  { value: 'Asia/Tokyo', labelKey: 'settings.timezone.tokyo' },
  { value: 'Asia/Seoul', labelKey: 'settings.timezone.seoul' },
  { value: 'Asia/Kolkata', labelKey: 'settings.timezone.mumbai' },
  { value: 'Asia/Dubai', labelKey: 'settings.timezone.dubai' },
  { value: 'Europe/London', labelKey: 'settings.timezone.london' },
  { value: 'Europe/Paris', labelKey: 'settings.timezone.paris' },
  { value: 'Europe/Berlin', labelKey: 'settings.timezone.berlin' },
  { value: 'Europe/Moscow', labelKey: 'settings.timezone.moscow' },
  { value: 'America/New_York', labelKey: 'settings.timezone.newYork' },
  { value: 'America/Chicago', labelKey: 'settings.timezone.chicago' },
  { value: 'America/Denver', labelKey: 'settings.timezone.denver' },
  { value: 'America/Los_Angeles', labelKey: 'settings.timezone.losAngeles' },
  { value: 'Australia/Sydney', labelKey: 'settings.timezone.sydney' },
  { value: 'Pacific/Auckland', labelKey: 'settings.timezone.auckland' },
];

function timezoneLabel(value: string, t: (key: string) => string): string {
  const tz = TIMEZONES.find((item) => item.value === value);
  if (!tz) return value || '—';
  return tz.labelKey ? t(tz.labelKey) : (tz.label ?? tz.value);
}

/** 只读键值行（设置卡只读展示形态） */
function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-2 py-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-foreground">{value || '—'}</span>
    </div>
  );
}

/** 个人资料设置子页：基本信息（昵称/邮箱/头像/时区）+ 修改密码——常驻只读，编辑走弹窗（F3.6/J14） */
export function ProfileSettingsSection() {
  const { t } = useTranslation();
  const { currentUser, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && currentUser) {
      setDisplayName(currentUser.displayName ?? '');
      setEmail(currentUser.email ?? '');
      setAvatarUrl(currentUser.avatarUrl ?? null);
      setTimezone(currentUser.timezone ?? '');
    }
  }, [currentUser, isLoading]);

  const handleSave = async () => {
    if (!currentUser) return;
    if (!displayName.trim()) {
      toast.error(t('settings.profileDisplayNameRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = await authApi.updateProfile({
        displayName: displayName.trim(),
        email: email.trim() || undefined,
        avatarUrl: avatarUrl ?? '',
        timezone,
      });
      setCurrentUser(res.user);
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success(t('settings.profileSaveSuccess'));
      setEditOpen(false);
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      const apiError = err as ApiError;
      toast.error(
        apiError.response?.data?.error?.message || t('settings.profileSaveFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      variant="standard"
      icon={UserRound}
      iconColor="text-accent-blue"
      title={t('settings.profile')}
      favorites={<FavoriteToggle label={nodeToText(t('settings.profile')).trim()} />}
      className="bg-background text-foreground"
      contentClassName="space-y-6"
    >
      <Card className="border-border shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound size={16} className="text-accent-blue" />
            {t('settings.profileBasic')}
          </CardTitle>
          <CardDescription>{t('settings.profileBasicDesc')}</CardDescription>
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} disabled={isLoading}>
              <Pencil className="size-3.5" />
              {t('common.edit')}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2 py-1">
              <AvatarPickerField
                value={avatarUrl}
                onValueChange={setAvatarUrl}
                memberType="human"
                disabled
              />
            </div>
            <div className="divide-y divide-border">
              <ReadonlyRow label={t('settings.profileDisplayName')} value={currentUser?.displayName ?? ''} />
              <ReadonlyRow label={t('settings.profileEmail')} value={currentUser?.email ?? ''} />
              <ReadonlyRow label={t('settings.profileUsername')} value={currentUser?.username ?? ''} />
              <ReadonlyRow
                label={t('settings.profileTimezone')}
                value={timezoneLabel(currentUser?.timezone ?? '', t)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 资料编辑弹窗（F3.6/J14：带显式保存的常驻设置表单迁 Dialog，页面转只读+编辑入口） */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settings.profileBasic')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel>{t('settings.profileAvatar')}</FieldLabel>
              <FieldContent>
                <AvatarPickerField
                  value={avatarUrl}
                  onValueChange={setAvatarUrl}
                  memberType="human"
                  disabled={isLoading}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="profileDisplayName">
                {t('settings.profileDisplayName')}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="profileDisplayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="profileEmail">
                {t('settings.profileEmail')}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="profileEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="profileTimezone">
                {t('settings.profileTimezone')}
              </FieldLabel>
              <FieldContent>
                <SelectField
                  id="profileTimezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={isLoading}
                >
                  {TIMEZONES.map((tz) => (
                    <SelectFieldOption key={tz.value} value={tz.value}>
                      {tz.labelKey ? t(tz.labelKey) : tz.label}
                    </SelectFieldOption>
                  ))}
                </SelectField>
              </FieldContent>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || isLoading}>
              {saving ? t('settings.saving') : t('settings.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PasswordCard />
    </PageShell>
  );
}

/** 修改密码卡片：常驻只读 + 入口按钮，表单在弹窗（独立提交，不随资料保存） */
function PasswordCard() {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const closeDialog = () => {
    setEditOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error(t('settings.profilePasswordTooShort'));
      return;
    }
    if (newPassword !== confirm) {
      toast.error(t('settings.profilePasswordMismatch'));
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success(t('settings.profilePasswordSuccess'));
      closeDialog();
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      const apiError = err as ApiError;
      toast.error(
        apiError.response?.data?.error?.message ||
          t('settings.profilePasswordFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card className="border-border shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound size={16} className="text-accent-yellow" />
            {t('settings.profilePassword')}
          </CardTitle>
          <CardDescription>{t('settings.profilePasswordDesc')}</CardDescription>
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <KeyRound className="size-3.5" />
              {t('settings.profilePasswordSubmit')}
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      {/* 修改密码弹窗（F3.6/J14） */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
          else setEditOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.profilePassword')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="currentPassword">
                {t('settings.profileCurrentPassword')}
              </FieldLabel>
              <FieldContent>
                <PasswordInput
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="newPassword">
                {t('settings.profileNewPassword')}
              </FieldLabel>
              <FieldContent>
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmPassword">
                {t('settings.profileConfirmPassword')}
              </FieldLabel>
              <FieldContent>
                <PasswordInput
                  id="confirmPassword"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </FieldContent>
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '…' : t('settings.profilePasswordSubmit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
