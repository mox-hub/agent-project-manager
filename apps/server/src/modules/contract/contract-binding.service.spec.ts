import { ContractBindingService } from './contract-binding.service';
import type { ManagedBlockRecord } from './contract-binding.service';

/** CAP-A-27 P1-D：契约漂移 AI 语义判定——benign 降级不建卡 / 其余照旧升级 */

const EXPECTED: ManagedBlockRecord[] = [
  { id: 'b1', source: '规则 A：必须先验收后发版', generator: 'seed:v1' },
];

function buildDeps(opts: {
  syncMode?: string;
  conflictState?: string | null;
  judge?: (
    scenario: string,
    state: string,
    questions: unknown,
  ) => Promise<unknown> | unknown;
}) {
  const binding = {
    id: 'bind1',
    projectId: 'p1',
    fileType: 'agents',
    filePath: 'AGENTS.md',
    syncMode: opts.syncMode ?? 'managed',
    conflictState: opts.conflictState ?? null,
    managedBlocks: [
      { id: 'b1', source: EXPECTED[0].source, generator: 'seed:v1' },
    ],
    baseline: 'old',
  };
  const prisma = {
    contractFileBinding: {
      findUnique: vi.fn(async () => binding),
      update: vi.fn(async () => binding),
    },
    decisionProposal: {
      create: vi.fn(async ({ data }: unknown) => ({
        id: 'prop1',
        kind: 'contract_conflict',
        ...(data as Record<string, unknown>),
      })),
    },
  };
  const engine = {
    checksum: vi.fn(() => 'cksum'),
    parseManagedBlocks: vi.fn(() => []),
    compareManagedBlocks: vi.fn(() => [
      {
        id: 'b1',
        state: 'file_differs',
        fileSide: '规则 A：可以直接发版（文件侧手改）',
      },
    ]),
  };
  const resolver = {
    resolveRoot: vi.fn(async () => '/ws'),
    join: vi.fn((_r: string, p: string) => `/${p}`),
  };
  const fs = { readFileIfExists: vi.fn(async () => '文件内容') };
  const messageBus = { publish: vi.fn() };
  const quickJudge = { judge: vi.fn(opts.judge ?? (async () => null)) };
  const service = new ContractBindingService(
    prisma as never,
    engine as never,
    resolver as never,
    fs as never,
    messageBus as never,
    quickJudge as never,
  );
  return { service, prisma, messageBus, quickJudge };
}

describe('ContractBindingService.checkAlignment 的 AI 漂移判定（CAP-A-27 P1-D）', () => {
  it('benign 且高置信 → 降级 aligned_with_drift：不建提案、conflictState 不置、发 benign 事件', async () => {
    const { service, prisma, messageBus, quickJudge } = buildDeps({
      judge: async () => ({
        scenario: 'contract_drift',
        model: 'jev-1.13-free',
        answers: {
          impact: {
            type: 'choice',
            choice: 'benign',
            confidence: 0.92,
            probabilities: {
              benign: 0.9,
              'semantic-break': 0.05,
              'formatting-only': 0.05,
            },
          },
        },
        usage: { inputTokens: 300, outputTokens: 20 },
      }),
    });

    const report = await service.checkAlignment('p1', 'agents');

    expect(quickJudge.judge).toHaveBeenCalledTimes(1);
    expect(report.state).toBe('aligned_with_drift');
    expect(report.aiImpact).toMatchObject({
      impact: 'benign',
      confidence: 0.92,
    });
    expect(report.proposalId).toBeUndefined();
    expect(prisma.decisionProposal.create).not.toHaveBeenCalled();
    expect(prisma.contractFileBinding.update).not.toHaveBeenCalled();
    expect(messageBus.publish).toHaveBeenCalledWith(
      'contract.drift.benign',
      expect.objectContaining({
        bindingId: 'bind1',
        impact: 'benign',
        confidence: 0.92,
      }),
    );
  });

  it('semantic-break → 照旧升级决策卡，aiImpact 附带在报告', async () => {
    const { service, prisma, messageBus } = buildDeps({
      judge: async () => ({
        scenario: 'contract_drift',
        model: 'jev-1.13-free',
        answers: {
          impact: {
            type: 'choice',
            choice: 'semantic-break',
            confidence: 0.97,
          },
        },
        usage: { inputTokens: 300, outputTokens: 20 },
      }),
    });

    const report = await service.checkAlignment('p1', 'agents');

    expect(report.state).toBe('conflicted');
    expect(report.proposalId).toBe('prop1');
    expect(prisma.decisionProposal.create).toHaveBeenCalledTimes(1);
    expect(report.aiImpact).toMatchObject({ impact: 'semantic-break' });
    expect(messageBus.publish).not.toHaveBeenCalledWith(
      'contract.drift.benign',
      expect.anything(),
    );
  });

  it('benign 但低置信（<0.85）→ 照旧升级（低置信不降级）', async () => {
    const { service, prisma } = buildDeps({
      judge: async () => ({
        scenario: 'contract_drift',
        model: 'm',
        answers: {
          impact: { type: 'choice', choice: 'benign', confidence: 0.6 },
        },
        usage: { inputTokens: 1, outputTokens: 1 },
      }),
    });

    const report = await service.checkAlignment('p1', 'agents');

    expect(report.state).toBe('conflicted');
    expect(report.proposalId).toBe('prop1');
    expect(prisma.decisionProposal.create).toHaveBeenCalledTimes(1);
  });

  it('judge 失败/未启用（null）→ 行为与现状完全一致（照旧升级）', async () => {
    const { service, prisma, quickJudge } = buildDeps({
      judge: async () => null,
    });

    const report = await service.checkAlignment('p1', 'agents');

    expect(quickJudge.judge).toHaveBeenCalledTimes(1);
    expect(report.state).toBe('conflicted');
    expect(report.proposalId).toBe('prop1');
    expect(report.aiImpact).toBeUndefined();
    expect(prisma.decisionProposal.create).toHaveBeenCalledTimes(1);
  });
});
