import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { AiHubService } from './ai-hub.service';
import { ContextBuilderService } from './services/context-builder.service';
import { AdapterRegistryService } from './services/adapter-registry.service';
import { AssistantToolsService } from './services/assistant-tools.service';
import { UsagePricingService } from './services/usage-pricing.service';
import { EncryptionService } from '../../core/crypto/encryption.service';

describe('AiHubService', () => {
  let service: AiHubService;

  const mockPrismaService = {
    aIModelConfig: { findMany: vi.fn() },
    aIConversation: { findUnique: vi.fn(), create: vi.fn() },
    aIUsageLog: { findMany: vi.fn() },
    execution: { findMany: vi.fn() },
    acceptance: { findMany: vi.fn() },
    appConfig: { findFirst: vi.fn().mockResolvedValue(null) },
  };

  const mockMessageBusService = {
    publish: vi.fn(),
  };

  const mockContextBuilderService = {
    buildContext: vi.fn(),
    formatContextForPrompt: vi.fn(),
  };

  const mockAdapterRegistryService = {
    getAdapterByModel: vi.fn(),
    getLoadedProviders: vi.fn().mockReturnValue(['openai']),
    getAdapter: vi.fn(),
    listAdapters: vi
      .fn()
      .mockReturnValue([{ provider: 'openai', model: 'gpt-4' }]),
  };

  const mockEncryptionService = {
    decrypt: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiHubService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MessageBusService, useValue: mockMessageBusService },
        { provide: ContextBuilderService, useValue: mockContextBuilderService },
        {
          provide: AdapterRegistryService,
          useValue: mockAdapterRegistryService,
        },
        {
          provide: AssistantToolsService,
          useValue: {
            buildTools: vi.fn().mockReturnValue({}),
            describeTools: vi.fn().mockReturnValue({ tools: [] }),
            renderCatalogForPrompt: vi.fn().mockReturnValue(''),
          },
        },
        { provide: EncryptionService, useValue: mockEncryptionService },
        {
          provide: UsagePricingService,
          useValue: { estimateCostUsd: vi.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();

    service = module.get<AiHubService>(AiHubService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getModels should merge db models and registered adapters', async () => {
    mockPrismaService.aIModelConfig.findMany.mockResolvedValue([
      {
        id: 'm-1',
        name: 'db-model',
        provider: 'openai',
        taskTypes: ['chat'],
        maxTokens: 4096,
        enabled: true,
      },
    ]);

    const result = await service.getModels();

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'm-1', name: 'db-model' }),
      ]),
    );
  });

  it('getConversation should reject non-owner access', async () => {
    mockPrismaService.aIConversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      createdBy: 'other-user',
      messages: [],
      project: null,
      issue: null,
    });

    await expect(service.getConversation('conv-1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('getUsage should aggregate token and cost by model', async () => {
    mockPrismaService.aIUsageLog.findMany.mockResolvedValue([
      {
        modelName: 'gpt-4.1-mini',
        totalTokens: 100,
        estimatedCost: 0.01,
        conversationId: 'conv-1',
      },
      {
        modelName: 'gpt-4.1-mini',
        totalTokens: 300,
        estimatedCost: 0.02,
        executionRunId: 'exec-1',
      },
      {
        modelName: 'gpt-4.1',
        totalTokens: 200,
        estimatedCost: 0.05,
      },
    ]);

    const usage = await service.getUsage({});

    expect(usage.totalTokens).toBe(600);
    expect(usage.totalCost).toBeCloseTo(0.08, 6);
    expect(usage.byModel).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          modelName: 'gpt-4.1-mini',
          totalTokens: 400,
          totalCost: 0.03,
        }),
        expect.objectContaining({
          modelName: 'gpt-4.1',
          totalTokens: 200,
          totalCost: 0.05,
        }),
      ]),
    );
    // 调用来源分类计数：conversation 优先，execution/workflow 次之，其余为静默
    expect(usage.totalCalls).toBe(3);
    expect(usage.conversationCalls).toBe(1);
    expect(usage.executionCalls).toBe(1);
    expect(usage.silentCalls).toBe(1);
  });

  // ── 验收归因成本聚合（CAP-C-06）：空数据 / 正常归因 / 返工血缘三场景 ──

  it('getAcceptanceAttribution 空数据：全零汇总且单位验收成本为诚实 null', async () => {
    mockPrismaService.aIUsageLog.findMany.mockResolvedValue([]);
    mockPrismaService.execution.findMany.mockResolvedValue([]);
    mockPrismaService.acceptance.findMany.mockResolvedValue([]);

    const result = await service.getAcceptanceAttribution({});

    expect(result).toEqual({
      totalExecutionCost: 0,
      reworkCost: 0,
      reworkPct: 0,
      acceptanceCount: 0,
      avgCostPerAcceptance: null,
      byAcceptance: [],
      byIssueType: [],
    });
    // 不关联执行链的日志（对话/静默）不进归因：where 限定 executionRunId 非空
    expect(mockPrismaService.aIUsageLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { executionRunId: { not: null } },
      }),
    );
  });

  it('getAcceptanceAttribution 正常归因：按工单聚合成本并映射到验收单', async () => {
    // 两条日志挂 exec-1（合计 1.5），一条挂 exec-2（0.25）
    mockPrismaService.aIUsageLog.findMany.mockResolvedValue([
      { executionRunId: 'exec-1', estimatedCost: 1.0 },
      { executionRunId: 'exec-1', estimatedCost: 0.5 },
      { executionRunId: 'exec-2', estimatedCost: 0.25 },
    ]);
    mockPrismaService.execution.findMany.mockResolvedValue([
      {
        id: 'exec-1',
        retryOfId: null,
        issue: {
          id: 'issue-1',
          title: '工单一',
          type: 'task',
          issueType: { name: '需求拆解' },
        },
      },
      {
        id: 'exec-2',
        retryOfId: null,
        issue: {
          id: 'issue-2',
          title: '工单二',
          type: 'bug',
          issueType: null,
        },
      },
    ]);
    mockPrismaService.acceptance.findMany.mockResolvedValue([
      { id: 'acc-1', issueId: 'issue-1', title: '验收单一' },
      { id: 'acc-2', issueId: 'issue-2', title: null },
    ]);

    const result = await service.getAcceptanceAttribution({});

    expect(result.totalExecutionCost).toBeCloseTo(1.75, 6);
    expect(result.reworkCost).toBe(0);
    expect(result.reworkPct).toBe(0);
    expect(result.acceptanceCount).toBe(2);
    expect(result.avgCostPerAcceptance).toBeCloseTo(0.875, 6);
    // 按成本降序：issue-1（1.5）在前；类型名事实源 = IssueType.name，未挂回落 legacy type
    expect(result.byAcceptance).toEqual([
      {
        acceptanceId: 'acc-1',
        acceptanceTitle: '验收单一',
        issueId: 'issue-1',
        issueTitle: '工单一',
        issueTypeName: '需求拆解',
        cost: 1.5,
        executionCount: 1,
        reworkCount: 0,
      },
      {
        acceptanceId: 'acc-2',
        acceptanceTitle: null,
        issueId: 'issue-2',
        issueTitle: '工单二',
        issueTypeName: 'bug',
        cost: 0.25,
        executionCount: 1,
        reworkCount: 0,
      },
    ]);
  });

  it('getAcceptanceAttribution 返工血缘：retryOfId 非空的执行计入返工成本与占比', async () => {
    // exec-1 原始执行 1.0；exec-2 是 exec-1 的重试（2.0）→ 返工成本 2.0，占比 2/3
    mockPrismaService.aIUsageLog.findMany.mockResolvedValue([
      { executionRunId: 'exec-1', estimatedCost: 1.0 },
      { executionRunId: 'exec-2', estimatedCost: 2.0 },
    ]);
    mockPrismaService.execution.findMany.mockResolvedValue([
      {
        id: 'exec-1',
        retryOfId: null,
        issue: {
          id: 'issue-1',
          title: '反复失败的工单',
          type: 'bug',
          issueType: { name: '缺陷修复' },
        },
      },
      {
        id: 'exec-2',
        retryOfId: 'exec-1',
        issue: {
          id: 'issue-1',
          title: '反复失败的工单',
          type: 'bug',
          issueType: { name: '缺陷修复' },
        },
      },
    ]);
    mockPrismaService.acceptance.findMany.mockResolvedValue([
      { id: 'acc-1', issueId: 'issue-1', title: '验收单一' },
    ]);

    const result = await service.getAcceptanceAttribution({ projectId: 'p1' });

    expect(result.totalExecutionCost).toBeCloseTo(3.0, 6);
    expect(result.reworkCost).toBeCloseTo(2.0, 6);
    expect(result.reworkPct).toBeCloseTo((2 / 3) * 100, 6);
    expect(result.acceptanceCount).toBe(1);
    // 同工单两执行归并一行：executionCount=2、reworkCount=1
    expect(result.byAcceptance).toEqual([
      expect.objectContaining({
        issueId: 'issue-1',
        cost: 3.0,
        executionCount: 2,
        reworkCount: 1,
      }),
    ]);
    // 返工分布按工单类型归组
    expect(result.byIssueType).toEqual([
      { issueTypeName: '缺陷修复', reworkCount: 1, cost: 3.0 },
    ]);
    // projectId 过滤透传到用量日志查询
    expect(mockPrismaService.aIUsageLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { executionRunId: { not: null }, projectId: 'p1' },
      }),
    );
  });
});
