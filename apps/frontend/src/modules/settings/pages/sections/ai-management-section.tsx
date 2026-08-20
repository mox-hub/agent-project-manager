/**
 * AiManagementSection - 设置页「AI 管理」子页
 * @description 由 ai-hub 的 AIManagementPage 迁移而来（原路由 /app/ai，2026-08-19 迁入设置页）
 * 主要实现关于ai接入功能以及ai模型、权限、角色管理
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Bot, Settings, Key, Zap, Check, Server, Puzzle, UserCircle, Brain, ChevronDown, Loader2, CircleCheck, CircleX, Sparkles, Link2, Save, RotateCcw, Trash2 } from 'lucide-react';
import { OpenAI, Claude, Gemini, DeepSeek, Zhipu } from '@lobehub/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Input, PasswordInput } from '@/components/ui/input';
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

// Provider display names and descriptions
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
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

const SKILLS: Skill[] = [
  { id: 'code-review', name: 'Code Review', description: 'Analyze code for quality and bugs', enabled: true, category: 'Development' },
  { id: 'bug-analysis', name: 'Bug Analysis', description: 'Debug and analyze error reports', enabled: true, category: 'Development' },
  { id: 'test-gen', name: 'Test Generation', description: 'Generate unit and integration tests', enabled: true, category: 'Development' },
  { id: 'doc-gen', name: 'Documentation', description: 'Generate code documentation', enabled: false, category: 'Development' },
  { id: 'refactor', name: 'Refactoring', description: 'Suggest code improvements', enabled: false, category: 'Development' },
  { id: 'pm-assist', name: 'PM Assistant', description: 'Help with project management', enabled: true, category: 'Management' },
  { id: 'planning', name: 'Sprint Planning', description: 'Assist with sprint planning', enabled: false, category: 'Management' },
];

// CLI Provider emoji (terminal-style)
const CLI_PROVIDER_EMOJI: Record<CliProviderId, string> = {
  'claude-code': '🧠',
  codex: '⚡',
  zcode: '🌀',
};

export function AiManagementSection() {
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
          toast.success(`${providerName} API key saved`);
          // Auto-select first model from static config
          const models = PROVIDER_MODELS[selectedProvider.provider] || [];
          if (models.length > 0) {
            setSelectedModel(models[0]);
          }
          setTimeout(() => {
            setApiKeySaveStatus(prev => prev === 'saved' ? 'idle' : prev);
          }, 2000);
        },
        onError: (err: any) => {
          setApiKeySaveStatus('error');
          toast.error(`Failed to save API key: ${err?.message || 'Unknown error'}`);
        },
      }
    );
  };

  const { status, errorMessage, validate, reset } = useProviderValidation(undefined, handleValidationSuccess);

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
  const apiKeyTimersRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Active providers for dropdown (only those with API key)
  const activeProviders = providers.filter(p => p.hasApiKey && p.enabled);

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
    return () => {
      Object.values(baseUrlTimersRef.current).forEach(timer => clearTimeout(timer));
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
          toast.success(`${providerName} API key deleted`);
        },
        onError: (err: any) => {
          // Revert optimistic update on error
          queryClient.invalidateQueries({ queryKey: providerKeys.all });
          setApiKeySaveStatus('error');
          toast.error(`Failed to delete API key: ${err?.message || 'Unknown error'}`);
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
    if (!provider.hasApiKey) {
      toast.error(`${PROVIDER_INFO[provider.provider]?.name || provider.provider}: No API key configured`);
      return;
    }
    setTestingProviderId(provider.id);
    try {
      const result = await testProviderMutation.mutateAsync(provider.id);
      if (result.valid) {
        toast.success(`${PROVIDER_INFO[provider.provider]?.name || provider.provider}: Connected`);
      } else {
        toast.error(`${PROVIDER_INFO[provider.provider]?.name || provider.provider}: ${(result as any).error || 'Connection failed'}`);
      }
    } catch (error: any) {
      toast.error(`${PROVIDER_INFO[provider.provider]?.name || provider.provider}: ${error?.message || 'Test failed'}`);
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
      toast.error('Base URL cannot be empty');
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
          toast.success(`${providerName} base URL updated`);
          setTimeout(() => {
            setBaseUrlSaveStatus(prev => {
              const next = { ...prev };
              if (next[providerId] === 'saved') next[providerId] = 'idle';
              return next;
            });
          }, 2000);
        },
        onError: (err: any) => {
          setBaseUrlSaveStatus(prev => ({ ...prev, [providerId]: 'error' }));
          toast.error(`Failed to update ${providerName}: ${err?.message || 'Unknown error'}`);
        },
      }
    );
  }, [baseUrlInputs, providers, updateProviderMutation]);

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
          toast.success(`${providerName} base URL reset to default`);
          setTimeout(() => {
            setBaseUrlSaveStatus(prev => {
              const next = { ...prev };
              if (next[providerId] === 'saved') next[providerId] = 'idle';
              return next;
            });
          }, 2000);
        },
        onError: (err: any) => {
          setBaseUrlSaveStatus(prev => ({ ...prev, [providerId]: 'error' }));
          toast.error(`Failed to reset ${providerName}: ${err?.message || 'Unknown error'}`);
        },
      }
    );
  }, [updateProviderMutation]);

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
      onSuccess: () => toast.success('CLI provider detection complete'),
      onError: (err: any) =>
        toast.error(
          `Detection failed: ${err?.message || 'Unknown error'}`,
        ),
    });
  };

  return (
    <PageShell aiPage="ai-hub.ai-management" className="overflow-hidden">
      {/* Header */}
      <PageHeader
        aiId="ai-hub.ai-management"
        title="AI Management"
        icon={Brain}
        iconColor="text-accent-purple"
        actions={
          <HeaderActionButton
            icon={Settings}
            label="Settings"
            data-ai-component="ai-hub.ai-management.settings-button"
            data-ai-action="ai-hub.ai-management.settings-button.click"
            data-ai-role="submit"
          />
        }
      />

      {/* Content Area - 添加 h-0 和 min-h-0 修复滚动问题 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Overview Section - Always visible at top */}
        <div className="space-y-4">
          {/* Active Model Switcher Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {/* Left: Icon + Title */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 flex items-center justify-center bg-muted/50 rounded-lg border">
                    {getModelIcon()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Active AI Model</p>
                    <p className="text-xs text-muted-foreground">{selectedModel}</p>
                  </div>
                </div>

                {/* Right: Provider + Model Selector */}
                <div className="flex items-center gap-2">
                  <Select value={selectedProviderId} onValueChange={(v) => { handleProviderSelect(v); const p = providers.find(p => p.id === v); if (p) setSelectedModel(p.provider === 'openai' ? 'gpt-4o' : ''); }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Select provider">
                        {selectedProvider
                          ? (selectedProvider.displayName || PROVIDER_INFO[selectedProvider.provider]?.name || selectedProvider.provider)
                          : 'Select provider'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              provider.status === 'connected' && 'bg-emerald-500',
                              provider.status === 'error' && 'bg-red-500',
                              provider.status === 'disconnected' && 'bg-slate-400'
                            )} />
                            {provider.displayName || PROVIDER_INFO[provider.provider]?.name || provider.provider}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder={selectedProvider?.hasApiKey || apiKeySaveStatus === 'saved' ? "Select model" : "Configure API Key first"}>
                        {selectedModel || (selectedProvider?.hasApiKey || apiKeySaveStatus === 'saved' ? "Select model" : "Configure API Key first")}
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
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Zap className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage & Trust Levels - Current Provider Only */}
          <div className="space-y-4">
            {/* Current Provider Quota - 5小时限额 + 周限额 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Hourly Quota */}
              <div className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium">{selectedProvider?.provider ? PROVIDER_INFO[selectedProvider.provider]?.name : 'Provider'} - Hourly</p>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    {Math.round((currentQuota.hourlyUsed / currentQuota.hourlyLimit) * 100)}%
                  </Badge>
                </div>
                <Progress value={(currentQuota.hourlyUsed / currentQuota.hourlyLimit) * 100} className="h-1.5 mb-1" />
                <p className="text-[10px] text-muted-foreground">
                  {currentQuota.hourlyUsed.toLocaleString()} / {currentQuota.hourlyLimit.toLocaleString()} tokens (5h)
                </p>
              </div>

              {/* Weekly Quota */}
              <div className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium">{selectedProvider?.provider ? PROVIDER_INFO[selectedProvider.provider]?.name : 'Provider'} - Weekly</p>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    {Math.round((currentQuota.weeklyUsed / currentQuota.weeklyLimit) * 100)}%
                  </Badge>
                </div>
                <Progress value={(currentQuota.weeklyUsed / currentQuota.weeklyLimit) * 100} className="h-1.5 mb-1" />
                <p className="text-[10px] text-muted-foreground">
                  {currentQuota.weeklyUsed.toLocaleString()} / {currentQuota.weeklyLimit.toLocaleString()} tokens
                </p>
                {currentQuota.balance !== undefined && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Balance: ${currentQuota.balance.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Trust Level Card */}
            <TrustLevelCard level={trustLevel} />
          </div>

          {/* Stats Summary - 使用主题适配颜色 */}
          <div className="grid grid-cols-3 gap-3">
            <NeutralStatCard label="Connected Providers" value={`${connectedCount} / ${providers.length}`} />
            <NeutralStatCard label="Active Skills" value={`${activeSkillsCount} / ${SKILLS.length}`} />
            <NeutralStatCard label="Active Servers" value={`${enabledCliProvidersCount} / ${cliProviders.length}`} />
          </div>
        </div>

        {/* Accordion Menu Section */}
        <div className="space-y-2">
          {/* Providers Accordion */}
          <NeutralAccordionCard
            title="Providers"
            icon={<Bot className="w-4 h-4" />}
            badge={`${connectedCount} Connected`}
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
                            title="Test connection"
                          >
                            {isTesting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
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
              <Card>
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
                      <CardTitle>{PROVIDER_INFO[selectedProvider.provider]?.name || selectedProvider.provider}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Model Selection - Only available after API key is validated */}
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Brain className="w-3.5 h-3.5 text-muted-foreground" />
                      Available Models
                      {!selectedProvider?.hasApiKey && (
                        <span className="text-xs text-muted-foreground ml-2 font-normal">(Configure API Key first)</span>
                      )}
                    </label>
                    <Select
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                      disabled={!selectedProvider?.hasApiKey}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedProvider?.hasApiKey ? "Select model" : "Configure API Key first"}>
                          {selectedModel || (selectedProvider?.hasApiKey ? "Select model" : "Configure API Key first")}
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
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                            Base URL
                            {isUsingDefault && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">default</Badge>
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
                              <Badge variant="secondary" className="text-xs gap-1 h-6">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Saving
                              </Badge>
                            )}
                            {saveStatus === 'saved' && (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs gap-1 h-6">
                                <CircleCheck className="w-3 h-3" />
                                Saved
                              </Badge>
                            )}
                            {saveStatus === 'error' && (
                              <Badge variant="destructive" className="text-xs gap-1 h-6">
                                <CircleX className="w-3 h-3" />
                                Error
                              </Badge>
                            )}
                            {saveStatus === 'idle' && baseUrlValue !== defaultUrl && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs px-1.5 gap-1"
                                  onClick={() => handleResetBaseUrl(selectedProvider.id, providerKey)}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-6 text-xs px-2 gap-1"
                                  onClick={() => handleSaveBaseUrl(selectedProvider.id)}
                                >
                                  <Save className="w-3 h-3" />
                                  Save
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Press Enter to save immediately.
                        </p>
                        {isUsingDefault && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            Empty will fall back to default: <span className="font-mono">{PROVIDER_DEFAULT_BASE_URL[providerKey]}</span>
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* API Configuration */}
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-muted-foreground" />
                      API Key
                      {selectedProvider?.hasApiKey && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                          Saved
                        </Badge>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                        <PasswordInput
                          placeholder={selectedProvider?.hasApiKey ? '••••••••••••' : 'sk-...'}
                          className="pl-9 pr-28"
                          value={apiKeyInput}
                          onChange={(e) => !selectedProvider?.hasApiKey && setApiKeyInput(e.target.value)}
                          disabled={!!selectedProvider?.hasApiKey}
                        />
                        <div className="absolute right-9 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                          {apiKeySaveStatus === 'saving' && (
                            <Badge variant="secondary" className="text-xs gap-1 h-6">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Saving
                            </Badge>
                          )}
                          {apiKeySaveStatus === 'saved' && (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs gap-1 h-6">
                              <CircleCheck className="w-3 h-3" />
                              Saved
                            </Badge>
                          )}
                          {apiKeySaveStatus === 'deleting' && (
                            <Badge variant="secondary" className="text-xs gap-1 h-6">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Deleting
                            </Badge>
                          )}
                          {apiKeySaveStatus === 'error' && (
                            <Badge variant="destructive" className="text-xs gap-1 h-6">
                              <CircleX className="w-3 h-3" />
                              Error
                            </Badge>
                          )}
                          {apiKeySaveStatus === 'idle' && (
                            <>
                              {status === 'validating' && (
                                <Badge variant="secondary" className="text-xs gap-1 h-6">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Checking
                                </Badge>
                              )}
                              {(status === 'valid' || (selectedProvider?.hasApiKey && status !== 'invalid')) && (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs gap-1 h-6">
                                  <CircleCheck className="w-3 h-3" />
                                  Valid
                                </Badge>
                              )}
                              {status === 'invalid' && (
                                <Badge variant="destructive" className="text-xs gap-1 h-6">
                                  <CircleX className="w-3 h-3" />
                                  Invalid
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
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          Save
                        </Button>
                      ) : selectedProvider?.hasApiKey ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteApiKey}
                          disabled={apiKeySaveStatus === 'deleting'}
                          className="gap-1"
                          title="Delete saved API key"
                        >
                          {apiKeySaveStatus === 'deleting' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Delete
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {selectedProvider?.hasApiKey
                        ? 'API Key is saved. Click Delete to remove and enter a new one.'
                        : 'Enter API key and click Save to configure this provider.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </NeutralAccordionCard>

          {/* MCP Servers Accordion */}
          <NeutralAccordionCard
            title="MCP Servers / CLI Providers"
            icon={<Server className="w-4 h-4" />}
            badge={`${enabledCliProvidersCount} / ${cliProviders.length} Available`}
            isOpen={activeAccordion === 'mcp'}
            onToggle={() => handleAccordionChange('mcp')}
          >
            {/* Toolbar */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                本机可用的 MCP / CLI Provider 实时状态
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
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3 w-3" />
                )}
                重新探测
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
                            <p className="text-[10px] text-muted-foreground truncate">
                              model: {provider.model}
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
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-colors min-h-[80px]"
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
            title="Skills"
            icon={<Puzzle className="w-4 h-4" />}
            badge={`${activeSkillsCount} Active`}
            isOpen={activeAccordion === 'skills'}
            onToggle={() => handleAccordionChange('skills')}
          >
            {/* Skills by Category */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-6">
                  {['Development', 'Management'].map((category) => (
                    <div key={category}>
                      <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SKILLS.filter((s) => s.category === category).map((skill) => (
                          <div
                            key={skill.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium">{skill.name}</p>
                              <p className="text-xs text-muted-foreground">{skill.description}</p>
                            </div>
                            <Button
                              variant={skills[skill.id] ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleSkill(skill.id)}
                            >
                              {skills[skill.id] ? 'Enabled' : 'Disabled'}
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
            title="Roles"
            icon={<UserCircle className="w-4 h-4" />}
            badge="4 Roles"
            isOpen={activeAccordion === 'roles'}
            onToggle={() => handleAccordionChange('roles')}
          >
            {/* Roles */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {[
                    { id: 'senior', name: 'Senior Engineer', desc: 'Full access to development tasks', perms: ['code:read', 'code:write', 'code:review', 'deploy'] },
                    { id: 'junior', name: 'Junior Engineer', desc: 'Limited development access', perms: ['code:read', 'code:write'] },
                    { id: 'pm', name: 'Project Manager', desc: 'Project and task management', perms: ['task:read', 'task:write', 'project:read'] },
                    { id: 'qa', name: 'QA Engineer', desc: 'Bug tracking and testing', perms: ['task:read', 'bug:write', 'test:run'] },
                  ].map((role) => (
                    <div
                      key={role.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium">{role.name}</p>
                          <p className="text-xs text-muted-foreground">{role.desc}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
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
      </div>
    </PageShell>
  );
}

// Neutral Accordion Card Component (主题适配)
function NeutralAccordionCard({
  title,
  icon,
  badge,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
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
          <span className="text-muted-foreground">{icon}</span>
          <span className="font-semibold">{title}</span>
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
  const config = {
    connected: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Connected' },
    disconnected: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', label: 'Disconnected' },
    error: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Error' },
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
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium">Trust Level</p>
        <span className="text-sm font-semibold">{level}%</span>
      </div>
      <Progress value={level} className="h-1.5 mb-1" />
      <p className="text-[10px] text-muted-foreground">AI autonomy level</p>
    </div>
  );
}
function NeutralStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-3 border bg-card text-foreground">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
