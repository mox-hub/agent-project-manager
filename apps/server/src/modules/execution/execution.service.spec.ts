import { BadRequestException } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ApprovalService } from './approval.service';
import { ProposalService } from '../decision/proposal.service';

describe('ExecutionService 4d 状态机与人工门禁', () => {
  function makeService(run: Record<string, unknown>) {
    const approvalCreate = vi.fn().mockResolvedValue({ id: 'ap-1' });
    const executionUpdate = vi.fn((opts: { data?: Record<string, unknown> }) =>
      Promise.resolve({ ...run, ...(opts?.data ?? {}) }),
    );
    const prisma = {
      execution: {
        findUnique: vi.fn().mockResolvedValue(run),
        update: executionUpdate,
      },
      approvalRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const approvalService = {
      createApprovalRequest: approvalCreate,
    } as unknown as ApprovalService;
    const svc = new ExecutionService(
      prisma as any,
      { setContext: vi.fn(), log: vi.fn() } as any,
      { publish: vi.fn() } as any,
      { checkSpendOnRunComplete: vi.fn() } as unknown as ProposalService,
      approvalService,
    );
    return { svc, approvalCreate };
  }

  const baseRun = {
    id: 'exec-1',
    projectId: 'p1',
    issueId: 'i1',
    subjectType: 'human',
    status: 'in_progress',
    title: '实现登录',
    goal: '实现登录',
    createdBy: 'u1',
  };

  it('禁止跳步：in_progress → draft 拒绝', async () => {
    const { svc } = makeService(baseRun);
    await expect(
      svc.updateExecutionRun('exec-1', { status: 'draft' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('人工执行未经 pending_approval 不可直接 completed', async () => {
    const { svc } = makeService(baseRun);
    await expect(
      svc.updateExecutionRun('exec-1', { status: 'completed' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('人工执行进入 pending_approval 时自动创建审批单', async () => {
    const { svc, approvalCreate } = makeService(baseRun);
    await svc.updateExecutionRun('exec-1', { status: 'pending_approval' });
    expect(approvalCreate).toHaveBeenCalledTimes(1);
    expect(approvalCreate.mock.calls[0][0]).toMatchObject({
      executionRunId: 'exec-1',
      issueId: 'i1',
      actionType: 'execution_completion',
    });
  });

  it('AI 执行不受人工门禁限制（in_progress → completed 直通）', async () => {
    const { svc } = makeService({
      ...baseRun,
      subjectType: 'platform_ai_member',
    });
    const updated = await svc.updateExecutionRun('exec-1', {
      status: 'completed',
    });
    expect(updated.status).toBe('completed');
  });
});

describe('ExecutionService 人工执行审计闸门提示（CAP-B-08 二期）', () => {
  function makeCreateService(options: {
    auditReport?: { riskLevel: string; blockedItems: unknown[] } | null;
  }) {
    const createdRun = {
      id: 'exec-new',
      projectId: 'p1',
      issueId: 'i1',
      subjectType: 'human',
      status: 'draft',
      title: '实现登录',
      goal: '实现登录',
      acceptanceId: 'acc1',
    };
    const prisma = {
      issue: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'i1', projectId: 'p1', title: '任务' }),
      },
      memberProjectBinding: {
        findFirst: vi.fn().mockResolvedValue({ id: 'bind1' }),
      },
      acceptance: {
        // ensureActiveAcceptance：已有活契约时直接复用（不走 create 分支）
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: 'acc1', status: 'in_review' }),
      },
      execution: {
        // 单活跃互斥查询：默认无活跃执行（放行）
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdRun),
      },
      completenessAuditReport: {
        findUnique: vi.fn().mockResolvedValue(options.auditReport ?? null),
      },
    };
    const svc = new ExecutionService(
      prisma as any,
      { setContext: vi.fn(), log: vi.fn() } as any,
      { publish: vi.fn() } as any,
      { checkSpendOnRunComplete: vi.fn() } as unknown as ProposalService,
      { createApprovalRequest: vi.fn() } as unknown as ApprovalService,
    );
    return { svc, prisma };
  }

  const humanInput = {
    title: '实现登录',
    subjectType: 'human' as const,
    subjectId: 'm1',
  };

  it('活契约审计 red：响应带 auditWarning 黄牌（不阻断创建）', async () => {
    const { svc, prisma } = makeCreateService({
      auditReport: { riskLevel: 'red', blockedItems: [{}, {}, {}] },
    });
    const result = await svc.createIssueExecution('i1', humanInput);

    expect(result.auditWarning).toContain('3 个强阻断项');
    expect(prisma.completenessAuditReport.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { acceptanceId: 'acc1' } }),
    );
    expect(result.status).toBe('draft');
  });

  it('无审计报告或非 red：无 auditWarning', async () => {
    const { svc } = makeCreateService({ auditReport: null });
    const none = await svc.createIssueExecution('i1', humanInput);
    expect(none.auditWarning).toBeUndefined();

    const { svc: yellowSvc } = makeCreateService({
      auditReport: { riskLevel: 'yellow', blockedItems: [{}] },
    });
    const yellow = await yellowSvc.createIssueExecution('i1', humanInput);
    expect(yellow.auditWarning).toBeUndefined();
  });

  it('AI 执行项路径不查审计报告（dispatch 侧已覆盖）', async () => {
    const { svc, prisma } = makeCreateService({
      auditReport: { riskLevel: 'red', blockedItems: [{}] },
    });
    await svc.createIssueExecution('i1', {
      ...humanInput,
      subjectType: 'platform_ai_member',
      subjectId: 'ai1',
    });
    expect(prisma.completenessAuditReport.findUnique).not.toHaveBeenCalled();
  });
});

describe('ExecutionService 单活跃互斥（需求重审 G5，2026-09-17 裁决 B）', () => {
  const dto = {
    projectId: 'p1',
    issueId: 'i1',
    subjectType: 'human' as const,
    subjectId: 'u1',
    goal: '实现登录',
    acceptanceId: 'acc1',
    createdBy: 'u1',
  };

  function makeMutexService(active: Record<string, unknown> | null) {
    const prisma = {
      execution: {
        findFirst: vi.fn().mockResolvedValue(active),
        create: vi
          .fn()
          .mockResolvedValue({ id: 'exec-new', status: 'planned' }),
      },
    };
    const svc = new ExecutionService(
      prisma as any,
      { setContext: vi.fn(), log: vi.fn() } as any,
      { publish: vi.fn() } as any,
      { checkSpendOnRunComplete: vi.fn() } as unknown as ProposalService,
      { createApprovalRequest: vi.fn() } as unknown as ApprovalService,
    );
    return { svc, prisma };
  }

  it('已有活跃执行时拒绝新建并引导先取消（P1-21 指路：ID+取消途径+重新执行出口）', async () => {
    const { svc, prisma } = makeMutexService({
      id: 'exec-1',
      title: '实现登录',
      status: 'in_progress',
    });
    await expect((svc as any).createExecutionRun(dto)).rejects.toThrow(
      BadRequestException,
    );
    await expect((svc as any).createExecutionRun(dto)).rejects.toThrow(
      /重新执行/,
    );
    // P1-21：错误信息必须可执行——指名活跃执行 ID 与两条取消途径
    await expect((svc as any).createExecutionRun(dto)).rejects.toThrow(
      /exec-1/,
    );
    await expect((svc as any).createExecutionRun(dto)).rejects.toThrow(
      /执行详情「取消执行」/,
    );
    await expect((svc as any).createExecutionRun(dto)).rejects.toThrow(
      /POST \/_api\/ai\/execution-runs\/exec-1\/cancel/,
    );
    expect(prisma.execution.create).not.toHaveBeenCalled();
  });

  it('活跃词表与 issue.service 关单守卫一致（planned/in_progress/pending_approval/blocked）', async () => {
    const { svc, prisma } = makeMutexService(null);
    await (svc as any).createExecutionRun(dto);
    expect(prisma.execution.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          issueId: 'i1',
          status: {
            in: ['planned', 'in_progress', 'pending_approval', 'blocked'],
          },
        }),
      }),
    );
    expect(prisma.execution.create).toHaveBeenCalledTimes(1);
  });

  it('无关联工单的执行不参与互斥（如纯工作区级执行）', async () => {
    const { svc, prisma } = makeMutexService({
      id: 'exec-1',
      title: 'x',
      status: 'in_progress',
    });
    await (svc as any).createExecutionRun({ ...dto, issueId: undefined });
    expect(prisma.execution.findFirst).not.toHaveBeenCalled();
    expect(prisma.execution.create).toHaveBeenCalledTimes(1);
  });
});

