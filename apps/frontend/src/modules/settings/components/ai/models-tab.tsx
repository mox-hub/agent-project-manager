/**
 * 模型服务 Tab —— AI 厂家接入、API 密钥 / Base URL 管理、模型查询与内置模型设置。
 * @description 由原 ai-management-section 手风琴区迁移（2026-09-19 页面合并），
 * 去除手风琴壳改为平铺区块；品牌视觉统一走 provider-visuals。
 * 同批追加（CAP-A-20）：顶部卡片改真·内置模型控制（provider+model 持久化，
 * 替换原仅本地 state 的假切换器）；详情区补模型真实查询（/models 端点）与
 * 可配置查询链接（metadata.modelsEndpoint）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brain, Check, CircleCheck, CircleX, Coins, Key, Link2, RefreshCw, RotateCcw, Save, Search, Sparkles, Trash2, Wallet, Zap, Cpu } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input, PasswordInput } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAiProviders, useUpdateProvider, useTestProvider, useDetectModels, useProviderBalance, providerKeys, resolveTestConnectionErrorMessage } from '@/modules/ai-hub/hooks/use-ai-providers';
import { usePricingSource, useRefreshPricingSource } from '@/modules/ai-hub/hooks/use-pricing-source';
import { useProviderValidation } from '@/modules/ai-hub/hooks/use-validate-provider';
import type { AIProviderConfig } from '@/modules/ai-hub/api/ai-hub-api';
import { useDefaultModelForm } from './use-default-model-form';
import {
  PROVIDER_DEFAULT_BASE_URL,
  PROVIDER_INFO,
  PROVIDER_MODELS,
  ProviderBrandIcon,
  ProviderStatusDot,
  providerDisplayName,
} from './provider-visuals';

/**
 * 派生默认模型查询端点（与后端 resolveModelsEndpoint 同口径）：
 * openai 兼容 `${base}/models`；anthropic/gemini 按版本段拼 /v1/models、/v1beta/models
 */
/** baseUrl 展示 host（无效 URL 返回 null） */
function hostFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function deriveDefaultModelsEndpoint(providerKey: string, baseUrl?: string | null): string {
  const base = (baseUrl || PROVIDER_DEFAULT_BASE_URL[providerKey] || '').replace(/\/+$/, '');
  if (!base) return '';
  if (providerKey === 'anthropic') return /\/v\d+$/.test(base) ? `${base}/models` : `${base}/v1/models`;
  if (providerKey === 'gemini') return /\/v\d\w*$/.test(base) ? `${base}/models` : `${base}/v1beta/models`;
  return `${base}/models`;
}

/** 派生默认余额查询端点（与后端 resolveBalanceEndpoint 同口径：域名根 + /user/balance） */
function deriveDefaultBalanceEndpoint(baseUrl?: string | null): string {
  const base = (baseUrl || '').replace(/\/+$/, '');
  if (!base) return '';
  try {
    return `${new URL(base).origin}/user/balance`;
  } catch {
    return '';
  }
}

