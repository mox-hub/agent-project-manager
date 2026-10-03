import { ApprovalService } from './approval.service';

/** CAP-A-27 P0-A：审批创建时的 AI 风险定级 advisory——advisory 不拦截、降级零影响 */

function buildDeps(
  overrides: { judgeResult?: Record<string, any> | null } = {},
) {
  const state = {
    executionRun: {
      id: 'run1',
      projectId: 'p1',
      goal: '完成登录链路回归',
    } as Record<string, any> | null,
    approvals: [] as Array<Record<string, any>>,
    updates: [] as Array<{ id: string; data: Record<string, any> }>,
  };

  const prisma = {
    execution: {
      findUnique: vi.fn(async () => state.executionRun),
      update: vi.fn(async ({ where, data }: any) => ({
        id: where.id,
        ...data,
      })),
    },
    approvalRequest: {
      create: vi.fn(async ({ data }: any) => {
        const row = {
          id: `appr-${state.approvals.length + 1}`,
          metadata: null,
          status: 'pending',
          ...data,
        };
        state.approvals.push(row);
        return row;
      }),
      findUnique: vi.fn(
        async ({ where }: any) =>
          state.approvals.find((a) => a.id === where.id) ?? null,
      ),
      update: vi.fn(async ({ where, data }: any) => {
        state.updates.push({ id: where.id, data });
        const row = state.approvals.find((a) => a.id === where.id);
        if (row) row.metadata = data.metadata;
        return row;
      }),
    },
  };
  const logger = { setContext: vi.fn(), warn: vi.fn(), log: vi.fn() };
  const messageBus = { publish: vi.fn() };
  const quickJudge = {
    judge: vi.fn(async () => overrides.judgeResult ?? null),
  };

  const service = new ApprovalService(
    prisma as any,
    logger as any,
    messageBus as any,
    quickJudge as any,
  );
  return { service, prisma, state, quickJudge, logger };
}

const DTO = {
  executionRunId: 'run1',
  projectId: 'p1',
  requestedAction: '提交工单「登录链路回归」的验收申请',
  actionType: 'execution_completion',
  riskLevel: 'medium',
};

describe('ApprovalService.createApprovalRequest 的 AI 风险定级 advisory（CAP-A-27）', () => {
  const JUDGE_OK = {
    scenario: 'approval_risk',
    model: 'jev-1.13-free',
    answers: {
      risk_level: {
        type: 'choice',
        choice: 'write',
        confidence: 0.63,
        probabilities: { read: 0.1, write: 0.75, high_risk: 0.15 },
      },
      safe_to_auto_approve: { type: 'noul', noul: 0.44 },
    },
    usage: { inputTokens: 475, outputTokens: 59 },
  };

  it('judge 成功 → 结果回写 metadata.aiJudge（advisory=true），审批照常创建', async () => {
    const { service, state, quickJudge } = buildDeps({ judgeResult: JUDGE_OK });

    const approval = await service.createApprovalRequest(DTO, 'user1');
    // fire-and-forget：等待微任务队列排空
    await new Promise((r) => setTimeout(r, 0));

    expect(approval.status).toBe('pending');
    expect(state.approvals[0].riskLevel).toBe('medium'); // 落库值不变（advisory 不改判定）
    expect(quickJudge.judge).toHaveBeenCalledTimes(1);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].id).toBe(approval.id);
    const aiJudge = (state.approvals[0].metadata as any).aiJudge;
    expect(aiJudge).toMatchObject({
      riskLevel: 'write',
      confidence: 0.63,
      safeToAutoApprove: 0.44,
      model: 'jev-1.13-free',
      advisory: true,
    });
  });

  it('judge 返回 null（未启用/失败）→ 审批照建、零回写、零异常', async () => {
    const { service, state, quickJudge } = buildDeps({ judgeResult: null });

    const approval = await service.createApprovalRequest(DTO, 'user1');
    await new Promise((r) => setTimeout(r, 0));

    expect(approval.id).toBe('appr-1');
    expect(state.updates).toHaveLength(0);
    expect(quickJudge.judge).toHaveBeenCalledTimes(1);
  });

  it('judge 抛异常 → 不影响创建主流程（fire-and-forget 吞错）', async () => {
    const { service, quickJudge } = buildDeps();
    (quickJudge.judge as ReturnType<typeof vi.fn>).mockImplementation(
      async () => {
        throw new Error('boom');
      },
    );

    const approval = await service.createApprovalRequest(DTO, 'user1');
    await new Promise((r) => setTimeout(r, 0));

    expect(approval.id).toBe('appr-1');
  });

  it('judge 返回畸形 answers → 不回写（提取器容错为 null）', async () => {
    const { service, state } = buildDeps({
      judgeResult: {
        ...JUDGE_OK,
        answers: {
          risk_level: { type: 'noul', noul: 0.1 },
          safe_to_auto_approve: { type: 'choice', choice: 'x' },
        },
      },
    });

    await service.createApprovalRequest(DTO, 'user1');
    await new Promise((r) => setTimeout(r, 0));

    expect(state.updates).toHaveLength(0);
  });

  it('回写保留既有 metadata（合并不覆盖）', async () => {
    const { service, state, prisma } = buildDeps({ judgeResult: JUDGE_OK });
    (
      prisma.approvalRequest.create as ReturnType<typeof vi.fn>
    ).mockImplementation(async ({ data }: any) => {
      const row = {
        id: 'appr-x',
        status: 'pending',
        metadata: { source: 'manual' },
        ...data,
      };
      state.approvals.push(row);
      return row;
    });

    await service.createApprovalRequest(DTO, 'user1');
    await new Promise((r) => setTimeout(r, 0));

    const meta = state.approvals[0].metadata as any;
    expect(meta.source).toBe('manual');
    expect(meta.aiJudge.advisory).toBe(true);
  });
});
