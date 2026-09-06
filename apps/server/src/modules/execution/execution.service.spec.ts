import { BadRequestException } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ApprovalService } from './approval.service';
import { ProposalService } from '../decision/proposal.service';

describe('ExecutionService 4d 状态机与人工门禁', () => {
  function makeService(run: Record<string, unknown>) {
    const approvalCreate = jest.fn().mockResolvedValue({ id: 'ap-1' });
    const executionUpdate = jest.fn(
      (opts: { data?: Record<string, unknown> }) =>
        Promise.resolve({ ...run, ...(opts?.data ?? {}) }),
    );
    const prisma = {
      execution: {
        findUnique: jest.fn().mockResolvedValue(run),
        update: executionUpdate,
      },
      approvalRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const approvalService = {
      createApprovalRequest: approvalCreate,
    } as unknown as ApprovalService;
    const svc = new ExecutionService(
      prisma as any,
      { setContext: jest.fn(), log: jest.fn() } as any,
      { publish: jest.fn() } as any,
      { checkSpendOnRunComplete: jest.fn() } as unknown as ProposalService,
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