describe('ExecutionService G5-b worktree 成果收集（completeExecution 成功路径）', () => {
  const isolation = {
    mode: 'worktree',
    worktreePath: 'E:\\repo\\.apm\\worktrees\\abcd1234',
    branch: 'apm/exec/abcd1234',
    baseRef: 'base_sha',
    projectRoot: 'E:\\repo',
    preparedAt: '2026-10-01T00:00:00.000Z',
  };

  function integrationUpdateCalls(svc: unknown): any[][] {
    const calls = (svc as any).prisma.execution.update.mock.calls as any[][];
    return calls.filter((c) => (c[0]?.data?.metadata as any)?.integration);
  }

  function makeCollectService(
    options: {
      runMetadata?: Record<string, unknown>;
      changes?: Record<string, unknown> | null;
      dirty?: string[];
      collectError?: Error;
    } = {},
  ) {
    const run = {
      id: 'exec_abcd1234zzzz',
      projectId: 'p1',
      issueId: 'i1',
      subjectType: 'platform_ai_member',
      subjectId: 'mem_1',
      status: 'in_progress',
      goal: 'g',
      metadata: options.runMetadata ?? { isolation },
    };
    const prisma = {
      execution: {
        findUnique: vi.fn().mockResolvedValue(run),
        update: vi
          .fn()
          .mockImplementation((opts?: { data?: Record<string, unknown> }) =>
            Promise.resolve({ ...run, ...(opts?.data ?? {}) }),
          ),
      },
      aIUsageLog: { findMany: vi.fn().mockResolvedValue([]) },
      issue: { findUnique: vi.fn().mockResolvedValue({ title: '实现登录页' }) },
      member: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ displayName: 'Coder', email: 'coder@apm.test' }),
      },
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      approvalRequest: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const createIntegrationProposal = vi
      .fn()
      .mockResolvedValue({ id: 'prop-1' });
    const proposalService = {
      checkSpendOnRunComplete: vi.fn(),
      createIntegrationProposal,
    } as unknown as ProposalService;
    const worktree = {
      collectChanges: vi.fn().mockImplementation(
        options.collectError
          ? async () => {
              throw options.collectError;
            }
          : async () =>
              options.changes ?? {
                hasChanges: false,
                commitCount: 0,
                diffStat: '',
                insertions: 0,
                deletions: 0,
                files: [],
                headRef: 'head_sha',
              },
      ),
      cleanup: vi.fn().mockResolvedValue(undefined),
      mainWorkspaceDirtyFiles: vi.fn().mockResolvedValue(options.dirty ?? []),
    };
    const svc = new ExecutionService(
      prisma as any,
      { setContext: vi.fn(), log: vi.fn(), warn: vi.fn() } as any,
      { publish: vi.fn() } as any,
      proposalService,
      { createApprovalRequest: vi.fn() } as unknown as ApprovalService,
      worktree as any,
    );
    return { svc, worktree, createIntegrationProposal, prisma };
  }

  it('空变更：直接清理现场 + integration=no-changes，不发卡', async () => {
    const { svc, worktree, createIntegrationProposal } = makeCollectService();

    await svc.completeExecution('exec_abcd1234zzzz', { summary: 'done' });

    expect(worktree.cleanup).toHaveBeenCalledWith(
      'E:\\repo',
      'E:\\repo\\.apm\\worktrees\\abcd1234',
      'apm/exec/abcd1234',
      { force: true },
    );
    expect(createIntegrationProposal).not.toHaveBeenCalled();
    const metadataCalls = integrationUpdateCalls(svc);
    expect(metadataCalls.length).toBe(1);
    expect(metadataCalls[0][0].data.metadata.integration.status).toBe(
      'no-changes',
    );
  });

  it('有变更：补快照 commit（author 取成员邮箱）+ 创建 integration 决策卡 + pending-review 记账', async () => {
    const { svc, worktree, createIntegrationProposal } = makeCollectService({
      changes: {
        hasChanges: true,
        commitCount: 2,
        diffStat: ' a.ts | 5 ++++\n 1 file changed, 5 insertions(+)',
        insertions: 5,
        deletions: 0,
        files: ['a.ts', 'b.ts'],
        headRef: 'head_sha',
      },
      dirty: ['M notes.md'],
    });

    await svc.completeExecution('exec_abcd1234zzzz', { summary: 'done' });

    expect(worktree.collectChanges).toHaveBeenCalledWith(
      'E:\\repo\\.apm\\worktrees\\abcd1234',
      'base_sha',
      expect.objectContaining({
        message: 'chore(apm): execution 1234zzzz snapshot',
        author: { name: 'Coder', email: 'coder@apm.test' },
      }),
    );
    expect(createIntegrationProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: 'exec_abcd1234zzzz',
        issueId: 'i1',
        projectId: 'p1',
        branch: 'apm/exec/abcd1234',
        headRef: 'head_sha',
        insertions: 5,
        files: ['a.ts', 'b.ts'],
        mainDirty: ['M notes.md'],
        taskTitle: '实现登录页',
      }),
    );
    const metadataCalls = integrationUpdateCalls(svc);
    expect(metadataCalls[0][0].data.metadata.integration).toEqual(
      expect.objectContaining({
        status: 'pending-review',
        proposalId: 'prop-1',
      }),
    );
  });

  it('非 worktree 执行（shared-root / 无 isolation）不触发收集', async () => {
    const sharedRoot = makeCollectService({
      runMetadata: {
        isolation: { mode: 'shared-root', reason: 'not-git-repo' },
      },
    });
    await sharedRoot.svc.completeExecution('exec_abcd1234zzzz', {});
    expect(sharedRoot.worktree.collectChanges).not.toHaveBeenCalled();
    expect(sharedRoot.createIntegrationProposal).not.toHaveBeenCalled();

    const noMeta = makeCollectService({ runMetadata: {} });
    await noMeta.svc.completeExecution('exec_abcd1234zzzz', {});
    expect(noMeta.worktree.collectChanges).not.toHaveBeenCalled();
    expect(noMeta.createIntegrationProposal).not.toHaveBeenCalled();
  });

  it('已有 integration 记账（重复完成回调）幂等跳过', async () => {
    const { svc, worktree, createIntegrationProposal } = makeCollectService({
      runMetadata: {
        isolation,
        integration: { status: 'pending-review', proposalId: 'prop-0' },
      },
    });

    await svc.completeExecution('exec_abcd1234zzzz', {});

    expect(worktree.collectChanges).not.toHaveBeenCalled();
    expect(createIntegrationProposal).not.toHaveBeenCalled();
  });

  it('收集失败不阻断完成主流程，落 integration=error 留痕', async () => {
    const { svc } = makeCollectService({
      collectError: new Error('git boom'),
    });

    const run = await svc.completeExecution('exec_abcd1234zzzz', {});

    expect(run.status).toBe('completed');
    const metadataCalls = integrationUpdateCalls(svc);
    expect(metadataCalls[0][0].data.metadata.integration).toEqual(
      expect.objectContaining({ status: 'error', reason: 'git boom' }),
    );
  });
});

