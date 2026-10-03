import { BadRequestException } from '@nestjs/common';
import { AcceptanceService } from './acceptance.service';

/** CAP-B-01 验收判定接入：接收完成要求每条标准至少一条有效（同版本）证据 */

function buildDeps(prisma: any, quickJudge?: { judge: any }) {
  const messageBus = { publish: vi.fn(async () => undefined) };
  const proposalService = {
    proposeTaskResolutionIfReady: vi.fn(async () => undefined),
  };
  const judge = quickJudge ?? { judge: vi.fn(async () => null) };
  const service = new AcceptanceService(
    prisma,
    {} as any,
    proposalService as any,
    messageBus as any,
    judge as any,
  );
  return { service, messageBus, proposalService, quickJudge: judge };
}

function makeAcceptance(criteria: Array<Record<string, unknown>>) {
  return {
    id: 'acc1',
    issueId: 'iss1',
    status: 'in_review',
    title: '验收 - 导出功能',
    completionType: 'artifact',
    completionEvidence: { artifactId: 'artifact-1' },
    auditReport: { riskLevel: 'green', blockedItems: [] },
    criteria,
  };
}

function buildPrisma(acceptance: Record<string, unknown>) {
  return {
    acceptance: {
      findUnique: vi.fn(async () => acceptance),
      update: vi.fn(async ({ data }: any) => ({ ...acceptance, ...data })),
    },
  };
}

describe('AcceptanceService.acceptCompletion 证据版本门禁（CAP-B-01）', () => {
  it('标准修订后（v2）仅有 v1 旧证据 → ACCEPT_BLOCKED，failures 含 criteriaEvidence', async () => {
    const acceptance = makeAcceptance([
      {
        id: 'c1',
        content: '导出文件格式为 xlsx',
        severity: 'medium',
        status: 'pending',
        revision: 2,
        evidences: [{ id: 'e1', criteriaRevision: 1 }],
      },
    ]);
    const prisma = buildPrisma(acceptance);
    const { service } = buildDeps(prisma);

    const err = await service
      .acceptCompletion('acc1', undefined, 'u1')
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    const failures = err.response?.failures ?? [];
    const evidenceFailure = failures.find(
      (f: any) => f.check === 'criteriaEvidence',
    );
    expect(evidenceFailure).toBeDefined();
    expect(evidenceFailure.reason).toContain('已修订');
  });

  it('标准修订后有同版本（v2）新证据 → 接收通过（旧证据并存不阻断）', async () => {
    const acceptance = makeAcceptance([
      {
        id: 'c1',
        content: '导出文件格式为 xlsx',
        severity: 'medium',
        status: 'pending',
        revision: 2,
        evidences: [
          { id: 'e1', criteriaRevision: 1 },
          { id: 'e2', criteriaRevision: 2 },
        ],
      },
    ]);
    const prisma = buildPrisma(acceptance);
    const { service } = buildDeps(prisma);

    const updated = await service.acceptCompletion('acc1', undefined, 'u1');

    expect(updated.status).toBe('passed');
  });

  it('标准从未有任何证据 → ACCEPT_BLOCKED（缺少有效验收证据）', async () => {
    const acceptance = makeAcceptance([
      {
        id: 'c1',
        content: '导出文件格式为 xlsx',
        severity: 'medium',
        status: 'passed',
        revision: 1,
        evidences: [],
      },
    ]);
    const prisma = buildPrisma(acceptance);
    const { service } = buildDeps(prisma);

    const err = await service
      .acceptCompletion('acc1', undefined, 'u1')
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    const failures = err.response?.failures ?? [];
    const evidenceFailure = failures.find(
      (f: any) => f.check === 'criteriaEvidence',
    );
    expect(evidenceFailure.reason).toContain('缺少有效验收证据');
  });

  it('存量兼容：证据无版本快照（null）且标准 revision=1 → 视为有效，接收通过', async () => {
    const acceptance = makeAcceptance([
      {
        id: 'c1',
        content: '导出文件格式为 xlsx',
        severity: 'medium',
        status: 'passed',
        revision: 1,
        evidences: [{ id: 'e1', criteriaRevision: null }],
      },
    ]);
    const prisma = buildPrisma(acceptance);
    const { service } = buildDeps(prisma);

    const updated = await service.acceptCompletion('acc1', undefined, 'u1');

    expect(updated.status).toBe('passed');
  });
});

