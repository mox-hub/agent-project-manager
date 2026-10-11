/**
 * 引导「配置 AI」步骤（2026-10-04 实机验收反馈迭代）。
 *
 * 历史版本是纯静态提示（2026-09-12 诚实化改造）。现接真实快捷配置：
 * 选厂家 → 填 API Key → 测试连接（POST /ai/providers/validate，返回可用模型）
 * → 保存 Key（PUT provider）→ 自动把「测试到的第一个模型」设为主 AI（内置模型
 * PUT /ai/default-model）。诚实边界：测试不过不落库不假成功；全部可跳过，
 * 深度配置（多槽位/模型清单/余额）仍在「设置 → AI 管理」。
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  aiHubApi,
  type AIProviderConfig,
} from '@/modules/ai-hub/api/ai-hub-api';
import {
  useAiProviders,
  useSetDefaultModel,
  useUpdateProvider,
} from '@/modules/ai-hub/hooks/use-ai-providers';

/** 引导快捷入口的四家（与设置 → AI 管理同一批 provider 记录；baseUrl 为各家默认接入点）。
 *  名称保持 ASCII（PROVIDER_INFO 同款惯例）——组件渲染区零中文字符是结构性回归红线 */
const QUICK_PROVIDERS: { key: string; name: string; baseUrl: string }[] = [
  { key: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { key: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com' },
  { key: 'glm', name: 'GLM (Zhipu)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { key: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
];

type TestResult = { ok: boolean; models: string[]; error?: string };

export function ConfigureAiStep() {
  const { t } = useTranslation();
  const providersQuery = useAiProviders();
  const updateProvider = useUpdateProvider();
  const setDefaultModel = useSetDefaultModel();

  const records = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);
  const quickRecords = useMemo(
    () =>
      QUICK_PROVIDERS.map((preset) => ({
        preset,
        record: records.find((r) => r.provider === preset.key),
      })).filter((entry): entry is { preset: (typeof QUICK_PROVIDERS)[number]; record: AIProviderConfig } =>
        Boolean(entry.record),
      ),
    [records],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [savedProviderId, setSavedProviderId] = useState<string | null>(null);

  const selected = records.find((r) => r.id === selectedId) ?? null;

  const selectProvider = (record: AIProviderConfig, presetBaseUrl: string) => {
    setSelectedId(record.id);
    setApiKey('');
    setBaseUrl(record.baseUrl || presetBaseUrl);
    setTestResult(null);
  };

  const handleTestAndSave = async () => {
    if (!selected || !apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const validation = await aiHubApi.validateProvider({
        provider: selected.provider,
        providerId: selected.providerId,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined,
        providerConfigId: selected.id,
      });
      if (!validation.valid) {
        setTestResult({ ok: false, models: [], error: validation.error });
        return;
      }
      setTestResult({ ok: true, models: validation.models ?? [] });
      // 测试通过才落库（诚实化：不假成功）；成功后把第一个可用模型设为主 AI
      await updateProvider.mutateAsync({
        id: selected.id,
        data: {
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim() || undefined,
          enabled: true,
        },
      });
      const firstModel = validation.models?.[0];
      if (firstModel) {
        try {
          await setDefaultModel.mutateAsync({ provider: selected.provider, model: firstModel });
        } catch {
          // Key 已保存、仅默认模型设置失败：不回滚不假报——提示可去设置里补设
          toast.warning(t('onboarding.configureAi.quick.defaultModelFailed'));
        }
      }
      setSavedProviderId(selected.id);
      toast.success(t('onboarding.configureAi.quick.savedToast', { name: selected.displayName }));
    } catch (err) {
      setTestResult({
        ok: false,
        models: [],
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTesting(false);
    }
  };

  const busy = testing;
  const configuredRecords = records.filter((r) => r.hasApiKey);

  return (
    <div className="space-y-5">
      <DialogHeader>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-7 w-7 text-primary" />
        </div>
        <DialogTitle className="text-center text-xl">{t('onboarding.configureAi.heading')}</DialogTitle>
        <DialogDescription className="text-center">
          {t('onboarding.configureAi.description')}
        </DialogDescription>
      </DialogHeader>

      {configuredRecords.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {configuredRecords.map((record) => (
            <span
              key={record.id}
              className="inline-flex items-center gap-1 rounded-full bg-accent-green-light px-2 py-0.5 text-3xs font-medium text-accent-green"
            >
              <CheckCircle2 className="size-3" />
              {record.displayName}
            </span>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('onboarding.configureAi.quick.providerLabel')}</p>
          {providersQuery.isLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              {t('onboarding.configureAi.quick.loading')}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {quickRecords.map(({ preset, record }) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => selectProvider(record, preset.baseUrl)}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors',
                    selectedId === record.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{preset.name}</span>
                    <span className="block truncate text-3xs text-muted-foreground">
                      {record.hasApiKey
                        ? t('onboarding.configureAi.quick.configured')
                        : t('onboarding.configureAi.quick.notConfigured')}
                    </span>
                  </span>
                  {savedProviderId === record.id ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-green" />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="onboarding-api-key">
                {t('onboarding.configureAi.quick.apiKeyLabel')}
              </label>
              <Input
                id="onboarding-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('onboarding.configureAi.quick.apiKeyPlaceholder')}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="onboarding-base-url">
                {t('onboarding.configureAi.quick.baseUrlLabel')}
              </label>
              <Input
                id="onboarding-base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={t('onboarding.configureAi.quick.baseUrlPlaceholder')}
              />
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={!apiKey.trim() || busy}
              onClick={() => void handleTestAndSave()}
            >
              {busy ? (
                <>
                  <Spinner className="mr-1 size-4" />
                  {t('onboarding.configureAi.quick.testing')}
                </>
              ) : (
                t('onboarding.configureAi.quick.testAndSave')
              )}
            </Button>

            {testResult && !testResult.ok ? (
              <p className="flex items-start gap-1.5 rounded-md bg-accent-red-light/50 p-3 text-xs text-accent-red" role="alert">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 break-all">
                  {testResult.error || t('onboarding.configureAi.quick.testFailed')}
                </span>
              </p>
            ) : null}
            {testResult?.ok ? (
              <p className="flex items-center gap-1.5 rounded-md bg-accent-green-light/50 p-3 text-xs text-accent-green">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {testResult.models.length > 0
                  ? t('onboarding.configureAi.quick.modelsFound', { count: testResult.models.length })
                  : t('onboarding.configureAi.quick.testPassed')}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg bg-muted/30 p-4 text-xs text-muted-foreground">
            {t('onboarding.configureAi.quick.hint')}
          </div>
        )}
      </div>
    </div>
  );
}
