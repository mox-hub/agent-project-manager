import type { Mock } from 'vitest';
import { Test } from '@nestjs/testing';
import { NotificationEventSubscriber } from './notification-event-subscriber';
import { NotificationService } from './notification.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';

describe('NotificationEventSubscriber', () => {
  let subscriber: NotificationEventSubscriber;
  let createFromEvent: Mock;
  let handlers: Map<string, (payload: unknown) => Promise<void>>;

  const prismaMock = {
    issue: {
      findUnique: vi.fn(),
    },
    document: { findUnique: vi.fn() },
    acceptance: { findUnique: vi.fn() },
    project: { findUnique: vi.fn() },
    member: { findMany: vi.fn().mockResolvedValue([]) },
    execution: { findUnique: vi.fn() },
    subscription: { findMany: vi.fn().mockResolvedValue([]) },
    decisionProposal: { findUnique: vi.fn() },
  };

  beforeEach(async () => {
    handlers = new Map();
    createFromEvent = vi.fn().mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationEventSubscriber,
        {
          provide: MessageBusService,
          useValue: {
            subscribe: vi.fn((event: string, handler: never) => {
              handlers.set(event, handler);
            }),
            publish: vi.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: { createNotificationFromEvent: createFromEvent },
        },
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: LoggerService,
          useValue: { setContext: vi.fn(), log: vi.fn(), error: vi.fn() },
        },
      ],
    }).compile();

    subscriber = moduleRef.get(NotificationEventSubscriber);
    subscriber.onModuleInit();
  });

  it('订阅全部领域事件（含新增 task.deleted/document.*/member.*/acceptance.* 等）', () => {
    for (const event of [
      'task.created',
      'task.updated',
      'task.assigned',
      'task.deleted',
      'document.created',
      'document.deleted',
      'project.created',
      'project.archived',
      'member.created',
      'member.removed',
      'team.created',
      'team.archived',
      'acceptance.created',
      'acceptance.resolved',
      'acceptance.deleted',
      'milestone.created',
      'tag.created',
      'tag.deleted',
      'decision.proposal.created',
    ]) {
      expect(handlers.has(event)).toBe(true);
    }
  });

  it('死订阅已删除：ci.build.* / ai.workflow.completed 全库无发布方（P0-12）', () => {
    for (const dead of [
      'ci.build.failed',
      'ci.build.succeeded',
      'ai.workflow.completed',
    ]) {
      expect(handlers.has(dead)).toBe(false);
    }
  });

  it('decision.proposal.created 通知提案所属项目成员（排除提案人）', async () => {
    prismaMock.decisionProposal.findUnique.mockResolvedValue({
      id: 'dp1',
      kind: 'assignment',
      title: '将 3 个未分配任务分派给 AI 同事？',
      projectId: 'p1',
      issueId: null,
      proposerId: 'proposer',
    });
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      name: 'APM',
      members: [{ userId: 'u1' }, { userId: 'u2' }, { userId: 'proposer' }],
    });

    await handlers.get('decision.proposal.created')!({ proposalId: 'dp1' });

    expect(createFromEvent).toHaveBeenCalledWith(
      'decision.proposal.created',
      expect.objectContaining({
        proposalId: 'dp1',
        proposalTitle: '将 3 个未分配任务分派给 AI 同事？',
        kind: 'assignment',
        projectId: 'p1',
        projectName: 'APM',
      }),
      ['u1', 'u2'],
    );
  });

  it('decision.proposal.created 无 projectId 或提案不存在时不通知', async () => {
    prismaMock.decisionProposal.findUnique.mockResolvedValue(null);
    await handlers.get('decision.proposal.created')!({
      proposalId: 'ghost',
    }).catch(() => undefined);
    expect(createFromEvent).not.toHaveBeenCalled();

    prismaMock.decisionProposal.findUnique.mockResolvedValue({
      id: 'dp2',
      projectId: null,
    });
    await handlers.get('decision.proposal.created')!({ proposalId: 'dp2' });
    expect(createFromEvent).not.toHaveBeenCalled();
  });

  it('task.deleted 通知项目成员（排除操作者）', async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      members: [{ userId: 'u1' }, { userId: 'u2' }, { userId: 'actor' }],
    });

    await handlers.get('task.deleted')!({
      issueId: 't1',
      taskTitle: '旧任务',
      projectId: 'p1',
      userId: 'actor',
    });

    expect(createFromEvent).toHaveBeenCalledWith(
      'task.deleted',
      expect.objectContaining({ issueId: 't1', taskTitle: '旧任务' }),
      ['u1', 'u2'],
    );
  });

  it('task.updated 仅在状态流转时通知负责人（statusChanged 断链回归）', async () => {
    prismaMock.issue.findUnique.mockResolvedValue({
      id: 't1',
      assigneeId: 'assignee',
      project: { id: 'p1', name: 'P' },
    });

    await handlers.get('task.updated')!({
      issueId: 't1',
      statusChanged: false,
    });
    expect(createFromEvent).not.toHaveBeenCalled();

    await handlers.get('task.updated')!({
      issueId: 't1',
      statusChanged: true,
      oldStatus: 'todo',
      newStatus: 'done',
    });
    expect(createFromEvent).toHaveBeenCalledWith(
      'task.statusChanged',
      expect.objectContaining({ oldStatus: 'todo', newStatus: 'done' }),
      ['assignee'],
    );
  });

  it('task.assigned 优先 payload.assignedUserId（总线化改造回归）', async () => {
    prismaMock.issue.findUnique.mockResolvedValue({
      id: 't1',
      assigneeId: 'stale-assignee',
      project: { id: 'p1', name: 'P' },
    });

    await handlers.get('task.assigned')!({
      issueId: 't1',
      assignedUserId: 'fresh-user',
    });

    expect(createFromEvent).toHaveBeenCalledWith(
      'task.assigned',
      expect.objectContaining({ issueId: 't1' }),
      ['fresh-user'],
    );
  });

  it('member.removed 通知全工作区成员', async () => {
    prismaMock.member.findMany.mockResolvedValue([
      { userId: 'u1' },
      { userId: 'u2' },
      { userId: null },
    ]);

    await handlers.get('member.removed')!({
      memberId: 'm1',
      displayName: '张三',
    });

    expect(createFromEvent).toHaveBeenCalledWith(
      'member.removed',
      expect.objectContaining({ displayName: '张三' }),
      ['u1', 'u2'],
    );
  });

  it('订阅者异常不外抛（handler 吞错防事件总线连锁）', async () => {
    prismaMock.project.findUnique.mockRejectedValue(new Error('db down'));
    await expect(
      handlers.get('task.deleted')!({ issueId: 't1', projectId: 'p1' }),
    ).resolves.toBeUndefined();
  });

  // ─── 执行失败感知 / 审批挂起（兜底改造批 1）─────────────────

  const runRow = {
    id: 'run-1',
    goal: '修复登录 bug',
    projectId: 'p1',
    issueId: 'i1',
    createdBy: 'u-owner',
  };

  it('订阅执行状态变更与审批请求事件', () => {
    expect(handlers.has('execution.run.updated')).toBe(true);
    expect(handlers.has('approval.requested')).toBe(true);
  });

  it('execution.run.updated failed 通知发起人+负责人，排除已订阅用户', async () => {
    prismaMock.execution.findUnique.mockResolvedValue(runRow);
    prismaMock.issue.findUnique.mockResolvedValue({
      assignee: { id: 'u-assignee' },
    });
    // 订阅链路已覆盖 u-assignee（task 维度）→ 应被排除
    prismaMock.subscription.findMany.mockResolvedValue([
      { memberId: 'm-1' },
      { memberId: 'm-2' },
    ]);
    prismaMock.member.findMany.mockResolvedValue([
      { userId: 'u-assignee' },
      { userId: 'u-other' },
    ]);

    await handlers.get('execution.run.updated')!({
      executionRunId: 'run-1',
      previousStatus: 'in_progress',
      newStatus: 'failed',
    });

    expect(createFromEvent).toHaveBeenCalledWith(
      'execution.terminal',
      expect.objectContaining({ executionRunId: 'run-1', status: 'failed' }),
      ['u-owner'],
    );
  });

  it('completed 状态不发失败通知（完成态归订阅枢纽按订阅关系处理）', async () => {
    await handlers.get('execution.run.updated')!({
      executionRunId: 'run-1',
      previousStatus: 'in_progress',
      newStatus: 'completed',
    });
    expect(createFromEvent).not.toHaveBeenCalled();
  });

  it('approval.requested 通知发起人与负责人（执行事实性暂停）', async () => {
    prismaMock.execution.findUnique.mockResolvedValue(runRow);
    prismaMock.issue.findUnique.mockResolvedValue({
      assignee: { id: 'u-assignee' },
    });
    prismaMock.subscription.findMany.mockResolvedValue([]);

    await handlers.get('approval.requested')!({
      approvalRequestId: 'ap-1',
      executionRunId: 'run-1',
      projectId: 'p1',
      riskLevel: 'high_risk',
      requestedAction: 'git push',
    });

    expect(createFromEvent).toHaveBeenCalledWith(
      'approval.requested',
      expect.objectContaining({
        approvalRequestId: 'ap-1',
        riskLevel: 'high_risk',
      }),
      ['u-owner', 'u-assignee'],
    );
  });

  it('NOTIFY_EXECUTION_AUDIENCE=project 时通知项目全员', async () => {
    const prev = process.env.NOTIFY_EXECUTION_AUDIENCE;
    process.env.NOTIFY_EXECUTION_AUDIENCE = 'project';
    try {
      prismaMock.execution.findUnique.mockResolvedValue(runRow);
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        members: [{ userId: 'u1' }, { userId: 'u2' }],
      });
      prismaMock.subscription.findMany.mockResolvedValue([]);

      await handlers.get('execution.run.updated')!({
        executionRunId: 'run-1',
        previousStatus: 'in_progress',
        newStatus: 'failed',
      });

      expect(createFromEvent).toHaveBeenCalledWith(
        'execution.terminal',
        expect.anything(),
        ['u1', 'u2'],
      );
    } finally {
      if (prev === undefined) delete process.env.NOTIFY_EXECUTION_AUDIENCE;
      else process.env.NOTIFY_EXECUTION_AUDIENCE = prev;
    }
  });
});
