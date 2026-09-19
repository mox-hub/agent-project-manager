/**
 * 概览 Tab —— 快捷设置（内置模型/厂家启停）+ 四源真实数据 KPI 与健康一览。
 * @description 由原 ai-agents-section overview 页签升级（2026-09-19 页面合并）：
 * 新增「模型服务」KPI；原 ai-management 的 mock 配额、信任等级演示卡与统计三卡
 * （依赖假技能开关数据）一并废除，统一由本 Tab 真实数据承担。
 * 同批追加（CAP-A-20）：快捷设置卡——工作区内置模型（provider+model 持久化，
 * AI 调用链无显式偏好时的默认目标）与模型服务厂家启停，一处配置。
 */
import { AlertCircle, Brain, Cpu, Server, Terminal, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useTranslation } from 'react-i18next';
import { useAiProviders, useUpdateProvider } from '@/modules/ai-hub/hooks/use-ai-providers';
import { useCliProviders, useMcpServers, PROVIDER_DISPLAY_NAMES, type CliProviderStatus, type McpServerStatus } from '@/modules/mcp-server';
import { useSkills } from '@/modules/skills';
import { CliBrandIcon, ProviderBrandIcon, ProviderStatusDot, providerDisplayName } from './provider-visuals';
import { useDefaultModelForm } from './use-default-model-form';
import type { AiManagementTab } from './ai-management-tabs';

function cliProviderStatus(p: CliProviderStatus): 'online' | 'offline' | 'disabled' {
  if (!p.enabled) return 'disabled';
  return p.available ? 'online' : 'offline';
}

function mcpServerStatus(s: McpServerStatus): 'online' | 'offline' | 'disabled' | 'unknown' {
  if (!s.enabled) return 'disabled';
  return s.status;
}

