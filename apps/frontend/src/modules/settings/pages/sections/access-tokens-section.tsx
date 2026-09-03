/**
 * @file 设置页 · 访问 Token（PAT）管理区块
 * @description 创建（明文一次性展示+复制）、列表（前缀/状态/最近使用）、吊销。
 *              Token 供 AI/外部工具免登录调用 API：apm login --token <token>。
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { KeyRound, Plus, Copy, Check, Trash2 } from 'lucide-react';
import { api } from '@/infrastructure/api-client';
import { PageShell } from '@/components/ui/page-shell';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { SectionCard } from '@/components/ui/section-card';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
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
import { SkeletonTable } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

interface AccessTokenItem {
  id: string;
  name: string;
  tokenPrefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

const EXPIRY_OPTIONS = [
  { value: '0', days: 0 },
  { value: '30', days: 30 },
  { value: '90', days: 90 },
  { value: '365', days: 365 },
] as const;

function formatTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export function AccessTokensSettingsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const confirmAction = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('0');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const { copyToClipboard, isCopied } = useCopyToClipboard({
    onCopy: () => toast(t('settings.tokenCopied')),
  });

  const tokens = useQuery({
    queryKey: ['accessTokens'],
    queryFn: async (): Promise<AccessTokenItem[]> => api.get('/auth/tokens'),
  });

  const createToken = useMutation({
    mutationFn: async () =>
      api.post<{ token: string }>('/auth/tokens', {
        name: name.trim(),
        ...(Number(expiry) > 0
          ? { expiresInDays: Number(expiry) }
          : {}),
      }),
    onSuccess: (data) => {
      setCreatedToken(data.token);
      setCreateOpen(false);
      setName('');
      queryClient.invalidateQueries({ queryKey: ['accessTokens'] });
    },
    onError: () => toast.error(t('settings.tokenCreateFailed')),
  });

  const revokeToken = useMutation({
    mutationFn: async (id: string) => api.delete(`/auth/tokens/${id}`),
    onSuccess: () => {
      toast(t('settings.tokenRevoked'));
      queryClient.invalidateQueries({ queryKey: ['accessTokens'] });
    },
    onError: () => toast.error(t('settings.tokenRevokeFailed')),
  });

  const handleRevoke = async (item: AccessTokenItem) => {
    const ok = await confirmAction({
      title: t('settings.tokenRevokeTitle'),
      description: t('settings.tokenRevokeDesc', { name: item.name }),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (ok) revokeToken.mutate(item.id);
  };

  // 过期判定需要当前时间：effect 中取快照，保持渲染纯度（首帧未判定、随后修正）
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    setNowMs(Date.now());
  }, [tokens.data]);

  const tokenStatus = (item: AccessTokenItem) => {
    if (item.revokedAt) return { tone: 'default' as const, label: t('settings.tokenStatusRevoked') };
    if (item.expiresAt && Date.parse(item.expiresAt) < nowMs) {
      return { tone: 'danger' as const, label: t('settings.tokenStatusExpired') };
    }
    return { tone: 'success' as const, label: t('settings.tokenStatusActive') };
  };

  return (
    <PageShell
      aiPage="settings.tokens"
      title={t('settings.tokensTitle')}
      icon={KeyRound}
      actions={
        <HeaderActionButton
          icon={Plus}
          label={t('settings.tokenCreate')}
          onClick={() => {
            setName('');
            setExpiry('0');
            setCreateOpen(true);
          }}
        />
      }
    >
      <div className="space-y-6 px-6 pb-6">
        <SectionCard
          title={t('settings.tokensListTitle')}
          description={t('settings.tokensListDesc')}
        >
          <AsyncState
            isLoading={tokens.isLoading}
            loadingFallback={<SkeletonTable rows={3} columns={5} />}
            isEmpty={!tokens.isLoading && (tokens.data?.length ?? 0) === 0}
            emptyTitle={t('settings.tokenEmptyTitle')}
            emptyDescription={t('settings.tokenEmptyDesc')}
          >
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings.tokenColName')}</TableHead>
                    <TableHead>{t('settings.tokenColPrefix')}</TableHead>
                    <TableHead>{t('settings.tokenColStatus')}</TableHead>
                    <TableHead>{t('settings.tokenColLastUsed')}</TableHead>
                    <TableHead>{t('settings.tokenColCreatedAt')}</TableHead>
                    <TableHead>{t('settings.tokenColActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tokens.data ?? []).map((item) => {
                    const status = tokenStatus(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="font-mono">
                          {item.tokenPrefix}…
                        </TableCell>
                        <TableCell>
                          <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        </TableCell>
                        <TableCell>{formatTime(item.lastUsedAt)}</TableCell>
                        <TableCell>{formatTime(item.createdAt)}</TableCell>
                        <TableCell>
                          {!item.revokedAt && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={revokeToken.isPending}
                              onClick={() => void handleRevoke(item)}
                            >
                              <Trash2 />
                              {t('settings.tokenRevoke')}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableShell>
          </AsyncState>
        </SectionCard>

        <Alert>{t('settings.tokenUsageTip')}</Alert>
        <div className="space-y-1.5 font-mono text-xs">
          <div>apm login --token &lt;{t('settings.runtimeGuideToken')}&gt;</div>
          <div>apm config set accessToken &lt;{t('settings.runtimeGuideToken')}&gt;</div>
        </div>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreatedToken(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.tokenCreate')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="token-name">{t('settings.tokenNameLabel')}</Label>
              <Input
                id="token-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('settings.tokenNamePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="token-expiry">{t('settings.tokenExpiryLabel')}</Label>
              <NativeSelect
                id="token-expiry"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.days === 0
                      ? t('settings.tokenExpiryNever')
                      : t('settings.tokenExpiryDays', { days: option.days })}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                disabled={!name.trim() || createToken.isPending}
                onClick={() => createToken.mutate()}
              >
                {t('settings.tokenCreateSubmit')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(createdToken)}
        onOpenChange={(open) => {
          if (!open) setCreatedToken(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.tokenCreatedTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">{t('settings.tokenCreatedWarn')}</Alert>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-content-bg-secondary px-2 py-1.5 font-mono text-xs">
                {createdToken}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(createdToken ?? '')}
              >
                {isCopied ? <Check /> : <Copy />}
                {isCopied ? t('settings.tokenCopied') : t('settings.tokenCopy')}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setCreatedToken(null)}>
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
