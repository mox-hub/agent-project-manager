/**
 * AiManagementSection - 设置页「AI 管理」子页
 * @description 由 ai-hub 的 AIManagementPage 迁移而来（原路由 /app/ai，2026-08-19 迁入设置页）
 * 主要实现关于ai接入功能以及ai模型、权限、角色管理
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Bot, Settings, Key, Zap, Check, Server, Puzzle, UserCircle, Brain, ChevronDown, CircleCheck, CircleX, Sparkles, Link2, Save, RotateCcw, Trash2, Clock, CalendarRange, ShieldCheck, Cpu } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { OpenAI, Claude, Gemini, DeepSeek, Zhipu } from '@lobehub/icons';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageShell, PageBody } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Input, PasswordInput } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useAiProviders, useUpdateProvider, useTestProvider } from '@/modules/ai-hub/hooks/use-ai-providers';
import { useQueryClient } from '@tanstack/react-query';
import { providerKeys } from '@/modules/ai-hub/hooks/use-ai-providers';
import { useProviderValidation } from '@/modules/ai-hub/hooks/use-validate-provider';
import {
  useCliProviders,
  useDetectCliProviders,
  PROVIDER_DISPLAY_NAMES,
  type CliProviderId,
} from '@/modules/mcp-server';
import type { AIProviderConfig } from '@/modules/ai-hub/api/ai-hub-api';

// Provider icon map with Color variants
type LobeIcon = React.ComponentType<{ size?: number; className?: string }>;
const PROVIDER_ICONS: Record<string, { Icon: LobeIcon; Color?: LobeIcon }> = {
  openai: { Icon: OpenAI },
  anthropic: { Icon: Claude, Color: Claude.Color },
  gemini: { Icon: Gemini, Color: Gemini.Color },
  deepseek: { Icon: DeepSeek, Color: DeepSeek.Color },
  glm: { Icon: Zhipu, Color: Zhipu.Color },
};

// Provider display names and descriptions (品牌/产品名词保留原文)
const PROVIDER_INFO: Record<string, { name: string; description: string }> = {
  openai: { name: 'OpenAI', description: 'Advanced language models for diverse tasks' },
  anthropic: { name: 'Anthropic', description: 'Constitutional AI assistant' },
  gemini: { name: 'Google Gemini', description: 'Multimodal AI from Google' },
  deepseek: { name: 'Deepseek', description: 'Chinese AI company specializing in LLM' },
  glm: { name: 'GLM (Zhipu)', description: 'Chinese open-source AI model' },
};

// Default Base URL for each provider (used when not configured)
const PROVIDER_DEFAULT_BASE_URL: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com',
  deepseek: 'https://api.deepseek.com/v1',
  glm: 'https://open.bigmodel.cn/api/paas/v4',
};

// Static model list for each provider
const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash-exp'],
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  glm: ['glm-4', 'glm-4-flash', 'glm-4-plus', 'glm-3-turbo'],
};

interface Skill {
  id: string;
  nameKey: string;
  descKey: string;
  enabled: boolean;
  category: string;
}

// Skill id -> i18n key（名称/描述均提 i18n；category 用于分组）
const SKILLS: Skill[] = [
  { id: 'code-review', nameKey: 'aiHub.skillNameCodeReview', descKey: 'aiHub.codeReview', enabled: true, category: 'Development' },
  { id: 'bug-analysis', nameKey: 'aiHub.skillNameBugAnalysis', descKey: 'aiHub.debugging', enabled: true, category: 'Development' },
  { id: 'test-gen', nameKey: 'aiHub.skillNameTestGeneration', descKey: 'aiHub.testing', enabled: true, category: 'Development' },
  { id: 'doc-gen', nameKey: 'aiHub.skillNameDocumentation', descKey: 'aiHub.documentation', enabled: false, category: 'Development' },
  { id: 'refactor', nameKey: 'aiHub.skillNameRefactoring', descKey: 'aiHub.improvements', enabled: false, category: 'Development' },
  { id: 'pm-assist', nameKey: 'aiHub.skillNamePmAssistant', descKey: 'aiHub.projectManagement', enabled: true, category: 'Management' },
  { id: 'planning', nameKey: 'aiHub.skillNameSprintPlanning', descKey: 'aiHub.sprintPlanning', enabled: false, category: 'Management' },
];

const SKILL_CATEGORY_KEY: Record<string, string> = {
  Development: 'aiHub.development',
  Management: 'aiHub.management',
};

interface AiRole {
  id: string;
  nameKey: string;
  descKey: string;
  perms: string[];
}

const AI_ROLES: AiRole[] = [
  { id: 'senior', nameKey: 'aiHub.roleNameSenior', descKey: 'aiHub.fullAccess', perms: ['code:read', 'code:write', 'code:review', 'deploy'] },
  { id: 'junior', nameKey: 'aiHub.roleNameJunior', descKey: 'aiHub.limitedAccess', perms: ['code:read', 'code:write'] },
  { id: 'pm', nameKey: 'aiHub.roleNamePm', descKey: 'aiHub.projectTaskManagement', perms: ['task:read', 'task:write', 'project:read'] },
  { id: 'qa', nameKey: 'aiHub.roleNameQa', descKey: 'aiHub.bugTracking', perms: ['task:read', 'bug:write', 'test:run'] },
];

// CLI Provider emoji (terminal-style)
const CLI_PROVIDER_EMOJI: Record<CliProviderId, string> = {
  'claude-code': '🧠',
  codex: '⚡',
  zcode: '🌀',
};

export function AiManagementSection() {
  const { t } = useTranslation();
  // ─── Data Hooks ──────────────────────────────────────────────
  const { data: providers = [], isLoading: isLoadingProviders } = useAiProviders();
  const updateProviderMutation = useUpdateProvider();
  const testProviderMutation = useTestProvider();
  const queryClient = useQueryClient();

  // Callback when API key validation succeeds
  const handleValidationSuccess = () => {
    if (!selectedProvider || !apiKeyInput) return;
    const providerName = PROVIDER_INFO[selectedProvider.provider]?.name || selectedProvider.provider;
    setApiKeySaveStatus('saving');
    updateProviderMutation.mutate(
      { id: selectedProvider.id, data: { apiKey: apiKeyInput } },
      {
        onSuccess: () => {
          setApiKeySaveStatus('saved');
          toast.success(t('aiHub.apiKeySavedToast', { name: providerName }));
          // Auto-select first model from static config
          const models = PROVIDER_MODELS[selectedProvider.provider] || [];
          if (models.length > 0) {
            setSelectedModel(models[0]);
          }
          setTimeout(() => {
            setApiKeySaveStatus(prev => prev === 'saved' ? 'idle' : prev);
          }, 2000);
        },
        onError: (err: { message?: string }) => {
          setApiKeySaveStatus('error');
          toast.error(t('aiHub.apiKeySaveFailed', { message: err?.message || t('common.unknown') }));
        },
      }
    );
  };

  const { status, validate, reset } = useProviderValidation(undefined, handleValidationSuccess);

  // ─── Local State ──────────────────────────────────────────────
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [trustLevel] = useState(75);
  const [skills, setSkills] = useState<Record<string, boolean>>(
    SKILLS.reduce((acc, skill) => ({ ...acc, [skill.id]: skill.enabled }), {})
  );
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [baseUrlInputs, setBaseUrlInputs] = useState<Record<string, string>>({});
  const [baseUrlSaveStatus, setBaseUrlSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const baseUrlTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [apiKeySaveStatus, setApiKeySaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'deleting'>('idle');
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);

  // ─── Computed Values ───────────────────────────────────────────
  // Find the selected provider from the API response
  const selectedProvider = useMemo(() => {
    return providers.find(p => p.id === selectedProviderId) || null;
  }, [providers, selectedProviderId]);

  // Get models for the selected provider from static config
  const providerModels = useMemo(() => {
    if (!selectedProvider) return [];
    return PROVIDER_MODELS[selectedProvider.provider] || [];
  }, [selectedProvider]);

  // Use provider models from static config
  const displayModels = providerModels;

  // Get connected providers count
  const connectedCount = providers.filter(p => p.status === 'connected').length;

  // ─── Effects ──────────────────────────────────────────────────
  // Auto-open providers accordion on mount
  useEffect(() => {
    if (activeAccordion === null && providers.length > 0) {
      setActiveAccordion('providers');
    }
  }, [providers.length, activeAccordion]);

  // Set initial selected provider
  useEffect(() => {
    if (!selectedProviderId && providers.length > 0) {
      // Prefer first connected provider, otherwise any provider
      const firstConnected = providers.find(p => p.status === 'connected');
      const firstWithKey = providers.find(p => p.hasApiKey);
      const target = firstConnected || firstWithKey || providers[0];
      if (target) {
        setSelectedProviderId(target.id);
        setSelectedModel(target.provider === 'openai' ? 'gpt-4o' : '');
      }
    }
  }, [providers, selectedProviderId]);

  // Update model selection when provider changes
  useEffect(() => {
    if (selectedProvider && !isLoadingProviders && displayModels.length > 0) {
      setSelectedModel(displayModels[0]);
    }
  }, [selectedProvider, isLoadingProviders, displayModels]);

  // Sync baseUrl inputs from providers data when providers change
  useEffect(() => {
    setBaseUrlInputs(prev => {
      const next = { ...prev };
      for (const provider of providers) {
        // Only sync if the user hasn't started editing this provider's baseUrl field
        if (!(provider.id in prev)) {
          next[provider.id] = provider.baseUrl || PROVIDER_DEFAULT_BASE_URL[provider.provider] || '';
        }
      }
      return next;
    });
  }, [providers]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = baseUrlTimersRef.current;
    return () => {
      Object.values(timers).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // ─── Handlers ────────────────────────────────────────────────
  const handleValidateApiKey = () => {
    if (!selectedProvider || !apiKeyInput) return;
    const currentBaseUrl = baseUrlInputs[selectedProvider.id] ?? selectedProvider.baseUrl;
    validate(selectedProvider.provider, apiKeyInput, currentBaseUrl || undefined);
  };

  const handleDeleteApiKey = () => {
    if (!selectedProvider) return;
    const providerName = PROVIDER_INFO[selectedProvider.provider]?.name || selectedProvider.provider;
    setApiKeySaveStatus('deleting');

    // Optimistically update local cache to reset provider state immediately
    queryClient.setQueryData<typeof providers>(providerKeys.all, (old) => {
      if (!old) return old;
      return old.map((p) =>
        p.id === selectedProvider.id
          ? { ...p, hasApiKey: false, status: 'disconnected', errorMessage: null, lastValidatedAt: null }
          : p
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
          // Revert optimistic update on error
          queryClient.invalidateQueries({ queryKey: providerKeys.all });
          setApiKeySaveStatus('error');
          toast.error(t('aiHub.apiKeyDeleteFailed', { message: err?.message || t('common.unknown') }));
        },
      }
    );
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProviderId(providerId);
    setApiKeyInput('');
    reset();
  };

  // Test connection for a provider card (uses saved apiKey from backend)
  const handleTestConnection = async (provider: typeof providers[0]) => {
    const name = PROVIDER_INFO[provider.provider]?.name || provider.provider;
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
      const message = error instanceof Error ? error.message : t('aiHub.testFailed');
      toast.error(t('aiHub.connectionFailedToast', { name, message }));
    } finally {
      setTestingProviderId(null);
    }
  };

  // Internal perform save (shared by manual + debounced)
  const performBaseUrlSave = useCallback((providerId: string) => {
    const value = baseUrlInputs[providerId] || '';
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    if (!value.trim()) {
      setBaseUrlSaveStatus(prev => ({ ...prev, [providerId]: 'error' }));
      toast.error(t('aiHub.baseUrlEmpty'));
      return;
    }

    const currentSaved = provider.baseUrl || PROVIDER_DEFAULT_BASE_URL[provider.provider] || '';
    if (value.trim() === currentSaved) {
      setBaseUrlSaveStatus(prev => ({ ...prev, [providerId]: 'idle' }));
      return;
    }

    const providerName = PROVIDER_INFO[provider.provider]?.name || provider.provider;
    setBaseUrlSaveStatus(prev => ({ ...prev, [providerId]: 'saving' }));
    updateProviderMutation.mutate(
      { id: providerId, data: { baseUrl: value.trim() } },
      {
        onSuccess: () => {
          setBaseUrlSaveStatus(prev => ({ ...prev, [providerId]: 'saved' }));
          toast.success(t('aiHub.baseUrlUpdatedToast', { name: providerName }));
          setTimeout(() => {
            setBaseUrlSaveStatus(prev => {
              const next = { ...prev };
              if (next[providerId] === 'saved') next[providerId] = 'idle';
              return next;
            });
          }, 2000);
        },
        onError: (err: { message?: string }) => {
          setBaseUrlSaveStatus(prev => ({ ...prev, [providerId]: 'error' }));
          toast.error(t('aiHub.baseUrlUpdateFailed', { name: providerName, message: err?.message || t('common.unknown') }));
        },
      }
    );
  }, [baseUrlInputs, providers, updateProviderMutation, t]);

  // Auto-save baseUrl with debounce
  const handleBaseUrlChange = useCallback((providerId: string, value: string) => {
    setBaseUrlInputs(prev => ({ ...prev, [providerId]: value }));
    setBaseUrlSaveStatus(prev => ({ ...prev, [providerId]: 'idle' }));

    // Clear existing timer
    if (baseUrlTimersRef.current[providerId]) {
      clearTimeout(baseUrlTimersRef.current[providerId]);
    }

    // Debounce save (1000ms) — avoid spamming the API while typing
    baseUrlTimersRef.current[providerId] = setTimeout(() => {
      performBaseUrlSave(providerId);
    }, 1000);
  }, [performBaseUrlSave]);

  // Manual save baseUrl (immediate)
  const handleSaveBaseUrl = useCallback((providerId: string) => {
    if (baseUrlTimersRef.current[providerId]) {
      clearTimeout(baseUrlTimersRef.current[providerId]);
    }
    performBaseUrlSave(providerId);
  }, [performBaseUrlSave]);

  // Reset baseUrl to default
  const handleResetBaseUrl = useCallback((providerId: string, providerKey: string) => {
    const defaultUrl = PROVIDER_DEFAULT_BASE_URL[providerKey] || '';
    const providerName = PROVIDER_INFO[providerKey]?.name || providerKey;
    setBaseUrlInputs(prev => ({ ...prev, [providerId]: defaultUrl }));
    setBaseUrlSaveStatus(prev => ({ ...prev, [providerId]: 'saving' }));
    updateProviderMutation.mutate(
      { id: providerId, data: { baseUrl: defaultUrl } },
      {
        onSuccess: () => {
          setBaseUrlSaveStatus(prev => ({ ...prev, [providerId]: 'saved' }));
          toast.success(t('aiHub.baseUrlResetToast', { name: providerName }));
          setTimeout(() => {
            setBaseUrlSaveStatus(prev => {
              const next = { ...prev };
              if (next[providerId] === 'saved') next[providerId] = 'idle';
              return next;
            });
          }, 2000);
        },
        onError: (err: { message?: string }) => {
          setBaseUrlSaveStatus(prev => ({ ...prev, [providerId]: 'error' }));
          toast.error(t('aiHub.baseUrlResetFailed', { name: providerName, message: err?.message || t('common.unknown') }));
        },
      }
    );
  }, [updateProviderMutation, t]);

  const toggleSkill = (id: string) => {
    setSkills((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAccordionChange = (value: string) => {
    setActiveAccordion(activeAccordion === value ? null : value);
  };

  // Get provider icon for selected model
  const getModelIcon = () => {
    if (!selectedProvider) return <Bot className="w-9 h-9" />;
    const iconConfig = PROVIDER_ICONS[selectedProvider.provider];
    if (iconConfig) {
      const Icon = iconConfig.Color || iconConfig.Icon;
      return <Icon size={36} />;
    }
    return <Bot className="w-9 h-9" />;
  };

  // Mock quota data per provider
  const providerQuotas: Record<string, { hourlyLimit: number; hourlyUsed: number; weeklyLimit: number; weeklyUsed: number; balance?: number }> = {
    openai: { hourlyLimit: 10000, hourlyUsed: 4500, weeklyLimit: 100000, weeklyUsed: 45000 },
    anthropic: { hourlyLimit: 8000, hourlyUsed: 2560, weeklyLimit: 80000, weeklyUsed: 32000 },
    gemini: { hourlyLimit: 15000, hourlyUsed: 0, weeklyLimit: 150000, weeklyUsed: 0 },
    deepseek: { hourlyLimit: 20000, hourlyUsed: 0, weeklyLimit: 200000, weeklyUsed: 0, balance: 58.50 },
    glm: { hourlyLimit: 10000, hourlyUsed: 0, weeklyLimit: 100000, weeklyUsed: 0, balance: 0 },
  };

  const currentQuota = selectedProvider
    ? providerQuotas[selectedProvider.provider] || providerQuotas.openai
    : providerQuotas.openai;

  const activeSkillsCount = Object.values(skills).filter(Boolean).length;

  // ─── CLI Providers (real data) ────────────────────────────────
  const { data: cliProvidersData, isLoading: isLoadingCliProviders } = useCliProviders({
    enabled: activeAccordion === 'mcp',
  });
  const detectCliProvidersMutation = useDetectCliProviders();
  const cliProviders = cliProvidersData?.providers ?? [];
  const enabledCliProvidersCount = cliProviders.filter(
    (p) => p.enabled && p.available,
  ).length;
  const handleDetectCliProviders = () => {
    detectCliProvidersMutation.mutate(undefined, {
      onSuccess: () => toast.success(t('aiHub.detectComplete')),
      onError: (err: { message?: string }) =>
        toast.error(
          t('aiHub.detectFailed', { message: err?.message || t('common.unknown') }),
        ),
    });
  };

  const modelGatePlaceholder = (canSelect: boolean) =>
    canSelect ? t('aiHub.selectModel') : t('aiHub.configureKeyFirst');

  const providerNameLabel = (providerKey: string | undefined) =>
    providerKey
      ? PROVIDER_INFO[providerKey]?.name || providerKey
      : t('aiHub.provider');

  return (
    <PageShell aiPage="ai-hub.ai-management" className="overflow-hidden">
      {/* Header */}
      <PageHeader
        aiId="ai-hub.ai-management"
        title={t('aiHub.title')}
        icon={Brain}
        iconColor="text-accent-purple"
        actions={
          <HeaderActionButton
            icon={Settings}
            label={t('aiHub.settings')}
            data-ai-component="ai-hub.ai-management.settings-button"
            data-ai-action="ai-hub.ai-management.settings-button.click"
            data-ai-role="submit"
          />
        }
      />

      {/* Content Area - 金标准：内部滚动 + standard 居中列 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <PageBody variant="standard" className="space-y-6">
          {/* Overview Section - Always visible at top */}
          <div className="space-y-6">
          {/* Active Model Switcher Card */}
          <Card className="border-border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu size={16} className="text-accent-purple" />
                {t('aiHub.activeAiModel')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {/* Left: Icon + Title */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 flex items-center justify-center bg-muted/50 rounded-lg border">
                    {getModelIcon()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {providerNameLabel(selectedProvider?.provider)}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedModel || modelGatePlaceholder(Boolean(selectedProvider?.hasApiKey || apiKeySaveStatus === 'saved'))}</p>
                  </div>
                </div>

                {/* Right: Provider + Model Selector */}
                <div className="flex items-center gap-2">
                  <Select value={selectedProviderId} onValueChange={(v) => { handleProviderSelect(v); const p = providers.find(p => p.id === v); if (p) setSelectedModel(p.provider === 'openai' ? 'gpt-4o' : ''); }}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t('aiHub.selectProvider')}>
                        {selectedProvider
                          ? providerNameLabel(selectedProvider.provider)
                          : t('aiHub.selectProvider')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              provider.status === 'connected' && 'bg-accent-green',
                              provider.status === 'error' && 'bg-destructive',
                              provider.status === 'disconnected' && 'bg-muted-foreground/40'
                            )} />
                            {provider.displayName || PROVIDER_INFO[provider.provider]?.name || provider.provider}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-50">
                      <SelectValue placeholder={modelGatePlaceholder(Boolean(selectedProvider?.hasApiKey || apiKeySaveStatus === 'saved'))}>
                        {selectedModel || modelGatePlaceholder(Boolean(selectedProvider?.hasApiKey || apiKeySaveStatus === 'saved'))}
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
                  <Badge className="bg-accent-green/10 text-accent-green">
                    <Zap className="w-3 h-3 mr-1" />
                    {t('aiHub.active')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage & Trust Levels - Current Provider Only */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Hourly Quota */}
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Clock size={16} className="text-accent-blue" />
                  {providerNameLabel(selectedProvider?.provider)} · {t('aiHub.quotaHourly')}
                </p>
                <Badge variant="outline" className="h-4 px-1.5 text-xs">
                  {Math.round((currentQuota.hourlyUsed / currentQuota.hourlyLimit) * 100)}%
                </Badge>
              </div>
              <Progress value={(currentQuota.hourlyUsed / currentQuota.hourlyLimit) * 100} className="mb-1 h-1.5" />
              <p className="text-xs text-muted-foreground">
                {t('aiHub.quotaHourlyUsed', { used: currentQuota.hourlyUsed.toLocaleString(), limit: currentQuota.hourlyLimit.toLocaleString() })}
              </p>
            </div>

            {/* Weekly Quota */}
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <CalendarRange size={16} className="text-accent-green" />
                  {providerNameLabel(selectedProvider?.provider)} · {t('aiHub.quotaWeekly')}
                </p>
                <Badge variant="outline" className="h-4 px-1.5 text-xs">
                  {Math.round((currentQuota.weeklyUsed / currentQuota.weeklyLimit) * 100)}%
                </Badge>
              </div>
              <Progress value={(currentQuota.weeklyUsed / currentQuota.weeklyLimit) * 100} className="mb-1 h-1.5" />
              <p className="text-xs text-muted-foreground">
                {t('aiHub.quotaWeeklyUsed', { used: currentQuota.weeklyUsed.toLocaleString(), limit: currentQuota.weeklyLimit.toLocaleString() })}
              </p>
              {currentQuota.balance !== undefined && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('aiHub.balance', { amount: currentQuota.balance.toFixed(2) })}
                </p>
              )}
            </div>

            {/* Trust Level Card */}
            <TrustLevelCard level={trustLevel} />
          </div>

          {/* Stats Summary - 使用主题适配颜色 */}
          <div className="grid grid-cols-3 gap-3">
            <NeutralStatCard label={t('aiHub.connectedProviders')} value={`${connectedCount} / ${providers.length}`} />
            <NeutralStatCard label={t('aiHub.activeSkills')} value={`${activeSkillsCount} / ${SKILLS.length}`} />
            <NeutralStatCard label={t('aiHub.activeServers')} value={`${enabledCliProvidersCount} / ${cliProviders.length}`} />
          </div>
        </div>

        {/* Accordion Menu Section */}
        <div className="space-y-4">
          {/* Providers Accordion */}
          <NeutralAccordionCard
            title={t('aiHub.providers')}
            icon={<Bot className="w-4 h-4" />}
            iconClass="text-accent-blue"
            badge={`${connectedCount} ${t('aiHub.connected')}`}
            isOpen={activeAccordion === 'providers'}
            onToggle={() => handleAccordionChange('providers')}
          >
            {/* Provider Cards - 使用 lobehub 彩色图标 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
              {isLoadingProviders ? (
                // Loading state
                Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-2">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-muted" />
                        <div className="h-4 w-20 bg-muted rounded" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="h-3 w-full bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))
              ) : providers.length === 0 ? (
                // Empty state - show all configured providers even without API key
                Object.entries(PROVIDER_INFO).map(([key, info]) => {
                  const iconConfig = PROVIDER_ICONS[key];
                  return (
                    <Card key={key} className="opacity-60">
                      <CardHeader className="pb-2">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 flex items-center justify-center">
                            {iconConfig && (() => {
                              const Icon = iconConfig.Color || iconConfig.Icon;
                              return <Icon size={40} />;
                            })()}
                          </div>
                          <div className="text-center min-w-0">
                            <CardTitle className="text-sm">{info.name}</CardTitle>
                            <div className="mt-1">
                              <StatusBadge status="disconnected" />
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })
              ) : (
                // Normal render
                providers.map((provider) => {
                  const iconConfig = PROVIDER_ICONS[provider.provider];
                  const isTesting = testingProviderId === provider.id;
                  return (
                    <Card
                      key={provider.id}
                      className={cn(
                        'cursor-pointer transition-all relative',
                        selectedProviderId === provider.id && 'ring-2 ring-primary'
                      )}
                      onClick={() => handleProviderSelect(provider.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 flex items-center justify-center">
                            {iconConfig && (() => {
                              const Icon = iconConfig.Color || iconConfig.Icon;
                              return <Icon size={40} />;
                            })()}
                          </div>
                          <div className="text-center min-w-0">
                            <CardTitle className="text-sm">{PROVIDER_INFO[provider.provider]?.name || provider.provider}</CardTitle>
                            <div className="mt-1">
                              <StatusBadge status={normalizeProviderStatus(provider.status)} />
                            </div>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2">
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
                            {isTesting ? (
                              <Spinner className="w-3 h-3 text-inherit" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      {selectedProviderId === provider.id && (
                        <div className="absolute top-2 right-2" style={{ top: '2.5rem' }}>
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>

            {/* Selected Provider Details */}
            {selectedProvider && (
              <Card className="border-border shadow-none">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex items-center justify-center">
                      {(() => {
                        const iconConfig = PROVIDER_ICONS[selectedProvider.provider];
                        if (iconConfig) {
                          const Icon = iconConfig.Color || iconConfig.Icon;
                          return <Icon size={40} />;
                        }
                        return <Bot className="w-6 h-6" />;
                      })()}
                    </div>
                    <div>
                      <CardTitle className="text-base">{PROVIDER_INFO[selectedProvider.provider]?.name || selectedProvider.provider}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Model Selection - Only available after API key is validated */}
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                      <Brain className="w-3.5 h-3.5 text-muted-foreground" />
                      {t('aiHub.availableModels')}
                      {!selectedProvider?.hasApiKey && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          ({t('aiHub.configureKeyFirst')})
                        </span>
                      )}
                    </label>
                    <Select
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                      disabled={!selectedProvider?.hasApiKey}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={modelGatePlaceholder(Boolean(selectedProvider?.hasApiKey))}>
                          {selectedModel || modelGatePlaceholder(Boolean(selectedProvider?.hasApiKey))}
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
                  </div>

                  {/* Base URL - editable with auto-save */}
                  {(() => {
                    const providerKey = selectedProvider.provider;
                    const baseUrlValue = baseUrlInputs[selectedProvider.id] ?? (selectedProvider.baseUrl || PROVIDER_DEFAULT_BASE_URL[providerKey] || '');
                    const saveStatus = baseUrlSaveStatus[selectedProvider.id] || 'idle';
                    const isUsingDefault = !selectedProvider.baseUrl && !!PROVIDER_DEFAULT_BASE_URL[providerKey];
                    const defaultUrl = PROVIDER_DEFAULT_BASE_URL[providerKey];
                    return (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                            {t('aiHub.baseUrl')}
                            {isUsingDefault && (
                              <Badge variant="outline" className="h-4 px-1.5 text-xs font-normal">{t('aiHub.default')}</Badge>
                            )}
                          </label>
                        </div>
                        <div className="relative">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                            className="pl-9 pr-28"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {saveStatus === 'saving' && (
                              <Badge variant="secondary" className="h-6 gap-1 text-xs">
                                <Spinner className="w-3 h-3 text-inherit" />
                                {t('aiHub.saving')}
                              </Badge>
                            )}
                            {saveStatus === 'saved' && (
                              <Badge className="bg-accent-green/10 text-accent-green h-6 gap-1 text-xs">
                                <CircleCheck className="w-3 h-3" />
                                {t('aiHub.saved')}
                              </Badge>
                            )}
                            {saveStatus === 'error' && (
                              <Badge variant="destructive" className="h-6 gap-1 text-xs">
                                <CircleX className="w-3 h-3" />
                                {t('aiHub.error')}
                              </Badge>
                            )}
                            {saveStatus === 'idle' && baseUrlValue !== defaultUrl && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1.5 text-xs gap-1"
                                  onClick={() => handleResetBaseUrl(selectedProvider.id, providerKey)}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-6 px-2 text-xs gap-1"
                                  onClick={() => handleSaveBaseUrl(selectedProvider.id)}
                                >
                                  <Save className="w-3 h-3" />
                                  {t('common.save')}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('aiHub.pressEnterSave')}
                        </p>
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
                      <Key className="w-3.5 h-3.5 text-muted-foreground" />
                      {t('aiHub.apiKey')}
                      {selectedProvider?.hasApiKey && (
                        <Badge variant="outline" className="h-4 px-1.5 text-xs font-normal text-accent-green border-accent-green/30">
                          {t('aiHub.saved')}
                        </Badge>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                        <PasswordInput
                          placeholder={selectedProvider?.hasApiKey ? t('aiHub.apiKeySavedPlaceholder') : t('aiHub.apiKeyNewPlaceholder')}
                          className="pl-9 pr-28"
                          value={apiKeyInput}
                          onChange={(e) => !selectedProvider?.hasApiKey && setApiKeyInput(e.target.value)}
                          disabled={!!selectedProvider?.hasApiKey}
                        />
                        <div className="absolute right-9 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                          {apiKeySaveStatus === 'saving' && (
                            <Badge variant="secondary" className="h-6 gap-1 text-xs">
                              <Spinner className="w-3 h-3 text-inherit" />
                              {t('aiHub.saving')}
                            </Badge>
                          )}
                          {apiKeySaveStatus === 'saved' && (
                            <Badge className="bg-accent-green/10 text-accent-green h-6 gap-1 text-xs">
                              <CircleCheck className="w-3 h-3" />
                              {t('aiHub.saved')}
                            </Badge>
                          )}
                          {apiKeySaveStatus === 'deleting' && (
                            <Badge variant="secondary" className="h-6 gap-1 text-xs">
                              <Spinner className="w-3 h-3 text-inherit" />
                              {t('aiHub.deleting')}
                            </Badge>
                          )}
                          {apiKeySaveStatus === 'error' && (
                            <Badge variant="destructive" className="h-6 gap-1 text-xs">
                              <CircleX className="w-3 h-3" />
                              {t('aiHub.error')}
                            </Badge>
                          )}
                          {apiKeySaveStatus === 'idle' && (
                            <>
                              {status === 'validating' && (
                                <Badge variant="secondary" className="h-6 gap-1 text-xs">
                                  <Spinner className="w-3 h-3 text-inherit" />
                                  {t('aiHub.checking')}
                                </Badge>
                              )}
                              {(status === 'valid' || (selectedProvider?.hasApiKey && status !== 'invalid')) && (
                                <Badge className="bg-accent-green/10 text-accent-green h-6 gap-1 text-xs">
                                  <CircleCheck className="w-3 h-3" />
                                  {t('aiHub.valid')}
                                </Badge>
                              )}
                              {status === 'invalid' && (
                                <Badge variant="destructive" className="h-6 gap-1 text-xs">
                                  <CircleX className="w-3 h-3" />
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
                            <Spinner className="w-3 h-3 text-inherit" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          {t('common.save')}
                        </Button>
                      ) : selectedProvider?.hasApiKey ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteApiKey}
                          disabled={apiKeySaveStatus === 'deleting'}
                          className="gap-1"
                          title={t('aiHub.deleteSavedKey')}
                        >
                          {apiKeySaveStatus === 'deleting' ? (
                            <Spinner className="w-3 h-3 text-inherit" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          {t('common.delete')}
                        </Button>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {selectedProvider?.hasApiKey
                        ? t('aiHub.apiKeySavedHint')
                        : t('aiHub.apiKeyNewHint')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </NeutralAccordionCard>

          {/* MCP Servers Accordion */}
          <NeutralAccordionCard
            title={`${t('aiHub.mcpServers')} / ${t('aiHub.cliProviders')}`}
            icon={<Server className="w-4 h-4" />}
            iconClass="text-accent-purple"
            badge={`${enabledCliProvidersCount} / ${cliProviders.length}`}
            isOpen={activeAccordion === 'mcp'}
            onToggle={() => handleAccordionChange('mcp')}
          >
            {/* Toolbar */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('aiHub.mcpLocalStatus')}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDetectCliProviders}
                disabled={detectCliProvidersMutation.isPending}
                data-ai-component="ai-hub.ai-management.mcp-detect"
                data-ai-action="ai-hub.ai-management.mcp-detect.click"
                data-ai-role="button"
              >
                {detectCliProvidersMutation.isPending ? (
                  <Spinner className="mr-1 h-3 w-3 text-inherit" />
                ) : (
                  <Sparkles className="mr-1 h-3 w-3" />
                )}
                {t('aiHub.redetect')}
              </Button>
            </div>

            {/* Provider Grid */}
            {isLoadingCliProviders ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-24" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cliProviders.map((provider) => {
                  const isReady = provider.enabled && provider.available;
                  return (
                    <div
                      key={provider.providerId}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      data-ai-component="ai-hub.ai-management.mcp-provider"
                      data-ai-provider={provider.providerId}
                      data-ai-status={isReady ? 'available' : 'unavailable'}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">
                          {CLI_PROVIDER_EMOJI[provider.providerId]}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {PROVIDER_DISPLAY_NAMES[provider.providerId] ??
                              provider.providerId}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {provider.commandPath}
                            {provider.version
                              ? ` · v${provider.version}`
                              : ''}
                          </p>
                          {provider.error && (
                            <p className="text-xs text-destructive truncate">
                              {provider.error}
                            </p>
                          )}
                          {provider.model && (
                            <p className="text-xs text-muted-foreground truncate">
                              {t('aiHub.modelLabel')}: {provider.model}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={isReady ? 'connected' : 'disconnected'} />
                      </div>
                    </div>
                  );
                })}
                {/* MCP Market Card - Dashed Border */}
                <button
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-colors min-h-20"
                  data-ai-component="ai-hub.ai-management.mcp-market"
                  data-ai-action="ai-hub.ai-management.mcp-market.click"
                  data-ai-role="button"
                >
                  <Sparkles className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">
                    MCP Market
                  </span>
                </button>
              </div>
            )}
          </NeutralAccordionCard>

          {/* Skills Accordion */}
          <NeutralAccordionCard
            title={t('aiHub.skillsTitle')}
            icon={<Puzzle className="w-4 h-4" />}
            iconClass="text-accent-yellow"
            badge={`${activeSkillsCount} / ${SKILLS.length}`}
            isOpen={activeAccordion === 'skills'}
            onToggle={() => handleAccordionChange('skills')}
          >
            {/* Skills by Category */}
            <Card className="border-border shadow-none">
              <CardContent className="p-4">
                <div className="space-y-6">
                  {['Development', 'Management'].map((category) => (
                    <div key={category}>
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        {t(SKILL_CATEGORY_KEY[category])}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SKILLS.filter((s) => s.category === category).map((skill) => (
                          <div
                            key={skill.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">{t(skill.nameKey)}</p>
                              <p className="text-xs text-muted-foreground">{t(skill.descKey)}</p>
                            </div>
                            <Button
                              variant={skills[skill.id] ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleSkill(skill.id)}
                            >
                              {skills[skill.id] ? t('aiHub.enabled') : t('aiHub.disabled')}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </NeutralAccordionCard>

          {/* Roles Accordion */}
          <NeutralAccordionCard
            title={t('aiHub.roles')}
            icon={<UserCircle className="w-4 h-4" />}
            iconClass="text-accent-green"
            badge={`${AI_ROLES.length}`}
            isOpen={activeAccordion === 'roles'}
            onToggle={() => handleAccordionChange('roles')}
          >
            {/* Roles */}
            <Card className="border-border shadow-none">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {AI_ROLES.map((role) => (
                    <div
                      key={role.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{t(role.nameKey)}</p>
                          <p className="text-xs text-muted-foreground">{t(role.descKey)}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          {t('aiHub.configure')}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {role.perms.map((perm) => (
                          <span
                            key={perm}
                            className="px-2 py-1 bg-muted rounded text-xs font-mono"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </NeutralAccordionCard>
        </div>
      </PageBody>
      </div>
    </PageShell>
  );
}

// Neutral Accordion Card Component (主题适配)
function NeutralAccordionCard({
  title,
  icon,
  iconClass,
  badge,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  iconClass?: string;
  badge: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden transition-all duration-300 bg-card">
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-4 transition-all duration-300 border-b bg-muted/30 hover:bg-muted/50',
          isOpen && 'border-b-0'
        )}
      >
        <div className="flex items-center gap-3">
          <span className={cn('text-muted-foreground', iconClass)}>{icon}</span>
          <span className="font-semibold text-foreground">{title}</span>
          <Badge variant="secondary" className="text-xs">
            {badge}
          </Badge>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-muted-foreground transition-transform duration-300',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Accordion Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function normalizeProviderStatus(
  status: AIProviderConfig['status'],
): 'connected' | 'disconnected' | 'error' {
  if (status === 'connected' || status === 'active') return 'connected';
  if (status === 'error') return 'error';
  return 'disconnected';
}

function StatusBadge({ status }: { status: 'connected' | 'disconnected' | 'error' }) {
  const { t } = useTranslation();
  const config = {
    connected: { bg: 'bg-accent-green/10', text: 'text-accent-green', label: t('aiHub.connected') },
    disconnected: { bg: 'bg-muted/40', text: 'text-muted-foreground', label: t('aiHub.disconnected') },
    error: { bg: 'bg-destructive/10', text: 'text-destructive', label: t('aiHub.error') },
  };
  const { bg, text, label } = config[status];

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', bg, text)}>
      {label}
    </span>
  );
}

// 主题适配的 StatCard
function TrustLevelCard({ level }: { level: number }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <ShieldCheck size={16} className="text-accent-green" />
          {t('aiHub.trustLevel')}
        </p>
        <span className="text-sm font-semibold">{level}%</span>
      </div>
      <Progress value={level} className="mb-1 h-1.5" />
      <p className="text-xs text-muted-foreground">{t('aiHub.aiAutonomyLevel')}</p>
    </div>
  );
}
function NeutralStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-foreground">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
