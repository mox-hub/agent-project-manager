import { Test } from '@nestjs/testing';
import { NotificationEventSubscriber } from './notification-event-subscriber';
import { NotificationService } from './notification.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';

describe('NotificationEventSubscriber', () => {
  let subscriber: NotificationEventSubscriber;
  let createFromEvent: jest.Mock;
  let handlers: Map<string, (payload: unknown) => Promise<void>>;

  const prismaMock = {
    issue: {
      findUnique: jest.fn(),
    },
    document: { findUnique: jest.fn() },
    acceptance: { findUnique: jest.fn() },
    project: { findUnique: jest.fn() },
    member: { findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeEach(async () => {
    handlers = new Map();
    createFromEvent = jest.fn().mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationEventSubscriber,
        {
          provide: MessageBusService,
          useValue: {
            subscribe: jest.fn((event: string, handler: never) => {
              handlers.set(event, handler);
            }),
            publish: jest.fn(),
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
    ]) {
      expect(handlers.has(event)).toBe(true);
    }
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

    await handlers.get('task.updated')!({ issueId: 't1', statusChanged: false });
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
});