/** P0-9 同款修复：AI 代写标准落库（applyCriteriaForIssue）非法项显式 400，不再静默过滤 */
describe('AcceptanceService.applyCriteriaForIssue 非法项显式拒绝', () => {
  function buildApplyPrisma(existingContents: string[] = []) {
    const createMany = vi.fn(async ({ data }: any) => ({ count: data.length }));
    const prisma = {
      issue: {
        findUnique: vi.fn(async () => ({ id: 'iss1', projectId: 'proj_1' })),
      },
      acceptance: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: 'acc1', issueId: 'iss1', status: 'draft' }),
      },
      acceptanceCriteria: {
        findMany: vi
          .fn()
          .mockResolvedValue(existingContents.map((content) => ({ content }))),
        createMany,
      },
    };
    const { service, messageBus } = buildDeps(prisma);
    return { service, createMany, messageBus };
  }

  it('含缺 content 的非法项 → 400 VALIDATION_ERROR 指明第 N 项，且不落库', async () => {
    const { service, createMany } = buildApplyPrisma();

    const err = await service
      .applyCriteriaForIssue(
        'iss1',
        [
          { content: '导出为 xlsx' },
          { content: '   ' },
          { content: '返回码 0' },
        ] as any,
        'u1',
      )
      .catch((e) => e);

    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.response.code).toBe('VALIDATION_ERROR');
    expect(err.response.message).toContain('第 2 项');
    expect(err.response.details).toEqual({ index: 2, field: 'content' });
    expect(createMany).not.toHaveBeenCalled();
  });

  it('content 非字符串同样 400 拒绝（原实现会静默丢弃）', async () => {
    const { service, createMany } = buildApplyPrisma();

    const err = await service
      .applyCriteriaForIssue('iss1', [{ content: 123 }] as any, 'u1')
      .catch((e) => e);

    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.response.code).toBe('VALIDATION_ERROR');
    expect(createMany).not.toHaveBeenCalled();
  });

  it('合法项正常落库；与存量同 content 去重记入 skipped', async () => {
    const { service, createMany, messageBus } = buildApplyPrisma(['已有标准A']);

    const result = await service.applyCriteriaForIssue(
      'iss1',
      [
        { content: '已有标准A' },
        { content: '  新标准B  ' },
        { content: '新标准C' },
      ],
      'u1',
    );

    expect(result.added).toBe(2);
    expect(result.skipped).toBe(1);
    expect(createMany).toHaveBeenCalledTimes(1);
    const data = createMany.mock.calls[0][0].data;
    expect(data[0].content).toBe('新标准B'); // trim 后落库
    expect(data[0].source).toBe('ai-generated');
    expect(messageBus.publish).toHaveBeenCalledWith(
      'acceptance.updated',
      expect.objectContaining({ added: 2, source: 'ai-generated' }),
    );
  });

  it('全部为重复项 → added=0 提前返回，不触发 createMany', async () => {
    const { service, createMany } = buildApplyPrisma(['标准A']);

    const result = await service.applyCriteriaForIssue(
      'iss1',
      [{ content: '标准A' }],
      'u1',
    );

    expect(result.added).toBe(0);
    expect(result.skipped).toBe(1);
    expect(createMany).not.toHaveBeenCalled();
  });
});

