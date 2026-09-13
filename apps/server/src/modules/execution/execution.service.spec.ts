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
