import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UserRound, Save, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Input, PasswordInput } from '@/components/ui/input';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { AvatarPickerField } from '@/components/ui/avatar-picker-field';
import { PageShell } from '@/components/ui/page-shell';
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

/** 个人资料设置子页：基本信息（昵称/邮箱/头像/时区）+ 修改密码 */
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
      className="bg-background text-foreground"
      contentClassName="space-y-6"
      actions={
        <HeaderActionButton
          icon={Save}
          label={saving ? t('settings.saving') : t('settings.saveChanges')}
          pinned
          onClick={handleSave}
          disabled={saving || isLoading}
        />
      }
    >
      <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound size={16} className="text-accent-blue" />
                {t('settings.profileBasic')}
              </CardTitle>
              <CardDescription>{t('settings.profileBasicDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="grid gap-4 md:grid-cols-2">
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
                  <FieldLabel htmlFor="profileUsername">
                    {t('settings.profileUsername')}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="profileUsername"
                      value={currentUser?.username ?? ''}
                      disabled
                    />
                    <FieldDescription>
                      {t('settings.profileUsernameDesc')}
                    </FieldDescription>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="profileTimezone">
                    {t('settings.profileTimezone')}
                  </FieldLabel>
                  <FieldContent>
                    <NativeSelect
                      id="profileTimezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      disabled={isLoading}
                    >
                      {TIMEZONES.map((tz) => (
                        <NativeSelectOption key={tz.value} value={tz.value}>
                          {tz.labelKey ? t(tz.labelKey) : tz.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FieldContent>
                </Field>
              </div>
            </CardContent>
          </Card>

          <PasswordCard />
    </PageShell>
  );
}

/** 修改密码卡片（独立提交，不随页头保存） */
function PasswordCard() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
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
    <Card className="border-border shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound size={16} className="text-accent-yellow" />
          {t('settings.profilePassword')}
        </CardTitle>
        <CardDescription>{t('settings.profilePasswordDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
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
          <div className="flex items-end md:col-span-3">
            <Button type="submit" variant="outline" disabled={submitting}>
              {submitting ? '…' : t('settings.profilePasswordSubmit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
