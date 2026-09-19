/**
 * AI 管理合并页（/app/settings/ai）单测
 * 覆盖：默认页签 = 概览（含快捷设置卡）、?tab= URL 定位、五页签内容渲染、
 * 内置模型持久化控制、模型查询入口、CLI 品牌图标全量替换。
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test-utils/providers';
import { AiManagementSection } from './ai-management-section';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // 对象插值（t(key, opts)）回键名渲染，避免把 options 对象当 React 子节点
    t: (key: string, opts?: unknown) => (typeof opts === 'string' ? opts : key),
    i18n: { language: 'zh-CN' },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/shared/confirm/use-confirm', () => ({
  useConfirm: () => async () => true,
}));

// @lobehub/icons 的 re-export 链经 peer 依赖 @lobehub/ui 牵出 emoji-mart 的 JSON
// 原生 ESM import（vitest 不做 tree-shake），测试用 stub 隔离；品牌身份以 data-testid 断言
vi.mock('@lobehub/icons', () => {
  const make = (brand: string) => {
    const Comp = (props: { size?: number; className?: string }) => (
      <svg data-testid={`brand-${brand}`} width={props.size} height={props.size} className={props.className} />
    );
    (Comp as unknown as { Color: typeof Comp }).Color = Comp;
    return Comp;
  };
  return {
    OpenAI: make('openai'),
    Claude: make('claude'),
    Gemini: make('gemini'),
    DeepSeek: make('deepseek'),
    Zhipu: make('zhipu'),
    ClaudeCode: make('claude-code'),
    Codex: make('codex'),
    Cursor: make('cursor'),
    OpenCode: make('opencode'),
  };
});

// 模型服务数据源（GET /ai/providers + 内置模型 GET/PUT /ai/default-model）
vi.mock('@/modules/ai-hub/hooks/use-ai-providers', () => ({
  providerKeys: { all: ['ai-providers'], detail: (id: string) => ['ai-providers', id] },
  defaultModelKeys: { all: ['ai-default-model'] },
  useAiProviders: () => ({
    data: [
      {
        id: 'p-openai',
        provider: 'openai',
        displayName: 'OpenAI',
        status: 'connected',
        enabled: true,
        hasApiKey: true,
        baseUrl: null,
        availableModels: ['gpt-4o', 'gpt-4o-mini'],
        metadata: null,
      },
      {
        id: 'p-anthropic',
        provider: 'anthropic',
        displayName: 'Anthropic',
        status: 'disconnected',
        enabled: true,
        hasApiKey: false,
        baseUrl: null,
        availableModels: null,
        metadata: null,
      },
    ],
    isLoading: false,
  }),
  useUpdateProvider: () => ({ mutate: vi.fn(), isPending: false }),
  useTestProvider: () => ({ mutateAsync: vi.fn() }),
  useDetectModels: () => ({ mutate: vi.fn(), isPending: false }),
  useProviderBalance: () => ({
    data: {
      type: 'prepaid',
      currency: 'CNY',
      balance: 110.55,
      grantedBalance: 10,
      toppedUpBalance: 100.55,
      isAvailable: true,
      windows: [],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isRefetching: false,
  }),
  useDefaultModel: () => ({
    data: { provider: 'openai', model: 'gpt-4o' },
    isLoading: false,
  }),
  useSetDefaultModel: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/modules/ai-hub/hooks/use-validate-provider', () => ({
  useProviderValidation: () => ({ status: 'idle', validate: vi.fn(), reset: vi.fn() }),
}));

// 参考价源（CAP-A-21）：models.dev 价目目录状态（在线 + 覆盖规模）
vi.mock('@/modules/ai-hub/hooks/use-pricing-source', () => ({
  usePricingSource: () => ({
    data: {
      available: true,
      fetchedAt: '2026-09-19T08:00:00.000Z',
      stale: false,
      providerCount: 222,
      modelCount: 7860,
      source: 'https://models.dev/api.json',
      error: null,
    },
    isLoading: false,
  }),
  useRefreshPricingSource: () => ({ mutate: vi.fn(), isPending: false }),
}));

// CLI / MCP 数据源（settings 合并页消费面全量 mock）
vi.mock('@/modules/mcp-server', () => ({
  MCP_TRANSPORTS: ['stdio', 'http', 'sse'],
  PROVIDER_DISPLAY_NAMES: {
    'claude-code': 'Claude Code',
    codex: 'Codex CLI',
    zcode: 'ZCode',
  } as Record<string, string>,
  PROVIDER_DESCRIPTIONS: {} as Record<string, string>,
  useCliProviders: () => ({
    data: {
      providers: [
        { providerId: 'claude-code', available: true, enabled: true, commandPath: 'claude', version: '1.0.0' },
        { providerId: 'zcode', available: false, enabled: true, commandPath: 'zcode' },
      ],
    },
    isLoading: false,
  }),
  useDetectCliProviders: () => ({ mutate: vi.fn(), isPending: false }),
  useHealthCheckCliProvider: () => ({ mutate: vi.fn(), isPending: false, variables: undefined }),
  useConfigureCliProvider: () => ({ mutate: vi.fn(), isPending: false }),
  useMcpServers: () => ({ data: { servers: [] }, isLoading: false }),
  useCreateMcpServer: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateMcpServer: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteMcpServer: () => ({ mutate: vi.fn(), isPending: false }),
  useRefreshMcpServer: () => ({ mutate: vi.fn(), isPending: false, variables: undefined }),
  useRefreshAllMcpServers: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/modules/skills', () => ({
  skillsApi: { getSkill: vi.fn().mockResolvedValue({}) },
  useSkills: () => ({
    data: {
      skills: [
        { key: 'code-review', name: 'Code Review', description: '审查代码', category: 'Development', enabled: true, source: 'builtin' },
      ],
    },
    isLoading: false,
  }),
  useUpdateSkill: () => ({ mutate: vi.fn(), isPending: false, variables: undefined }),
  useCreateSkill: () => ({ mutate: vi.fn(), isPending: false }),
  useImportSkill: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteSkill: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderSection(initialEntry = '/app/settings/ai') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={createTestQueryClient()}>
        <AiManagementSection />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('AiManagementSection（合并页）', () => {
  it('默认渲染概览页签：快捷设置卡（内置模型徽章 + 厂家启停）与 KPI 可见', () => {
    renderSection();
    // 快捷设置卡（CAP-A-20）：标题 + 内置模型已保存徽章 + 厂家启停行
    expect(screen.getByText('aiHub.quickSettings')).toBeInTheDocument();
    expect(screen.getByText('aiHub.defaultModelBadge')).toBeInTheDocument();
    expect(screen.getByText('aiHub.providerToggles')).toBeInTheDocument();
    // KPI 数值：模型服务 1/2 已连接、CLI 1/2 在线（claude 在线/zcode 离线）
    expect(screen.getAllByText('1/2').length).toBeGreaterThanOrEqual(2);
  });

  it('?tab=overview 初始化：概览 KPI 与 CLI/MCP 健康卡渲染', () => {
    renderSection('/app/settings/ai?tab=overview');
    expect(screen.getAllByText('1/2').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('1/1').length).toBeGreaterThanOrEqual(1);
    // CLI 健康卡内品牌名（真实 CLI provider 列表驱动）
    expect(screen.getAllByText('Claude Code').length).toBeGreaterThan(0);
  });

  it('?tab=models 初始化：内置模型卡（持久化控制）+ 厂家卡片 + 查询模型按钮', () => {
    renderSection('/app/settings/ai?tab=models');
    // 厂家卡片网格展示两家（真实 provider 列表驱动）
    expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Anthropic').length).toBeGreaterThan(0);
    // 内置模型卡标题（原「当前 AI 模型」本地假切换器已废除）
    expect(screen.getByText('aiHub.defaultModel')).toBeInTheDocument();
    // 详情区模型真实查询入口（openai 已配密钥 → 可用）
    expect(screen.getByRole('button', { name: /aiHub.detectModels/ })).toBeInTheDocument();
  });

  it('?tab=models 余额区：充值型展示剩余余额与进度条（openai 已配密钥）', () => {
    renderSection('/app/settings/ai?tab=models');
    // 余额卡标题 + 充值型剩余金额（mock 返回 prepaid 110.55 CNY）
    expect(screen.getByText('aiHub.balanceTitle')).toBeInTheDocument();
    expect(screen.getByText('aiHub.balanceRemainingLabel')).toBeInTheDocument();
    expect(screen.getByText(/110\.55/)).toBeInTheDocument();
    // 查询失败引导与进度条节点存在（进度指示器 data-slot）
    expect(document.querySelector('[data-slot="progress-indicator"]')).not.toBeNull();
  });

  it('?tab=models 参考价源卡（CAP-A-21）：在线状态、覆盖规模行与刷新入口渲染', () => {
    renderSection('/app/settings/ai?tab=models');
    // 标题 + 在线状态点文案 + 规模行（插值回键名）+ 图标刷新按钮（title 提供可访问名）
    expect(screen.getByText('aiHub.pricingSourceTitle')).toBeInTheDocument();
    expect(screen.getByText('aiHub.pricingSourceOnline')).toBeInTheDocument();
    expect(screen.getByText(/aiHub\.pricingSourceCoverage/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'aiHub.pricingSourceRefresh' })).toBeInTheDocument();
    // 缓存未过期 → 无「已过期」徽章
    expect(screen.queryByText('aiHub.pricingSourceStale')).not.toBeInTheDocument();
  });

  it('?tab=tools 初始化：CLI 工具卡渲染且品牌图标为厂家 logo（替换原 emoji/Bot 通用图标）', () => {
    const { container } = renderSection('/app/settings/ai?tab=tools');
    expect(screen.getAllByText('Claude Code').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ZCode').length).toBeGreaterThan(0);
    // 品牌图标走 provider-meta 唯一源（ClaudeCode/Zhipu 彩色变体）；
    // 页签切换器自身保留 lucide Bot 图标（tab 语义），不属 CLI 卡兜底
    expect(container.querySelectorAll('[data-testid="brand-claude-code"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-testid="brand-zhipu"]').length).toBeGreaterThan(0);
  });

  it('?tab=skills 初始化：真实技能注册表渲染', () => {
    renderSection('/app/settings/ai?tab=skills');
    expect(screen.getAllByText('Code Review').length).toBeGreaterThan(0);
  });

  it('五页签切换器完整呈现（模型服务/概览/CLI 工具/MCP 服务器/技能）', () => {
    renderSection();
    for (const label of ['aiHub.tabModels', 'aiHub.overview', 'aiHub.cliTools', 'aiHub.mcpServers', 'aiHub.skills']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });
});