describe('AcceptanceService 决策卡选项倾向判定（CAP-A-27 decision_option）', () => {
  function makeReviewable() {
    return {
      id: 'acc1',
      issueId: 'iss1',
      status: 'in_review',
      completionType: 'artifact',
      priority: 'high',
      completionEvidence: {
        artifacts: [{ id: 'a1' }, { id: 'a2' }],
        autoChecks: { passed: 3, total: 4 },
      },
      metadata: { aiCompletionType: { type: 'artifact' } },
      issue: { title: '导出功能' },
      criteria: [
        { status: 'passed', severity: 'medium' },
        { status: 'pending', severity: 'critical' },
      ],
    };
  }

  function buildPrisma(acceptance: Record<string, unknown>) {
    return {
      acceptance: {
        findUnique: vi.fn(async () => acceptance),
        update: vi.fn(async ({ data }: any) => ({ ...acceptance, ...data })),
      },
    };
  }

  const JUDGE_OK = {
    model: 'jev-mock',
    answers: {
      decision_choice: {
        type: 'choice',
        choice: 'accept',
        confidence: 0.82,
        probabilities: { accept: 0.86, reject: 0.1, waive: 0.04 },
      },
    },
  };

  // 判定是 fire-and-forget：一个宏任务冲刷完微任务链后再断言
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('update 流转到 in_review → 触发判定并合并非覆盖回写 metadata.aiJudge', async () => {
    const acceptance = makeReviewable();
    const prisma = buildPrisma(acceptance);
    const { service, quickJudge } = buildDeps(prisma, {
      judge: vi.fn(async () => JUDGE_OK),
    });

    await service.update('acc1', { status: 'in_review' } as any);
    await flush();

    expect(quickJudge.judge).toHaveBeenCalledTimes(1);
    const [scenario, state] = (quickJudge.judge as any).mock.calls[0];
    expect(scenario).toBe('decision_option');
    // 防操纵边界：state 只含结构化字段，不含标准内容等自由文本
    expect(state).toContain('导出功能');
    expect(state).toContain('产物 2 项');
    expect(state).toContain('自动检查 3/4 通过');
    expect(state).toContain('critical 未过 1');

    const writeCall = prisma.acceptance.update.mock.calls.find(
      ([call]: any) => call?.data?.metadata,
    );
    expect(writeCall).toBeDefined();
    const aiJudge = writeCall[0].data.metadata.aiJudge;
    expect(aiJudge).toMatchObject({
      options: { accept: 0.86, reject: 0.1, waive: 0.04 },
      optionsChoice: 'accept',
      confidence: 0.82,
      advisory: true,
    });
    // 既有 metadata 键合并不覆盖
    expect(writeCall[0].data.metadata.aiCompletionType).toEqual({
      type: 'artifact',
    });
  });

  it('通道不可用（judge → null）→ 静默跳过不回写', async () => {
    const acceptance = makeReviewable();
    const prisma = buildPrisma(acceptance);
    const { service, quickJudge } = buildDeps(prisma);

    await service.update('acc1', { status: 'in_review' } as any);
    await flush();

    expect(quickJudge.judge).toHaveBeenCalledTimes(1);
    expect(
      prisma.acceptance.update.mock.calls.some(
        ([call]: any) => call?.data?.metadata,
      ),
    ).toBe(false);
  });

  it('非待决状态（draft/passed）流转不触发判定', async () => {
    const acceptance = { ...makeReviewable(), status: 'draft' };
    const prisma = buildPrisma(acceptance);
    const { service, quickJudge } = buildDeps(prisma, {
      judge: vi.fn(async () => JUDGE_OK),
    });

    await service.update('acc1', { priority: 'low' } as any);
    await flush();

    expect(quickJudge.judge).not.toHaveBeenCalled();
  });

  it('判定答案畸形（无 probabilities）→ 不回写 metadata', async () => {
    const acceptance = makeReviewable();
    const prisma = buildPrisma(acceptance);
    const { service } = buildDeps(prisma, {
      judge: vi.fn(async () => ({
        model: 'jev-mock',
        answers: { decision_choice: { type: 'choice', choice: 'accept' } },
      })),
    });

    await service.judgeDecisionOptions('acc1');

    expect(
      prisma.acceptance.update.mock.calls.some(
        ([call]: any) => call?.data?.metadata,
      ),
    ).toBe(false);
  });
});
