import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Copy, Undo2, Info } from 'lucide-react';

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
import { AsyncState } from '@/components/ui/async-state';
import { toast } from '@/components/ui/toast';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { authApi } from '@/modules/auth/api/auth-api';
import {
  useRegistrationInvites,
  useRevokeRegistrationInvite,
} from '../hooks/use-admin';
import { buildRegisterInviteLink } from '../api/admin-api';

const STATUS_LABEL: Record<string, string> = {
  pending: '待接受',
  accepted: '已接受',
  revoked: '已撤销',
  expired: '已过期',
};

export function InvitesSection({ statusFilter }: { statusFilter: string }) {
  const { t } = useTranslation();
  const { data: invites, isLoading, error, refetch } = useRegistrationInvites();
  const revokeInvite = useRevokeRegistrationInvite();
  const { copyToClipboard, isCopied } = useCopyToClipboard({ timeout: 2000 });

  // registrationMode：invite 模式下注册必须凭邀请
  const { data: publicConfig } = useQuery({
    queryKey: ['auth', 'public-config'],
    queryFn: () => authApi.getPublicConfig(),
    staleTime: 60 * 1000,
  });
  const inviteOnly = publicConfig?.registrationMode === 'invite';

  const visible = useMemo(
    () => (invites ?? []).filter((i) => statusFilter === 'all' || i.status === statusFilter),
    [invites, statusFilter],
  );

  const handleCopy = (token: string) => {
    copyToClipboard(buildRegisterInviteLink(token));
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvite.mutateAsync(id);
      toast.success(t('admin.inviteRevoked', '邀请已撤销'));
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      const apiError = err as ApiError;
      toast.error(
        apiError.response?.data?.error?.message || t('admin.inviteRevokeFailed', '撤销失败'),
      );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {inviteOnly
            ? t(
                'admin.inviteModeOn',
                '当前为邀请制注册：新成员必须凭邀请链接注册；开放注册已关闭。',
              )
            : t(
                'admin.inviteModeOff',
                '当前为开放注册：任何人可自行注册；仍可发送邀请链接用于定向邀请。',
              )}
        </span>
      </div>

      <AsyncState isLoading={isLoading} isEmpty={visible.length === 0} error={error?.message ?? null} onRetry={refetch}>
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.inviteEmail', '受邀邮箱')}</TableHead>
                <TableHead>{t('admin.status', '状态')}</TableHead>
                <TableHead>{t('admin.inviteCreatedBy', '创建人')}</TableHead>
                <TableHead>{t('admin.createdAt', '创建时间')}</TableHead>
                <TableHead>{t('admin.inviteExpiresAt', '过期时间')}</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((inv) => {
                const label = t(
                  `admin.inviteStatus.${inv.status}`,
                  STATUS_LABEL[inv.status] ?? inv.status,
                );
                const tone =
                  inv.status === 'accepted'
                    ? 'success'
                    : inv.status === 'pending'
                      ? 'warning'
                      : 'default';
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm">{inv.email ?? '—'}</TableCell>
                    <TableCell>
                      <StatusPill tone={tone}>{label}</StatusPill>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.createdBy ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(inv.expiresAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={t('admin.copyLink', '复制链接')}
                          onClick={() => handleCopy(inv.token)}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        {inv.status === 'pending' ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title={t('admin.revokeInvite', '撤销')}
                            disabled={revokeInvite.isPending}
                            onClick={() => handleRevoke(inv.id)}
                          >
                            <Undo2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      </AsyncState>
      {isCopied ? (
        <p className="text-xs text-accent-green">{t('admin.linkCopied', '链接已复制到剪贴板')}</p>
      ) : null}
    </div>
  );
}