/** 金额格式化（币种存在时走 currency 样式） */
function formatAmount(v: number, currency?: string | null): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: currency ? 'currency' : 'decimal',
      currency: currency || undefined,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${v}${currency ? ` ${currency}` : ''}`;
  }
}

/** 额度紧凑格式（token/金额窗口通用） */
function formatCompact(v: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(v);
  } catch {
    return String(v);
  }
}

const clampPercent = (v: number) => Math.max(0, Math.min(100, v));

/** 进度条颜色（完整类名字面量，JIT 可扫描） */
function progressIndicatorClass(tone: 'green' | 'yellow' | 'red'): string {
  switch (tone) {
    case 'red':
      return '[&_[data-slot=progress-indicator]]:bg-accent-red';
    case 'yellow':
      return '[&_[data-slot=progress-indicator]]:bg-accent-yellow';
    default:
      return '[&_[data-slot=progress-indicator]]:bg-accent-green';
  }
}

/**
 * 余额展示（自适应厂家返回形态）：
 * 充值型 → 剩余余额单进度条（分母=赠送+充值累计，缺失时满条纯展示）；
 * 套餐型 → 5 小时/周/月等限额窗口多进度条；unknown → 配置引导。
 */
function ProviderBalanceCard({
  provider,
  endpointValue,
  onEndpointChange,
}: {
  provider: AIProviderConfig;
  endpointValue: string;
  onEndpointChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, isRefetching } = useProviderBalance(
    provider.id,
    provider.hasApiKey,
  );

  if (!provider.hasApiKey) return null;

  const periodLabel = (period: string) => {
    switch (period) {
      case '5h':
        return t('aiHub.balancePeriod5h');
      case 'day':
        return t('aiHub.balancePeriodDay');
      case 'week':
        return t('aiHub.balancePeriodWeek');
      case 'month':
        return t('aiHub.balancePeriodMonth');
      default:
        return period;
    }
  };

  let body: React.ReactNode;
  if (isLoading) {
    body = <Skeleton className="h-10 w-full" />;
  } else if (isError) {
    body = (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-2.5">
        <p className="text-xs text-muted-foreground">{t('aiHub.balanceLoadFailed')}</p>
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => refetch()}>
          <RefreshCw className="size-3" />
          {t('aiHub.balanceRetry')}
        </Button>
      </div>
    );
  } else if (!data || data.type === 'unknown') {
    body = <p className="text-xs text-muted-foreground">{t('aiHub.balanceUnknownHint')}</p>;
  } else if (data.type === 'prepaid') {
    // 充值型：进度=剩余/累计到账（无累计数据时满条纯展示）
    const denom = (data.toppedUpBalance ?? 0) + (data.grantedBalance ?? 0);
    const pct = denom > 0 ? clampPercent(((data.balance ?? 0) / denom) * 100) : 100;
    const tone = pct <= 20 ? 'red' : pct <= 50 ? 'yellow' : 'green';
    body = (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {t('aiHub.balanceRemainingLabel')}
            {data.isAvailable === false && (
              <Badge variant="destructive" className="ml-2 h-4 px-1.5 text-10">
                {t('aiHub.balanceUnavailable')}
              </Badge>
            )}
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatAmount(data.balance ?? 0, data.currency)}
          </span>
        </div>
        <Progress value={pct} className={cn('w-full', progressIndicatorClass(tone))} />
      </div>
    );
  } else {
    // 套餐型：每窗口一条进度条（百分比型直接取 percent；有 limit 用已用/限额，否则按剩余纯展示）
    body = (
      <div className="space-y-3">
        {data.windows.map((w) => {
          const pct =
            w.percent != null
              ? clampPercent(w.percent)
              : w.limit && w.limit > 0
                ? clampPercent(((w.used ?? 0) / w.limit) * 100)
                : null;
          const tone = pct === null ? 'green' : pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green';
          return (
            <div key={w.period} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{periodLabel(w.period)}</span>
                <span className="tabular-nums text-foreground">
                  {w.percent != null
                    ? `${clampPercent(w.percent)}%`
                    : w.limit != null
                      ? `${formatCompact(w.used ?? 0)} / ${formatCompact(w.limit)}`
                      : w.remaining != null
                        ? t('aiHub.balanceWindowRemaining', { amount: formatCompact(w.remaining) })
                        : formatCompact(w.used ?? 0)}
                  {w.resetsAt ? (
                    <span className="ml-2 text-muted-foreground">
                      {t('aiHub.balanceResets', { time: w.resetsAt })}
                    </span>
                  ) : null}
                </span>
              </div>
              <Progress value={pct ?? 100} className={cn('w-full', progressIndicatorClass(tone))} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Wallet className="size-3.5 text-muted-foreground" />
          {t('aiHub.balanceTitle')}
        </label>
        {!isLoading && !isError && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => refetch()}
            disabled={isRefetching}
            title={t('aiHub.balanceRefresh')}
          >
            {isRefetching ? <Spinner className="size-3 text-inherit" /> : <RefreshCw className="size-3" />}
          </Button>
        )}
      </div>
      {body}
      {/* 余额查询链接：留空用默认端点（Base URL 域 + /user/balance），如 https://api.deepseek.com/user/balance */}
      <div className="relative mt-2">
        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={endpointValue}
          onChange={(e) => onEndpointChange(e.target.value)}
          placeholder={deriveDefaultBalanceEndpoint(provider.baseUrl) || 'https://api.example.com/user/balance'}
          className="pl-9"
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t('aiHub.balanceEndpointHint')}</p>
    </div>
  );
}

/**
 * 参考价源状态卡（CAP-A-21）：models.dev 目录加载状态 + 手动强刷。
 * 只读状态查询不触发网络；模型清单仍以供应商 /models 为权威，此处仅展示价目参考源健康度。
 */
function PricingSourceCard() {
  const { t } = useTranslation();
  const { data, isLoading } = usePricingSource();
  const refreshMutation = useRefreshPricingSource();

  const handleRefresh = () => {
    refreshMutation.mutate(undefined, {
      onSuccess: (res) => {
        if (res.available) {
          toast.success(t('aiHub.pricingSourceRefreshed'));
        } else {
          toast.error(
            t('aiHub.pricingSourceRefreshFailed', { message: res.error || t('common.unknown') }),
          );
        }
      },
      onError: (err: { message?: string }) =>
        toast.error(
          t('aiHub.pricingSourceRefreshFailed', { message: err?.message || t('common.unknown') }),
        ),
    });
  };

  return (
    <Card className="border-border shadow-none">
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Coins className="size-4 shrink-0 text-accent-yellow" />
            <div className="min-w-0 text-xs">
              <p className="font-medium text-foreground">{t('aiHub.pricingSourceTitle')}</p>
              {isLoading ? (
                <Skeleton className="mt-0.5 h-3 w-48" />
              ) : (
                <p className="truncate text-muted-foreground">
                  {data?.available ? (
                    <>
                      <span className="mr-2 inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
                        {t('aiHub.pricingSourceOnline')}
                      </span>
                      {t('aiHub.pricingSourceCoverage', {
                        providers: data.providerCount,
                        models: data.modelCount,
                      })}
                      {data.fetchedAt ? ` · ${new Date(data.fetchedAt).toLocaleString()}` : ''}
                    </>
                  ) : (
                    t('aiHub.pricingSourceNever')
                  )}
                  {data?.error ? ` · ${data.error}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {data?.stale && (
              <Badge variant="outline" className="h-5 px-1.5 text-10">
                {t('aiHub.pricingSourceStale')}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleRefresh}
              disabled={refreshMutation.isPending}
              title={t('aiHub.pricingSourceRefresh')}
            >
              {refreshMutation.isPending ? (
                <Spinner className="size-3 text-inherit" />
              ) : (
                <RefreshCw className="size-3" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t('aiHub.pricingSourceHint')}</p>
      </CardContent>
    </Card>
  );
}