describe('ExecutionService G5-b 取消即时清理（cancelExecution）', () => {
  function makeCancelService(runMetadata: Record<string, unknown>) {
    const run = {
      id: 'exec-1',
      projectId: 'p1',
      issueId: 'i1',
      subjectType: 'external_agent',
      subjectId: 'u1',
      status: 'in_progress',
      goal: 'g',
      metadata: runMetadata,
    };
    const prisma = {
      execution: {
        findUnique: vi.fn().mockResolvedValue(run),
        update: vi.fn().mockResolvedValue(run),
      },
      approvalRequest: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const worktree = { cleanup: vi.fn().mockResolvedValue(undefined) };
    const svc = new ExecutionService(
      prisma as any,
      { setContext: vi.fn(), log: vi.fn(), warn: vi.fn() } as any,
      { publish: vi.fn() } as any,
      { checkSpendOnRunComplete: vi.fn() } as unknown as ProposalService,
      { createApprovalRequest: vi.fn() } as unknown as ApprovalService,
      worktree as any,
    );
    return { svc, worktree, prisma };
  }

  it('worktree 执行取消：force 清理 + isolation.cleanedAt 回填 + cancellationReason 保留', async () => {
    const { svc, worktree, prisma } = makeCancelService({
      isolation: {
        mode: 'worktree',
        worktreePath: 'E:\\repo\\.apm\\worktrees\\abcd1234',
        branch: 'apm/exec/abcd1234',
        baseRef: 'base_sha',
        projectRoot: 'E:\\repo',
        preparedAt: '2026-10-01T00:00:00.000Z',
      },
    });

    await svc.cancelExecution('exec-1', '用户取消');

    expect(worktree.cleanup).toHaveBeenCalledWith(
      'E:\\repo',
      'E:\\repo\\.apm\\worktrees\\abcd1234',
      'apm/exec/abcd1234',
      { force: true },
    );
    const metadata = prisma.execution.update.mock.calls[0][0].data.metadata;
    expect(metadata.cancellationReason).toBe('用户取消');
    expect(metadata.isolation.cleanedAt).toBeTruthy();
    expect(metadata.isolation.mode).toBe('worktree');
  });

  it('无 isolation 的执行取消：行为与既有语义一致（仅 cancellationReason）', async () => {
    const { svc, worktree, prisma } = makeCancelService({});

    await svc.cancelExecution('exec-1', '用户取消');

    expect(worktree.cleanup).not.toHaveBeenCalled();
    expect(prisma.execution.update.mock.calls[0][0].data.metadata).toEqual({
      cancellationReason: '用户取消',
    });
  });
});
