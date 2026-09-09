import type { Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IssueAssigneeService } from './issue-assignee.service';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { CliResolutionService } from '../cli-dispatch/cli-resolution.service';
import { CliDispatchService } from '../cli-dispatch/dispatch.service';

describe('IssueAssigneeService', () => {
  let service: IssueAssigneeService;
  let messageBus: { publish: Mock };

  const mockPrisma = {
    issue: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    member: {
      findUnique: vi.fn(),
    },
    issueAssignee: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    issueWatcher: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    issueActivity: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssueAssigneeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MessageBusService, useValue: { publish: vi.fn() } },
        {
          provide: CliResolutionService,
          useValue: { resolveForMember: vi.fn() },
        },
        {
          provide: CliDispatchService,
          useValue: { dispatchTaskToCli: vi.fn() },
        },
      ],
    }).compile();
    service = module.get<IssueAssigneeService>(IssueAssigneeService);
    messageBus = module.get<MessageBusService>(
      MessageBusService,
    ) as unknown as { publish: Mock };
    vi.clearAllMocks();
  });

  describe('add', () => {
    it('throws when task missing', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue(null);
      await expect(
        service.add({ issueId: 't1', memberId: 'm1' } as any, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates assignee and syncs task.assigneeId for human member', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue({
        id: 't1',
        projectId: 'p1',
        title: 'X',
      });
      mockPrisma.member.findUnique.mockResolvedValue({
        id: 'm1',
        type: 'human',
        userId: 'u9',
        displayName: 'Alice',
      });
      mockPrisma.issueAssignee.findUnique.mockResolvedValue(null);
      mockPrisma.issueAssignee.create.mockResolvedValue({ id: 'a1' });

      await service.add(
        { issueId: 't1', memberId: 'm1', role: 'assignee' } as any,
        'u1',
      );

      expect(mockPrisma.issue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't1' },
          data: expect.objectContaining({
            assigneeId: 'u9',
            assigneeType: 'user',
          }),
        }),
      );
      expect(mockPrisma.issueActivity.create).toHaveBeenCalled();
      // 通知走事件总线（订阅者统一落 Notification），不再直写 notification 表
      expect(messageBus.publish).toHaveBeenCalledWith(
        'task.assigned',
        expect.objectContaining({ issueId: 't1', assignedUserId: 'u9' }),
      );
    });

    it('calls update for any role including reviewer', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue({
        id: 't1',
        projectId: 'p1',
        title: 'X',
      });
      mockPrisma.member.findUnique.mockResolvedValue({
        id: 'm1',
        type: 'human',
        userId: 'u9',
        displayName: 'Alice',
      });
      mockPrisma.issueAssignee.findFirst.mockResolvedValue(null);
      mockPrisma.issueAssignee.create.mockResolvedValue({ id: 'a1' });

      await service.add(
        { issueId: 't1', memberId: 'm1', role: 'reviewer' } as any,
        'u1',
      );
      // Update is always called to sync primary assignee
      expect(mockPrisma.issue.update).toHaveBeenCalled();
    });
  });

  describe('bulkSet', () => {
    it('clears existing assignees and creates new ones', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue({
        id: 't1',
        projectId: 'p1',
      });
      mockPrisma.issueAssignee.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.issueAssignee.create.mockResolvedValue({ id: 'a1' });
      mockPrisma.member.findUnique.mockResolvedValue({
        id: 'm1',
        type: 'human',
        userId: 'u9',
      });
      await service.bulkSet(
        { issueId: 't1', assignees: [{ memberId: 'm1', role: 'assignee' }] },
        'u1',
      );
      expect(mockPrisma.issueAssignee.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.issueAssignee.create).toHaveBeenCalled();
    });
  });

  describe('getMemberLoad', () => {
    it('aggregates counts by status', async () => {
      mockPrisma.issue.findMany.mockResolvedValue([{ id: 't1' }]);
      mockPrisma.issueAssignee.count
        .mockResolvedValueOnce(3) // todo
        .mockResolvedValueOnce(2) // inProgress
        .mockResolvedValueOnce(5); // completed
      const r = await service.getMemberLoad('m1');
      expect(r).toEqual({ todo: 3, inProgress: 2, completed: 5, total: 10 });
    });
  });
});
