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
    task: { findUnique: jest.fn() },
    executionRun: { findUnique: jest.fn() },
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

  it('状态流转通知任务+项目订阅者，排除负责人与操作者（防双份）', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      title: '登录改版',
      projectId: 'p1',
      assigneeId: 'assignee-user',
      project: { id: 'p1', name: 'Apollo' },
    });

    await handlers.get('task.updated')!({
      taskId: 't1',
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

  it('优先级/截止日期变更推送 task.fieldChanged；普通变更不推送', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      title: 'x',
      projectId: 'p1',
      assigneeId: null,
      project: { id: 'p1', name: 'P' },
    });

    await handlers.get('task.updated')!({
      taskId: 't1',
      userId: 'actor',
      statusChanged: false,
      changedFields: ['priority', 'description'],
    });
    expect(createFromEvent).toHaveBeenCalledWith(
      'task.fieldChanged',
      expect.objectContaining({ fields: ['priority'] }),
      ['user-a', 'user-b'],
    );

    createFromEvent.mockClear();
    await handlers.get('task.updated')!({
      taskId: 't1',
      userId: 'actor',
      statusChanged: false,
      changedFields: ['description'],
    });
    expect(createFromEvent).not.toHaveBeenCalled();
  });

  it('评论事件推送 task.commented（排除评论人）', async () => {
    prismaMock.task.findUnique.mockResolvedValue({ title: '登录改版' });

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
    prismaMock.executionRun.findUnique.mockResolvedValue({
      id: 'run1',
      goal: '修复构建',
      projectId: 'p1',
      taskId: null,
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
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      title: 'x',
      projectId: 'p1',
      assigneeId: null,
      project: { id: 'p1', name: 'P' },
    });
    prismaMock.member.findMany.mockResolvedValue([{ userId: null }]);

    await handlers.get('task.updated')!({
      taskId: 't1',
      userId: 'actor',
      statusChanged: true,
      oldStatus: 'todo',
      newStatus: 'done',
    });

    expect(createFromEvent).not.toHaveBeenCalled();
  });
});