function HealthStatusBadge({ status }: { status: 'online' | 'offline' | 'disabled' | 'unknown' }) {
  const { t } = useTranslation();
  const tone = status === 'online' ? 'success' : status === 'offline' ? 'danger' : 'default';
  const labelMap = {
    online: t('aiHub.statusOnline'),
    offline: t('aiHub.statusOffline'),
    disabled: t('aiHub.disabled'),
    unknown: t('aiHub.statusUnknown'),
  } as const;
  return (
    <StatusPill tone={tone} className="gap-1.5">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'online' && 'bg-accent-green',
          status === 'offline' && 'bg-accent-red',
          (status === 'disabled' || status === 'unknown') && 'bg-muted-foreground/50',
        )}
      />
      {labelMap[status]}
    </StatusPill>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Terminal;
  danger?: boolean;
}) {
  return (
    <Card className="border-border shadow-none" size="sm">
      <CardContent className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', danger ? 'bg-accent-red-light' : 'bg-muted')}>
          <Icon size={16} className={danger ? 'text-accent-red' : 'text-muted-foreground'} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight tabular-nums">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label} · {hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 快捷设置卡：工作区内置模型（provider+model 持久化）+ 模型服务厂家启停
 */
function QuickSettingsCard({ onNavigateTab }: { onNavigateTab: (tab: AiManagementTab) => void }) {
  const { t } = useTranslation();
  const { data: providers = [], isLoading: providersLoading } = useAiProviders();
  const updateProviderMutation = useUpdateProvider();
  const {
    saved,
    effective,
    setDraft,
    clearDraft,
    providerOptions,
    modelOptionsFor,
    isDirty,
    setDefaultModelMutation,
  } = useDefaultModelForm(providers);

  const modelOptions = effective?.provider ? modelOptionsFor(effective.provider) : [];

  const handleSaveDefaultModel = () => {
    if (!effective?.provider || !effective.model) return;
    setDefaultModelMutation.mutate(
      { provider: effective.provider, model: effective.model },
      {
        onSuccess: () => {
          clearDraft();
          toast.success(t('aiHub.defaultModelSaved'));
        },
        onError: (err) =>
          toast.error(
            t('aiHub.defaultModelSaveFailed', {
              message: err instanceof Error ? err.message : t('common.unknown'),
            }),
          ),
      },
    );
  };

  const nameOf = (providerKey: string) => {
    const p = providers.find((x) => x.provider === providerKey);
    return p?.displayName || providerDisplayName(providerKey) || providerKey;
  };

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{t('aiHub.quickSettings')}</CardTitle>
        <CardDescription>{t('aiHub.quickSettingsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 内置模型：AI 调用链无显式偏好时的默认 provider + model */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Brain className="size-3.5 text-muted-foreground" />
            {t('aiHub.defaultModel')}
          </label>
          {providersLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : providers.length === 0 ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-2.5">
              <p className="text-sm text-muted-foreground">{t('aiHub.defaultModelNoProviders')}</p>
              <Button variant="outline" size="sm" onClick={() => onNavigateTab('models')}>
                {t('aiHub.tabModels')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={effective?.provider ?? ''}
                onValueChange={(v) => setDraft({ provider: v, model: modelOptionsFor(v)[0] ?? '' })}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder={t('aiHub.selectProvider')}>
                    {effective?.provider ? nameOf(effective.provider) : t('aiHub.selectProvider')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {providerOptions.map((p) => (
                    <SelectItem key={p.id} value={p.provider}>
                      <div className="flex items-center gap-2">
                        <ProviderStatusDot status={p.status} hasApiKey={p.hasApiKey} />
                        {nameOf(p.provider)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={effective?.model ?? ''}
                onValueChange={(v) =>
                  effective?.provider && setDraft({ provider: effective.provider, model: v })
                }
                disabled={!effective?.provider || modelOptions.length === 0}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder={t('aiHub.selectModel')}>
                    {effective?.model || t('aiHub.selectModel')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isDirty && effective?.model ? (
                <Button
                  size="sm"
                  onClick={handleSaveDefaultModel}
                  disabled={setDefaultModelMutation.isPending}
                >
                  {t('common.save')}
                </Button>
              ) : (
                !isDirty &&
                saved && (
                  <Badge className="bg-accent-green/10 text-accent-green">
                    <Zap className="mr-1 size-3" />
                    {t('aiHub.defaultModelBadge')}
                  </Badge>
                )
              )}
            </div>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">{t('aiHub.defaultModelHint')}</p>
        </div>

        {/* 模型服务厂家启停 */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Cpu className="size-3.5 text-muted-foreground" />
            {t('aiHub.providerToggles')}
          </label>
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('aiHub.defaultModelNoProviders')}</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ProviderBrandIcon provider={p.provider} size={18} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {p.displayName || providerDisplayName(p.provider) || p.provider}
                      </span>
                      {!p.hasApiKey && (
                        <span className="block text-xs text-muted-foreground">
                          {t('aiHub.disconnected')}
                        </span>
                      )}
                    </span>
                  </span>
                  <Switch
                    size="sm"
                    checked={p.enabled}
                    disabled={updateProviderMutation.isPending}
                    onCheckedChange={(v) =>
                      updateProviderMutation.mutate({ id: p.id, data: { enabled: v } })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewTab({ onNavigateTab }: { onNavigateTab: (tab: AiManagementTab) => void }) {
  const { t } = useTranslation();

  // 模型服务（真实）
  const { data: aiProviders = [], isLoading: providersLoading } = useAiProviders();
  const connectedProviders = aiProviders.filter((p) => p.status === 'connected').length;

  // CLI providers（真实）
  const { data: cliData, isLoading: cliLoading } = useCliProviders();
  const cliProviders = cliData?.providers ?? [];
  const onlineProviders = cliProviders.filter((p) => cliProviderStatus(p) === 'online').length;

  // 外部 MCP servers（真实）
  const { data: mcpData, isLoading: mcpLoading } = useMcpServers();
  const servers = mcpData?.servers ?? [];
  const onlineServers = servers.filter((s) => mcpServerStatus(s) === 'online').length;

  // Skills（真实）
  const { data: skillsData, isLoading: skillsLoading } = useSkills();
  const skills = skillsData?.skills ?? [];
  const enabledSkills = skills.filter((s) => s.enabled).length;

  const errors =
    cliProviders.filter((p) => cliProviderStatus(p) === 'offline').length +
    servers.filter((s) => mcpServerStatus(s) === 'offline').length;

  const loading = providersLoading || cliLoading || mcpLoading || skillsLoading;

  if (loading) {
    return (
      <div className="grid gap-3 grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 快捷设置：内置模型 + 厂家启停（一次性配置面） */}
      <QuickSettingsCard onNavigateTab={onNavigateTab} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KpiCard label={t('aiHub.tabModels')} value={`${connectedProviders}/${aiProviders.length}`} hint={t('aiHub.connected')} icon={Cpu} />
        <KpiCard label={t('aiHub.cliTools')} value={`${onlineProviders}/${cliProviders.length}`} hint={t('aiHub.statusOnline')} icon={Terminal} />
        <KpiCard label={t('aiHub.mcpServers')} value={`${onlineServers}/${servers.length}`} hint={t('aiHub.statusOnline')} icon={Server} />
        <KpiCard label={t('aiHub.skills')} value={`${enabledSkills}/${skills.length}`} hint={t('aiHub.active')} icon={Zap} />
        <KpiCard
          label={t('aiHub.kpiErrors')}
          value={String(errors)}
          hint={errors > 0 ? t('aiHub.needsAttention') : t('aiHub.allGood')}
          icon={AlertCircle}
          danger={errors > 0}
        />
      </div>

      <Card className="border-border shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t('aiHub.cliHealthTitle')}</CardTitle>
          <CardDescription>{t('aiHub.cliHealthDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {cliProviders.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                onClick={() => onNavigateTab('tools')}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <CliBrandIcon providerId={provider.providerId} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {PROVIDER_DISPLAY_NAMES[provider.providerId] ?? provider.providerId}
                  </span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {provider.version ? `v${provider.version}` : provider.commandPath}
                  </span>
                </span>
                <HealthStatusBadge status={cliProviderStatus(provider)} />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t('aiHub.mcpHealthTitle')}</CardTitle>
          <CardDescription>{t('aiHub.mcpHealthDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {servers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('aiHub.mcpHealthEmpty')}</p>
          ) : (
            <div className="space-y-2">
              {servers.map((server) => (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => onNavigateTab('mcp')}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{server.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {typeof server.toolCount === 'number' ? t('aiHub.toolsCount', { count: server.toolCount }) : server.transport}
                  </span>
                  <HealthStatusBadge status={mcpServerStatus(server)} />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
