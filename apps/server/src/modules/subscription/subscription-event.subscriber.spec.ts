import { Test } from '@nestjs/testing';
import { SubscriptionEventSubscriber } from './subscription-event.subscriber';
import { NotificationService } from '../notification/notification.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';

describe('SubscriptionEventSubscriber', () => {
  let subscriber: SubscriptionEventSubscriber;
  let handlers: Map<string, (payload: unknown) => Promise<void>>;
  let createFromEvent: jest.Mock;

  const prismaMock = {
    subscription: { findMany: jest.fn() },
    member: { findMany: jest.fn() },
    issue: { findUnique: jest.fn() },
    execution: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    handlers = new Map();
    createFromEvent = jest.fn().mockResolvedValue([]);
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubscriptionEventSubscriber,
        {
          provide: MessageBusService,
          useValue: {
            subscribe: jest.fn((event: string, handler: never) =>
              handlers.set(event, handler),
            ),
          },
        },
        {
          provide: NotificationService,
          useValue: { createNotificationFromEvent: createFromEvent },
        },
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: LoggerService,
          useValue: { setContext: jest.fn(), log: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    subscriber = moduleRef.get(SubscriptionEventSubscriber);
    subscriber.onModuleInit();

    // 默认：task + project 两个 scope 各有订阅者，均为人类成员
    prismaMock.subscription.findMany.mockResolvedValue([
      { memberId: 'sub1' },
      { memberId: 'sub2' },
    ]);
    prismaMock.member.findMany.mockResolvedValue([
      { userId: 'user-a' },
      { userId: 'user-b' },
    ]);
  });

  it('状态流转通知任务+项目订阅者，排除负责人（防全域层双份）；操作者照常通知', async () => {
    prismaMock.issue.findUnique.mockResolvedValue({
      id: 't1',
      title: '登录改版',
      projectId: 'p1',
      assigneeId: 'assignee-user',
      project: { id: 'p1', name: 'Apollo' },
    });

    await handlers.get('task.updated')!({
      issueId: 't1',
      userId: 'actor',
      statusChanged: true,
      oldStatus: 'todo',
      newStatus: 'done',
    });

    expect(createFromEvent).toHaveBeenCalledWith(
      'task.statusChanged',
      expect.objectContaining({ newStatus: 'done', taskTitle: '登录改版' }),
      ['user-a', 'user-b'],
    );
  });

  it('操作者本人是订阅者时也收到通知（订阅=观察一切变动）', async () => {
    prismaMock.issue.findUnique.mockResolvedValue({
      id: 't1',
      title: '登录改版',
      projectId: 'p1',
      assigneeId: null,
      project: { id: 'p1', name: 'Apollo' },
    });
    // 订阅者解析结果包含操作者本人
    prismaMock.member.findMany.mockResolvedValue([
      { userId: 'actor' },
      { userId: 'user-b' },
    ]);

    await handlers.get('task.updated')!({
      issueId: 't1',
      userId: 'actor',
      statusChanged: false,
      changedFields: ['priority'],
    });

    expect(createFromEvent).toHaveBeenCalledWith(
      'task.fieldChanged',
      expect.objectContaining({ fields: ['priority'] }),
      ['actor', 'user-b'],
    );
  });

  it('任意字段变更推送 task.fieldChanged（status 同值提交被剔除、不空推）', async () => {
    prismaMock.issue.findUnique.mockResolvedValue({
      id: 't1',
      title: 'x',
      projectId: 'p1',
      assigneeId: null,
      project: { id: 'p1', name: 'P' },
    });

    await handlers.get('task.updated')!({
      issueId: 't1',
      userId: 'actor',
      statusChanged: false,
      changedFields: ['priority', 'description'],
    });
    expect(createFromEvent).toHaveBeenCalledWith(
      'task.fieldChanged',
      expect.objectContaining({ fields: ['priority', 'description'] }),
      ['user-a', 'user-b'],
    );

    createFromEvent.mockClear();
    // status 未实际流转（同值提交）→ 剔除后无字段 → 不推送
    await handlers.get('task.updated')!({
      issueId: 't1',
      userId: 'actor',
      statusChanged: false,
      changedFields: ['status'],
    });
    expect(createFromEvent).not.toHaveBeenCalled();
  });

  it('评论事件推送 task.commented（评论人本人订阅也通知）', async () => {
    prismaMock.issue.findUnique.mockResolvedValue({ title: '登录改版' });

    await handlers.get('task.commented')!({
      entityType: 'task',
      entityId: 't1',
      projectId: 'p1',
      actorId: 'actor',
      excerpt: '看起来不错',
    });

    expect(createFromEvent).toHaveBeenCalledWith(
      'task.commented',
      expect.objectContaining({ excerpt: '看起来不错' }),
      ['user-a', 'user-b'],
    );
  });

  it('执行终态（completed/failed）推送 execution.terminal；进行中不推', async () => {
    prismaMock.execution.findUnique.mockResolvedValue({
      id: 'run1',
      goal: '修复构建',
      projectId: 'p1',
      issueId: null,
    });

    await handlers.get('execution.run.updated')!({
      executionRunId: 'run1',
      previousStatus: 'in_progress',
      newStatus: 'in_progress',
    });
    expect(createFromEvent).not.toHaveBeenCalled();

    await handlers.get('execution.run.updated')!({
      executionRunId: 'run1',
      previousStatus: 'in_progress',
      newStatus: 'failed',
    });
    expect(createFromEvent).toHaveBeenCalledWith(
      'execution.terminal',
      expect.objectContaining({ status: 'failed', goal: '修复构建' }),
      ['user-a', 'user-b'],
    );
  });

  it('智能体订阅者（无 userId）被跳过', async () => {
    prismaMock.issue.findUnique.mockResolvedValue({
      id: 't1',
      title: 'x',
      projectId: 'p1',
      assigneeId: null,
      project: { id: 'p1', name: 'P' },
    });
    prismaMock.member.findMany.mockResolvedValue([{ userId: null }]);

    await handlers.get('task.updated')!({
      issueId: 't1',
      userId: 'actor',
      statusChanged: true,
      oldStatus: 'todo',
      newStatus: 'done',
    });

    expect(createFromEvent).not.toHaveBeenCalled();
  });
});