type ProviderStatusTone = 'connected' | 'disconnected' | 'error';function normalizeProviderStatus(status: AIProviderConfig['status']): ProviderStatusTone {
  if (status === 'connected' || status === 'active') return 'connected';
  if (status === 'error') return 'error';
  return 'disconnected';
}

function ProviderStatusBadge({ status }: { status: ProviderStatusTone }) {
  const { t } = useTranslation();
  const tone = status === 'connected' ? 'success' : status === 'error' ? 'danger' : 'default';
  const labelMap = {
    connected: t('aiHub.connected'),
    disconnected: t('aiHub.disconnected'),
    error: t('aiHub.error'),
  } as const;
  return (
    <StatusPill tone={tone}>
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'connected' && 'bg-accent-green',
          status === 'error' && 'bg-accent-red',
          status === 'disconnected' && 'bg-muted-foreground/50',
        )}
      />
      {labelMap[status]}
    </StatusPill>
  );
}

export function ModelsTab() {
  const { t } = useTranslation();
  // ─── Data Hooks ──────────────────────────────────────────────
  const { data: providers = [], isLoading: isLoadingProviders } = useAiProviders();
  const updateProviderMutation = useUpdateProvider();
  const testProviderMutation = useTestProvider();
  const detectModelsMutation = useDetectModels();
  const queryClient = useQueryClient();
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

  // ─── Local State ─────────────────────────────────────────────
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [baseUrlInputs, setBaseUrlInputs] = useState<Record<string, string>>({});
  const [baseUrlSaveStatus, setBaseUrlSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const baseUrlTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [modelsEndpointInputs, setModelsEndpointInputs] = useState<Record<string, string>>({});
  const modelsEndpointTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [balanceEndpointInputs, setBalanceEndpointInputs] = useState<Record<string, string>>({});
  const balanceEndpointTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [apiKeySaveStatus, setApiKeySaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'deleting'>('idle');
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);

  // Callback when API key validation succeeds
  const handleValidationSuccess = () => {
    if (!selectedProvider || !apiKeyInput) return;
    const providerName = providerDisplayName(selectedProvider.provider) ?? selectedProvider.provider;
    setApiKeySaveStatus('saving');
    updateProviderMutation.mutate(
      { id: selectedProvider.id, data: { apiKey: apiKeyInput } },
      {
        onSuccess: () => {
          setApiKeySaveStatus('saved');
          toast.success(t('aiHub.apiKeySavedToast', { name: providerName }));
          setTimeout(() => {
            setApiKeySaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
          }, 2000);
        },
        onError: (err: { message?: string }) => {
          setApiKeySaveStatus('error');
          toast.error(t('aiHub.apiKeySaveFailed', { message: err?.message || t('common.unknown') }));
        },
      },
    );
  };

  const { status, validate, reset } = useProviderValidation(undefined, handleValidationSuccess);

  // ─── Computed Values ───────────────────────────────────────────
  const selectedProvider = useMemo(() => {
    return providers.find((p) => p.id === selectedProviderId) ?? null;
  }, [providers, selectedProviderId]);

  // 模型清单：后端 availableModels 优先（模型查询落库结果），空则内置清单兜底
  const displayModels = useMemo(() => {
    if (!selectedProvider) return [];
    if (selectedProvider.availableModels && selectedProvider.availableModels.length > 0) {
      return selectedProvider.availableModels;
    }
    return PROVIDER_MODELS[selectedProvider.provider] ?? [];
  }, [selectedProvider]);

  // 同类型多槽位的类型集合：这些类型的卡片副标题显示 baseUrl host 以区分槽位
  const multiSlotProviderKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of providers) counts.set(p.provider, (counts.get(p.provider) ?? 0) + 1);
    return new Set([...counts].filter(([, n]) => n > 1).map(([k]) => k));
  }, [providers]);

  // ─── Effects ──────────────────────────────────────────────
  // Set initial selected provider（优先首个已连接 / 已配密钥的厂家）
  useEffect(() => {
    if (selectedProviderId || providers.length === 0) return;
    const target =
      providers.find((p) => p.status === 'connected') ?? providers.find((p) => p.hasApiKey) ?? providers[0];
    if (target) setSelectedProviderId(target.id);
  }, [providers, selectedProviderId]);

  // Sync baseUrl inputs from providers data（用户未开始编辑的厂家才同步）
  useEffect(() => {
    setBaseUrlInputs((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const provider of providers) {
        if (!(provider.id in prev)) {
          next[provider.id] = provider.baseUrl || PROVIDER_DEFAULT_BASE_URL[provider.provider] || '';
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [providers]);

  // Sync models endpoint inputs（metadata.modelsEndpoint，用户未开始编辑的厂家才同步）
  useEffect(() => {
    setModelsEndpointInputs((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const provider of providers) {
        if (!(provider.id in prev)) {
          const meta = (provider.metadata ?? {}) as Record<string, unknown>;
          next[provider.id] = typeof meta.modelsEndpoint === 'string' ? meta.modelsEndpoint : '';
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [providers]);

  // Sync balance endpoint inputs（metadata.balanceEndpoint，用户未开始编辑的厂家才同步）
  useEffect(() => {
    setBalanceEndpointInputs((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const provider of providers) {
        if (!(provider.id in prev)) {
          const meta = (provider.metadata ?? {}) as Record<string, unknown>;
          next[provider.id] = typeof meta.balanceEndpoint === 'string' ? meta.balanceEndpoint : '';
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [providers]);

  // Cleanup timers on unmount
  useEffect(() => {
    const baseUrlTimers = baseUrlTimersRef.current;
    const endpointTimers = modelsEndpointTimersRef.current;
    const balanceTimers = balanceEndpointTimersRef.current;
    return () => {
      Object.values(baseUrlTimers).forEach((timer) => clearTimeout(timer));
      Object.values(endpointTimers).forEach((timer) => clearTimeout(timer));
      Object.values(balanceTimers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // ─── Handlers ────────────────────────────────────────────────
  const handleValidateApiKey = () => {
    if (!selectedProvider || !apiKeyInput) return;
    const currentBaseUrl = baseUrlInputs[selectedProvider.id] ?? selectedProvider.baseUrl;
    // 传已保存记录 ID：后端校验通过即同步该厂家在线状态（connected）
    validate(selectedProvider.provider, apiKeyInput, currentBaseUrl || undefined, selectedProvider.id);
  };

  const handleDeleteApiKey = () => {
    if (!selectedProvider) return;
    const providerName = providerDisplayName(selectedProvider.provider) ?? selectedProvider.provider;
    setApiKeySaveStatus('deleting');

    // Optimistically update local cache to reset provider state immediately
    queryClient.setQueryData<typeof providers>(providerKeys.all, (old) => {
      if (!old) return old;
      return old.map((p) =>
        p.id === selectedProvider.id
          ? { ...p, hasApiKey: false, status: 'disconnected', errorMessage: null, lastValidatedAt: null }
          : p,
      );
    });

    updateProviderMutation.mutate(
      { id: selectedProvider.id, data: { apiKey: '' } },
      {
        onSuccess: () => {
          setApiKeySaveStatus('idle');
          setApiKeyInput('');
          reset();
          toast.success(t('aiHub.apiKeyDeletedToast', { name: providerName }));
        },
        onError: (err: { message?: string }) => {
          queryClient.invalidateQueries({ queryKey: providerKeys.all });
          setApiKeySaveStatus('error');
          toast.error(t('aiHub.apiKeyDeleteFailed', { message: err?.message || t('common.unknown') }));
        },
      },
    );
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProviderId(providerId);
    setApiKeyInput('');
    reset();
  };

  // 保存内置模型（provider+model 持久化；AI 调用链无显式偏好时的默认目标）
  const handleSaveDefaultModel = () => {
    if (!effective?.provider || !effective.model) return;
    setDefaultModelMutation.mutate(
      { provider: effective.provider, model: effective.model },
      {
        onSuccess: () => {
          clearDraft();
          toast.success(t('aiHub.defaultModelSaved'));
        },
        onError: (err: { message?: string }) =>
          toast.error(t('aiHub.defaultModelSaveFailed', { message: err?.message || t('common.unknown') })),
      },
    );
  };

  // 查询厂家真实模型清单（/models 端点；结果落 AIModelConfig 并回流 availableModels）
  const handleDetectModels = () => {
    if (!selectedProvider) return;
    detectModelsMutation.mutate(selectedProvider.id, {
      onSuccess: (res) => {
        toast.success(t('aiHub.detectModelsSuccess', { count: res.models.length }));
      },
      onError: (err: { message?: string }) =>
        toast.error(t('aiHub.detectModelsFailed', { message: err?.message || t('common.unknown') })),
    });
  };

  // 模型查询链接防抖保存（合并进 metadata；置空即恢复默认端点）
  const handleModelsEndpointChange = useCallback(
    (providerId: string, value: string) => {
      setModelsEndpointInputs((prev) => ({ ...prev, [providerId]: value }));
      if (modelsEndpointTimersRef.current[providerId]) {
        clearTimeout(modelsEndpointTimersRef.current[providerId]);
      }
      modelsEndpointTimersRef.current[providerId] = setTimeout(() => {
        const provider = providers.find((p) => p.id === providerId);
        if (!provider) return;
        const meta = { ...((provider.metadata ?? {}) as Record<string, unknown>) };
        const trimmed = value.trim();
        if (trimmed) meta.modelsEndpoint = trimmed;
        else delete meta.modelsEndpoint;
        updateProviderMutation.mutate({ id: providerId, data: { metadata: meta } });
      }, 1000);
    },
    [providers, updateProviderMutation],
  );

  // 余额查询链接防抖保存（合并进 metadata；置空即恢复默认端点）
  const handleBalanceEndpointChange = useCallback(
    (providerId: string, value: string) => {
      setBalanceEndpointInputs((prev) => ({ ...prev, [providerId]: value }));
      if (balanceEndpointTimersRef.current[providerId]) {
        clearTimeout(balanceEndpointTimersRef.current[providerId]);
      }
      balanceEndpointTimersRef.current[providerId] = setTimeout(() => {
        const provider = providers.find((p) => p.id === providerId);
        if (!provider) return;
        const meta = { ...((provider.metadata ?? {}) as Record<string, unknown>) };
        const trimmed = value.trim();
        if (trimmed) meta.balanceEndpoint = trimmed;
        else delete meta.balanceEndpoint;
        updateProviderMutation.mutate({ id: providerId, data: { metadata: meta } });
      }, 1000);
    },
    [providers, updateProviderMutation],
  );

  // Test connection for a provider card (uses saved apiKey from backend)
  const handleTestConnection = async (provider: AIProviderConfig) => {
    const name = providerDisplayName(provider.provider) ?? provider.provider;
    if (!provider.hasApiKey) {
      toast.error(t('aiHub.noApiKeyConfigured', { name }));
      return;
    }
    setTestingProviderId(provider.id);
    try {
      const result = await testProviderMutation.mutateAsync(provider.id);
      if (result.valid) {
        toast.success(t('aiHub.connectedToast', { name }));
      } else {
        const msg = (result as unknown as { error?: string }).error || t('aiHub.connectionFailed');
        toast.error(t('aiHub.connectionFailedToast', { name, message: msg }));
      }
    } catch (error) {
      // 超时/断网用 i18n 文案（禁英文 axios 默认文案）；后端结构化错误透传完整 message
      const message = resolveTestConnectionErrorMessage(error, t);
      toast.error(t('aiHub.connectionFailedToast', { name, message }));
    } finally {
      // 超时/失败也复位 loading，按钮恢复可点，允许立即重试
      setTestingProviderId(null);
    }
  };

  // Internal perform save (shared by manual + debounced)
  const performBaseUrlSave = useCallback(
    (providerId: string) => {
      const value = baseUrlInputs[providerId] || '';
      const provider = providers.find((p) => p.id === providerId);
      if (!provider) return;

      if (!value.trim()) {
        setBaseUrlSaveStatus((prev) => ({ ...prev, [providerId]: 'error' }));
        toast.error(t('aiHub.baseUrlEmpty'));
        return;
      }

      const currentSaved = provider.baseUrl || PROVIDER_DEFAULT_BASE_URL[provider.provider] || '';
      if (value.trim() === currentSaved) {
        setBaseUrlSaveStatus((prev) => ({ ...prev, [providerId]: 'idle' }));
        return;
      }

      const providerName = providerDisplayName(provider.provider) ?? provider.provider;
      setBaseUrlSaveStatus((prev) => ({ ...prev, [providerId]: 'saving' }));
      updateProviderMutation.mutate(
        { id: providerId, data: { baseUrl: value.trim() } },
        {
          onSuccess: () => {
            setBaseUrlSaveStatus((prev) => ({ ...prev, [providerId]: 'saved' }));
            toast.success(t('aiHub.baseUrlUpdatedToast', { name: providerName }));
            setTimeout(() => {
              setBaseUrlSaveStatus((prev) => {
                const next = { ...prev };
                if (next[providerId] === 'saved') next[providerId] = 'idle';
                return next;
              });
            }, 2000);
          },
          onError: (err: { message?: string }) => {
            setBaseUrlSaveStatus((prev) => ({ ...prev, [providerId]: 'error' }));
            toast.error(t('aiHub.baseUrlUpdateFailed', { name: providerName, message: err?.message || t('common.unknown') }));
          },
        },
      );
    },
    [baseUrlInputs, providers, updateProviderMutation, t],
  );

  // Auto-save baseUrl with debounce
  const handleBaseUrlChange = useCallback(
    (providerId: string, value: string) => {
      setBaseUrlInputs((prev) => ({ ...prev, [providerId]: value }));
      setBaseUrlSaveStatus((prev) => ({ ...prev, [providerId]: 'idle' }));

      if (baseUrlTimersRef.current[providerId]) {
        clearTimeout(baseUrlTimersRef.current[providerId]);
      }
      baseUrlTimersRef.current[providerId] = setTimeout(() => {
        performBaseUrlSave(providerId);
      }, 1000);
    },
    [performBaseUrlSave],
  );

  // Manual save baseUrl (immediate)
  const handleSaveBaseUrl = useCallback(
    (providerId: string) => {
      if (baseUrlTimersRef.current[providerId]) {
        clearTimeout(baseUrlTimersRef.current[providerId]);
      }
      performBaseUrlSave(providerId);
    },
    [performBaseUrlSave],
  );

  // Reset baseUrl to default
  const handleResetBaseUrl = useCallback(
    (providerId: string, providerKey: string) => {
      const defaultUrl = PROVIDER_DEFAULT_BASE_URL[providerKey] || '';
      const providerName = providerDisplayName(providerKey) ?? providerKey;
      setBaseUrlInputs((prev) => ({ ...prev, [providerId]: defaultUrl }));
      setBaseUrlSaveStatus((prev) => ({ ...prev, [providerId]: 'saving' }));
      updateProviderMutation.mutate(
        { id: providerId, data: { baseUrl: defaultUrl } },
        {
          onSuccess: () => {
            setBaseUrlSaveStatus((prev) => ({ ...prev, [providerId]: 'saved' }));
            toast.success(t('aiHub.baseUrlResetToast', { name: providerName }));
            setTimeout(() => {
              setBaseUrlSaveStatus((prev) => {
                const next = { ...prev };
                if (next[providerId] === 'saved') next[providerId] = 'idle';
                return next;
              });
            }, 2000);
          },
          onError: (err: { message?: string }) => {
            setBaseUrlSaveStatus((prev) => ({ ...prev, [providerId]: 'error' }));
            toast.error(t('aiHub.baseUrlResetFailed', { name: providerName, message: err?.message || t('common.unknown') }));
          },
        },
      );
    },
    [updateProviderMutation, t],
  );

  const modelGatePlaceholder = (canSelect: boolean) =>
    canSelect ? t('aiHub.selectModel') : t('aiHub.configureKeyFirst');

  const nameOf = (provider: AIProviderConfig) =>
    provider.displayName || providerDisplayName(provider.provider) || provider.provider;

  /** 按 provider key 查展示名（内置模型卡展示已选/已存厂家） */
  const nameOfKey = (key?: string | null) => {
    if (!key) return undefined;
    const p = providers.find((x) => x.provider === key);
    return p ? nameOf(p) : providerDisplayName(key) ?? key;
  };

  return (
    <div className="space-y-6">
      {/* Default Model Card（工作区内置模型：持久化，AI 调用链默认目标） */}
      <Card className="border-border shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu size={16} className="text-accent-purple" />
            {t('aiHub.defaultModel')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Icon + current value */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
                {effective?.provider ? (
                  <ProviderBrandIcon provider={effective.provider} size={36} />
                ) : (
                  <Brain className="size-9" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {nameOfKey(effective?.provider) ?? t('aiHub.defaultModelNotSet')}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {effective?.model || t('aiHub.selectModelHint')}
                </p>
              </div>
            </div>

            {/* Right: Provider + Model Selector + Save/Badge */}
            <div className="flex shrink-0 items-center gap-2">
              <Select
                value={effective?.provider ?? ''}
                onValueChange={(v) => setDraft({ provider: v, model: modelOptionsFor(v)[0] ?? '' })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('aiHub.selectProvider')}>
                    {nameOfKey(effective?.provider) ?? t('aiHub.selectProvider')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {providerOptions.map((provider) => (
                    <SelectItem key={provider.id} value={provider.provider}>
                      <div className="flex items-center gap-2">
                        <ProviderStatusDot status={provider.status} hasApiKey={provider.hasApiKey} />
                        {nameOf(provider)}
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
                disabled={!effective?.provider || (effective?.provider ? modelOptionsFor(effective.provider).length === 0 : true)}
              >
                <SelectTrigger className="w-50">
                  <SelectValue placeholder={t('aiHub.selectModel')}>
                    {effective?.model || t('aiHub.selectModel')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(effective?.provider ? modelOptionsFor(effective.provider) : []).map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isDirty && effective?.model ? (
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={handleSaveDefaultModel}
                  disabled={setDefaultModelMutation.isPending}
                >
                  {setDefaultModelMutation.isPending ? (
                    <Spinner className="size-3 text-inherit" />
                  ) : (
                    <Save className="size-3" />
                  )}
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
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t('aiHub.defaultModelHint')}</p>
        </CardContent>
      </Card>

      {/* Pricing Source（参考价源 models.dev：加载状态 + 强刷，CAP-A-21） */}
      <PricingSourceCard />

      {/* Provider Cards Grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t('aiHub.providers')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {isLoadingProviders ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col items-center gap-2">
                    <Skeleton className="size-12 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))
          ) : providers.length === 0 ? (
            // 空态：无任何厂家配置时按内置清单展示未连接占位
            Object.entries(PROVIDER_INFO).map(([key, info]) => (
              <Card key={key} className="opacity-60">
                <CardHeader className="pb-2">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex size-12 items-center justify-center">
                      <ProviderBrandIcon provider={key} size={40} />
                    </div>
                    <div className="min-w-0 text-center">
                      <CardTitle className="text-sm">{info.name}</CardTitle>
                      <div className="mt-1">
                        <ProviderStatusBadge status="disconnected" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          ) : (
            providers.map((provider) => {
              const isTesting = testingProviderId === provider.id;
              return (
                <Card
                  key={provider.id}
                  className={cn(
                    'relative cursor-pointer transition-colors',
                    selectedProviderId === provider.id && 'ring-2 ring-primary',
                  )}
                  onClick={() => handleProviderSelect(provider.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex size-12 items-center justify-center">
                        <ProviderBrandIcon provider={provider.provider} size={40} />
                      </div>
                      <div className="min-w-0 text-center">
                        <CardTitle className="text-sm">{nameOf(provider)}</CardTitle>
                        {multiSlotProviderKeys.has(provider.provider) && (
                          <p
                            className="mt-0.5 w-full truncate text-center text-10 text-muted-foreground"
                            title={
                              provider.baseUrl ||
                              PROVIDER_DEFAULT_BASE_URL[provider.provider] ||
                              provider.provider
                            }
                          >
                            {hostFromUrl(provider.baseUrl) ??
                              hostFromUrl(PROVIDER_DEFAULT_BASE_URL[provider.provider]) ??
                              provider.provider}
                          </p>
                        )}
                        <div className="mt-1">
                          <ProviderStatusBadge status={normalizeProviderStatus(provider.status)} />
                        </div>
                      </div>
                    </div>
                    <div className="absolute right-2 top-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestConnection(provider);
                        }}
                        disabled={isTesting || !provider.hasApiKey}
                        title={t('aiHub.testConnection')}
                      >
                        {isTesting ? <Spinner className="size-3 text-inherit" /> : <Sparkles className="size-3" />}
                      </Button>
                    </div>
                    {selectedProviderId === provider.id && (
                      <div className="absolute right-2 top-10">
                        <Check className="size-4 text-primary" />
                      </div>
                    )}
                  </CardHeader>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Provider Details */}
      {selectedProvider && (
        <Card className="border-border shadow-none">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center">
                <ProviderBrandIcon provider={selectedProvider.provider} size={40} />
              </div>
              <CardTitle className="text-base">{nameOf(selectedProvider)}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Balance（充值型单进度 / 套餐型 5h·周·月多进度，自适应厂家返回） */}
            <ProviderBalanceCard
              provider={selectedProvider}
              endpointValue={balanceEndpointInputs[selectedProvider.id] ?? ''}
              onEndpointChange={(value) => handleBalanceEndpointChange(selectedProvider.id, value)}
            />

            {/* Model Selection + real query - Only available after API key is configured */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Brain className="size-3.5 text-muted-foreground" />
                  {t('aiHub.availableModels')}
                  {!selectedProvider.hasApiKey && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({t('aiHub.configureKeyFirst')})
                    </span>
                  )}
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={handleDetectModels}
                  disabled={detectModelsMutation.isPending || !selectedProvider.hasApiKey}
                  title={t('aiHub.detectModelsHint')}
                >
                  {detectModelsMutation.isPending ? (
                    <Spinner className="size-3 text-inherit" />
                  ) : (
                    <Search className="size-3" />
                  )}
                  {t('aiHub.detectModels')}
                </Button>
              </div>
              <Select
                value={
                  effective?.provider === selectedProvider.provider ? effective.model || '' : ''
                }
                onValueChange={(m) => setDraft({ provider: selectedProvider.provider, model: m })}
                disabled={!selectedProvider.hasApiKey}
              >
                <SelectTrigger>
                  <SelectValue placeholder={modelGatePlaceholder(Boolean(selectedProvider.hasApiKey))}>
                    {effective?.provider === selectedProvider.provider
                      ? effective.model || modelGatePlaceholder(Boolean(selectedProvider.hasApiKey))
                      : modelGatePlaceholder(Boolean(selectedProvider.hasApiKey))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {displayModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* 模型查询链接：留空用默认端点（Base URL + /models），如 https://api.deepseek.com/models */}
              <div className="relative mt-2">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={modelsEndpointInputs[selectedProvider.id] ?? ''}
                  onChange={(e) => handleModelsEndpointChange(selectedProvider.id, e.target.value)}
                  placeholder={
                    deriveDefaultModelsEndpoint(
                      selectedProvider.provider,
                      baseUrlInputs[selectedProvider.id] ?? selectedProvider.baseUrl,
                    ) || 'https://api.example.com/models'
                  }
                  className="pl-9"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t('aiHub.modelsEndpointHint')}</p>
            </div>

            {/* Base URL - editable with auto-save */}
            {(() => {
              const providerKey = selectedProvider.provider;
              const baseUrlValue =
                baseUrlInputs[selectedProvider.id] ??
                (selectedProvider.baseUrl || PROVIDER_DEFAULT_BASE_URL[providerKey] || '');
              const saveStatus = baseUrlSaveStatus[selectedProvider.id] || 'idle';
              const isUsingDefault = !selectedProvider.baseUrl && !!PROVIDER_DEFAULT_BASE_URL[providerKey];
              const defaultUrl = PROVIDER_DEFAULT_BASE_URL[providerKey];
              return (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Link2 className="size-3.5 text-muted-foreground" />
                      {t('aiHub.baseUrl')}
                      {isUsingDefault && (
                        <Badge variant="outline" className="h-4 px-1.5 text-xs font-normal">
                          {t('aiHub.default')}
                        </Badge>
                      )}
                    </label>
                  </div>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={baseUrlValue}
                      onChange={(e) => handleBaseUrlChange(selectedProvider.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveBaseUrl(selectedProvider.id);
                        }
                      }}
                      placeholder={defaultUrl || 'https://api.example.com/v1'}
                      className="pr-28 pl-9"
                    />
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                      {saveStatus === 'saving' && (
                        <Badge variant="secondary" className="h-6 gap-1 text-xs">
                          <Spinner className="size-3 text-inherit" />
                          {t('aiHub.saving')}
                        </Badge>
                      )}
                      {saveStatus === 'saved' && (
                        <Badge className="h-6 gap-1 bg-accent-green/10 text-xs text-accent-green">
                          <CircleCheck className="size-3" />
                          {t('aiHub.saved')}
                        </Badge>
                      )}
                      {saveStatus === 'error' && (
                        <Badge variant="destructive" className="h-6 gap-1 text-xs">
                          <CircleX className="size-3" />
                          {t('aiHub.error')}
                        </Badge>
                      )}
                      {saveStatus === 'idle' && baseUrlValue !== defaultUrl && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-1.5 text-xs"
                            onClick={() => handleResetBaseUrl(selectedProvider.id, providerKey)}
                          >
                            <RotateCcw className="size-3" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-6 gap-1 px-2 text-xs"
                            onClick={() => handleSaveBaseUrl(selectedProvider.id)}
                          >
                            <Save className="size-3" />
                            {t('common.save')}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t('aiHub.pressEnterSave')}</p>
                  {isUsingDefault && (
                    <p className="mt-0.5 text-xs text-muted-foreground/70">
                      {t('aiHub.emptyFallsBack')} <span className="font-mono">{PROVIDER_DEFAULT_BASE_URL[providerKey]}</span>
                    </p>
                  )}
                </div>
              );
            })()}

            {/* API Configuration */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Key className="size-3.5 text-muted-foreground" />
                {t('aiHub.apiKey')}
                {selectedProvider.hasApiKey && (
                  <Badge variant="outline" className="h-4 border-accent-green/30 px-1.5 text-xs font-normal text-accent-green">
                    {t('aiHub.saved')}
                  </Badge>
                )}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-1/2 z-10 -translate-y-1/2 size-4 text-muted-foreground" />
                  <PasswordInput
                    placeholder={selectedProvider.hasApiKey ? t('aiHub.apiKeySavedPlaceholder') : t('aiHub.apiKeyNewPlaceholder')}
                    className="pr-28 pl-9"
                    value={apiKeyInput}
                    onChange={(e) => !selectedProvider.hasApiKey && setApiKeyInput(e.target.value)}
                    disabled={!!selectedProvider.hasApiKey}
                  />
                  <div className="pointer-events-none absolute right-9 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    {apiKeySaveStatus === 'saving' && (
                      <Badge variant="secondary" className="h-6 gap-1 text-xs">
                        <Spinner className="size-3 text-inherit" />
                        {t('aiHub.saving')}
                      </Badge>
                    )}
                    {apiKeySaveStatus === 'saved' && (
                      <Badge className="h-6 gap-1 bg-accent-green/10 text-xs text-accent-green">
                        <CircleCheck className="size-3" />
                        {t('aiHub.saved')}
                      </Badge>
                    )}
                    {apiKeySaveStatus === 'deleting' && (
                      <Badge variant="secondary" className="h-6 gap-1 text-xs">
                        <Spinner className="size-3 text-inherit" />
                        {t('aiHub.deleting')}
                      </Badge>
                    )}
                    {apiKeySaveStatus === 'error' && (
                      <Badge variant="destructive" className="h-6 gap-1 text-xs">
                        <CircleX className="size-3" />
                        {t('aiHub.error')}
                      </Badge>
                    )}
                    {apiKeySaveStatus === 'idle' && (
                      <>
                        {status === 'validating' && (
                          <Badge variant="secondary" className="h-6 gap-1 text-xs">
                            <Spinner className="size-3 text-inherit" />
                            {t('aiHub.checking')}
                          </Badge>
                        )}
                        {(status === 'valid' || (selectedProvider.hasApiKey && status !== 'invalid')) && (
                          <Badge className="h-6 gap-1 bg-accent-green/10 text-xs text-accent-green">
                            <CircleCheck className="size-3" />
                            {t('aiHub.valid')}
                          </Badge>
                        )}
                        {status === 'invalid' && (
                          <Badge variant="destructive" className="h-6 gap-1 text-xs">
                            <CircleX className="size-3" />
                            {t('aiHub.invalid')}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {apiKeyInput.trim() ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleValidateApiKey}
                    disabled={status === 'validating' || apiKeySaveStatus === 'saving'}
                    className="gap-1"
                  >
                    {status === 'validating' || apiKeySaveStatus === 'saving' ? (
                      <Spinner className="size-3 text-inherit" />
                    ) : (
                      <Save className="size-3" />
                    )}
                    {t('common.save')}
                  </Button>
                ) : selectedProvider.hasApiKey ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteApiKey}
                    disabled={apiKeySaveStatus === 'deleting'}
                    className="gap-1"
                    title={t('aiHub.deleteSavedKey')}
                  >
                    {apiKeySaveStatus === 'deleting' ? <Spinner className="size-3 text-inherit" /> : <Trash2 className="size-3" />}
                    {t('common.delete')}
                  </Button>
                ) : null}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {selectedProvider.hasApiKey ? t('aiHub.apiKeySavedHint') : t('aiHub.apiKeyNewHint')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
