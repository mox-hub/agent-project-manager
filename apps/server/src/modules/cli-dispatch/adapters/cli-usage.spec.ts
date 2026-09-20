/**
 * 进程内执行路径 usage 口径（P2-15）单测：
 * 1) server 侧 adapter 镜像的 usage 提取（claude-code result 终事件 / opencode step_finish）
 * 2) CliExecutorService.recordExecutionUsage 与 daemon 路径（runtime.service）同构落 AIUsageLog
 */

import { ClaudeCodeAdapter } from './claude-code.adapter';
import { OpenCodeAdapter } from './opencode.adapter';
import { CodexAdapter } from './codex.adapter';
import { CLI_ADAPTER_CAPABILITIES, CliUsage } from './cli-adapter.interface';
import { CliExecutorService } from '../cli-executor.service';
import { CliProviderRegistry } from '../cli-provider.registry';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { ExecutionService } from '@/modules/execution/execution.service';
import { ApprovalService } from '@/modules/execution/approval.service';
import { PrismaService } from '@/core/database/prisma.service';
import { UsagePricingService } from '@/modules/ai-hub/services/usage-pricing.service';

describe('cli adapters usage 提取（进程内路径）', () => {
  it('claude-code parseFinalResult：result 终事件提取 usage（input/output tokens + 顶层 total_cost_usd + model）', () => {
    const adapter = new ClaudeCodeAdapter();
    const stdout = [
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: '做完了' }] },
      }),
      JSON.stringify({
        type: 'result',
        subtype: 'success',
        result: '做完了',
        total_cost_usd: 0.42,
        model: 'claude-sonnet-4-5',
        usage: { input_tokens: 1200, output_tokens: 300 },
      }),
    ].join('\n');

    const parsed = adapter.parseFinalResult(stdout, 0);
    expect(parsed.status).toBe('completed');
    expect(parsed.usage).toEqual({
      promptTokens: 1200,
      completionTokens: 300,
      totalTokens: 1500,
      costUsd: 0.42,
      model: 'claude-sonnet-4-5',
    });
  });

  it('claude-code parseFinalResult：无 result usage 行时 usage 缺省（不造假）', () => {
    const adapter = new ClaudeCodeAdapter();
    const stdout = JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'hi' }] },
    });
    const parsed = adapter.parseFinalResult(stdout, 0);
    expect(parsed.usage).toBeUndefined();
  });

  it('claude-code parseStream：result 终事件经 emit.usage 回调上报', () => {
    const adapter = new ClaudeCodeAdapter();
    const seen: CliUsage[] = [];
    adapter.parseStream(
      JSON.stringify({
        type: 'result',
        subtype: 'success',
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
      { usage: (u) => seen.push(u) },
    );
    expect(seen).toEqual([
      { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    ]);
  });

  it('opencode parseFinalResult：step_finish part.tokens 提取 usage（reasoning 并入 completion）', () => {
    const adapter = new OpenCodeAdapter();
    const stdout = [
      JSON.stringify({ type: 'text', part: { text: '结论' } }),
      JSON.stringify({
        type: 'step_finish',
        part: {
          reason: 'stop',
          tokens: { input: 80, output: 20, reasoning: 10 },
          cost: 0.01,
        },
      }),
    ].join('\n');

    const parsed = adapter.parseFinalResult(stdout, 0);
    expect(parsed.usage).toEqual({
      promptTokens: 80,
      completionTokens: 30,
      totalTokens: 110,
      costUsd: 0.01,
    });
  });

  it('codex 无 usage 能力位（数据源不存在，进程内路径不落假数据）', () => {
    expect(CLI_ADAPTER_CAPABILITIES.codex.usage).toBe(false);
    const adapter = new CodexAdapter();
    // codex 的 ParseResult 契约本就不含 usage 字段（能力位 false 的家无数据源）
    const parsed = adapter.parseFinalResult('ok', 0) as { usage?: unknown };
    expect(parsed.usage).toBeUndefined();
  });
});

describe('CliExecutorService.recordExecutionUsage（进程内路径与 daemon 同构）', () => {
  const mockPrisma = {
    execution: { findUnique: vi.fn() },
    aIUsageLog: { create: vi.fn() },
  };
  const mockUsagePricing = { estimateCostUsd: vi.fn() };

  const build = () =>
    new CliExecutorService(
      {} as unknown as CliProviderRegistry,
      {} as MessageBusService,
      {} as ExecutionService,
      {} as ApprovalService,
      mockPrisma as unknown as PrismaService,
      mockUsagePricing as unknown as UsagePricingService,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.execution.findUnique.mockResolvedValue({
      projectId: 'p1',
      createdBy: 'u1',
      subjectId: 'm1',
    });
  });

  it('CLI 带 costUsd 时直接落账，不再估价', async () => {
    const service = build();
    await service['recordExecutionUsage'](
      'exec-1',
      {
        promptTokens: 1200,
        completionTokens: 300,
        totalTokens: 1500,
        costUsd: 0.42,
        model: 'claude-sonnet-4-5',
      },
      'claude-code',
    );

    expect(mockPrisma.aIUsageLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        projectId: 'p1',
        executionRunId: 'exec-1',
        modelName: 'claude-sonnet-4-5',
        provider: 'claude-code',
        promptTokens: 1200,
        completionTokens: 300,
        totalTokens: 1500,
        estimatedCost: 0.42,
        responseMetadata: { source: 'in-process-execution' },
      }),
    });
    expect(mockUsagePricing.estimateCostUsd).not.toHaveBeenCalled();
  });

  it('CLI 未给 costUsd 时走 UsagePricingService 估价', async () => {
    mockUsagePricing.estimateCostUsd.mockResolvedValue(0.0135);
    const service = build();
    await service['recordExecutionUsage'](
      'exec-2',
      { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      'opencode',
    );

    expect(mockUsagePricing.estimateCostUsd).toHaveBeenCalledWith({
      modelName: 'opencode',
      provider: 'opencode',
      promptTokens: 100,
      completionTokens: 50,
    });
    expect(mockPrisma.aIUsageLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        executionRunId: 'exec-2',
        provider: 'opencode',
        estimatedCost: 0.0135,
      }),
    });
  });

  it('run 已被清理时仍落账（归因字段降级为 null，不丢用量）', async () => {
    mockPrisma.execution.findUnique.mockResolvedValue(null);
    mockUsagePricing.estimateCostUsd.mockResolvedValue(null);
    const service = build();
    await service['recordExecutionUsage'](
      'exec-3',
      { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      'claude-code',
    );

    expect(mockPrisma.aIUsageLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: null,
        projectId: null,
        executionRunId: 'exec-3',
      }),
    });
  });
});
