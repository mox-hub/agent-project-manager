/**
 * CLI 工具 Tab —— CLI 适配器（claude-code / codex / zcode）检测、启停与安装指引。
 * @description 由原 ai-agents-section tools 页签迁移（2026-09-19 页面合并），
 * 品牌图标全量替换为厂家 logo（宪法 §6.1：emoji 仅限用户生成内容）。
 */
import { useState } from 'react';
import { AlertCircle, Check, Copy, RefreshCw } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/toast';
import {
  PROVIDER_DESCRIPTIONS,
  PROVIDER_DISPLAY_NAMES,
  useCliProviders,
  useConfigureCliProvider,
  useHealthCheckCliProvider,
  type CliProviderId,
  type CliProviderStatus,
} from '@/modules/mcp-server';
import { CliBrandIcon } from './provider-visuals';

/** CLI 安装提示（静态命令，仅展示，不做 i18n 翻译） */
const INSTALL_HINTS: Record<CliProviderId, string> = {
  'claude-code': 'npm install -g @anthropic-ai/claude-code',
  codex: 'npm install -g @openai/codex',
  zcode: 'zcode',
};

function cliProviderStatus(p: CliProviderStatus): 'online' | 'offline' | 'disabled' {
  if (!p.enabled) return 'disabled';
  return p.available ? 'online' : 'offline';
}

function CliToolCard({
  provider,
  onTest,
  onToggle,
  testing,
}: {
  provider: CliProviderStatus;
  onTest: () => void;
  onToggle: () => void;
  testing: boolean;
}) {
  const { t } = useTranslation();
  const name = PROVIDER_DISPLAY_NAMES[provider.providerId] ?? provider.providerId;
  const status = cliProviderStatus(provider);
  const tone = status === 'online' ? 'success' : status === 'offline' ? 'danger' : 'default';
  const labelMap = {
    online: t('aiHub.statusOnline'),
    offline: t('aiHub.statusOffline'),
    disabled: t('aiHub.disabled'),
  } as const;
  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CliBrandIcon providerId={provider.providerId} size={18} />
            {name}
          </CardTitle>
          <StatusPill tone={tone}>
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                status === 'online' && 'bg-accent-green',
                status === 'offline' && 'bg-accent-red',
                status === 'disabled' && 'bg-muted-foreground/50',
              )}
            />
            {labelMap[status]}
          </StatusPill>
        </div>
        <CardDescription>{PROVIDER_DESCRIPTIONS[provider.providerId] ?? name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {provider.version ? <p className="font-mono">v{provider.version}</p> : null}
          <p className="truncate font-mono" title={provider.commandPath}>{provider.commandPath}</p>
          {provider.model ? <p>{t('aiHub.modelLabel')}: {provider.model}</p> : null}
        </div>
        {provider.error && status === 'offline' ? (
          <p className="flex items-start gap-1.5 rounded-md bg-accent-red-light/50 p-2 text-xs text-accent-red">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">{provider.error}</span>
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onTest} disabled={testing} className="gap-1.5">
            {testing ? <Spinner className="size-3.5 text-inherit" /> : <RefreshCw size={13} />}
            {t('aiHub.test')}
          </Button>
          <Button variant={provider.enabled ? 'secondary' : 'default'} size="sm" onClick={onToggle}>
            {provider.enabled ? t('aiHub.disable') : t('aiHub.enable')}
          </Button>
        </div>
        <div>
          <p className="mb-1 text-11 font-medium text-muted-foreground">{t('aiHub.install')}</p>
          <CopyableCode text={INSTALL_HINTS[provider.providerId] ?? provider.commandPath} />
        </div>
      </CardContent>
    </Card>
  );
}

function CopyableCode({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-left font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/70"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title={t('aiHub.copy')}
    >
      <span className="min-w-0 flex-1 truncate">{text}</span>
      {copied ? <Check size={12} className="shrink-0 text-accent-green" /> : <Copy size={12} className="shrink-0" />}
    </button>
  );
}

function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-36" />
      ))}
    </div>
  );
}

export function ToolsTab() {
  const { t } = useTranslation();

  const { data: cliData, isLoading: cliLoading } = useCliProviders();
  const healthMutation = useHealthCheckCliProvider();
  const configureMutation = useConfigureCliProvider();
  const providers = cliData?.providers ?? [];

  const handleTestProvider = (provider: CliProviderStatus) => {
    const name = PROVIDER_DISPLAY_NAMES[provider.providerId] ?? provider.providerId;
    healthMutation.mutate(provider.providerId, {
      onSuccess: (result) => {
        const elapsed = (result.metadata?.lastHealthCheck as { elapsedMs?: number } | undefined)?.elapsedMs;
        if (result.available) {
          if (elapsed !== undefined) {
            toast.success(t('aiHub.providerOnlineMsToast', { name, ms: elapsed }));
          } else {
            toast.success(t('aiHub.providerOnlineToast', { name }));
          }
        } else if (result.error) {
          toast.error(t('aiHub.providerOfflineErrToast', { name, message: result.error }));
        } else {
          toast.error(t('aiHub.providerOfflineToast', { name }));
        }
      },
      onError: (err) =>
        toast.error(t('aiHub.healthCheckFailed', { message: err instanceof Error ? err.message : t('common.unknown') })),
    });
  };

  const handleToggleProvider = (provider: CliProviderStatus) => {
    const name = PROVIDER_DISPLAY_NAMES[provider.providerId] ?? provider.providerId;
    configureMutation.mutate(
      { providerId: provider.providerId, data: { providerId: provider.providerId, enabled: !provider.enabled } },
      {
        onSuccess: () => toast.success(t(provider.enabled ? 'aiHub.toggleOffToast' : 'aiHub.toggleOnToast', { name })),
        onError: (err) =>
          toast.error(t('aiHub.updateFailed', { message: err instanceof Error ? err.message : t('common.unknown') })),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{t('aiHub.cliTools')}</h2>
        <p className="text-xs text-muted-foreground">{t('aiHub.cliToolsDesc')}</p>
      </div>
      {cliLoading ? (
        <LoadingCards count={3} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider) => (
            <CliToolCard
              key={provider.providerId}
              provider={provider}
              onTest={() => handleTestProvider(provider)}
              onToggle={() => handleToggleProvider(provider)}
              testing={healthMutation.isPending && healthMutation.variables === provider.providerId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
