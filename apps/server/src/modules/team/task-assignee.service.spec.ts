import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaskAssigneeService } from './task-assignee.service';
import { PrismaService } from '../../core/database/prisma.service';
import { CliResolutionService } from '../cli-dispatch/cli-resolution.service';
import { CliDispatchService } from '../cli-dispatch/dispatch.service';

describe('TaskAssigneeService', () => {
  let service: TaskAssigneeService;

  const mockPrisma = {
    task: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    member: {
      findUnique: jest.fn(),
    },
    taskAssignee: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    taskWatcher: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    taskActivity: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAssigneeService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: CliResolutionService,
          useValue: { resolveForMember: jest.fn() },
        },
        {
          provide: CliDispatchService,
          useValue: { dispatchTaskToCli: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<TaskAssigneeService>(TaskAssigneeService);
    jest.clearAllMocks();
  });

  describe('add', () => {
    it('throws when task missing', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);
      await expect(
        service.add({ taskId: 't1', memberId: 'm1' } as any, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates assignee and syncs task.assigneeId for human member', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
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
      mockPrisma.taskAssignee.findUnique.mockResolvedValue(null);
      mockPrisma.taskAssignee.create.mockResolvedValue({ id: 'a1' });

      await service.add(
        { taskId: 't1', memberId: 'm1', role: 'assignee' } as any,
        'u1',
      );

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't1' },
          data: expect.objectContaining({
            assigneeId: 'u9',
            assigneeType: 'user',
          }),
        }),
      );
      expect(mockPrisma.taskActivity.create).toHaveBeenCalled();
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('calls update for any role including reviewer', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
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
      mockPrisma.taskAssignee.findFirst.mockResolvedValue(null);
      mockPrisma.taskAssignee.create.mockResolvedValue({ id: 'a1' });

      await service.add(
        { taskId: 't1', memberId: 'm1', role: 'reviewer' } as any,
        'u1',
      );
      // Update is always called to sync primary assignee
      expect(mockPrisma.task.update).toHaveBeenCalled();
    });
  });

  describe('bulkSet', () => {
    it('clears existing assignees and creates new ones', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 't1',
        projectId: 'p1',
      });
      mockPrisma.taskAssignee.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.taskAssignee.create.mockResolvedValue({ id: 'a1' });
      mockPrisma.member.findUnique.mockResolvedValue({
        id: 'm1',
        type: 'human',
        userId: 'u9',
      });
      await service.bulkSet(
        { taskId: 't1', assignees: [{ memberId: 'm1', role: 'assignee' }] },
        'u1',
      );
      expect(mockPrisma.taskAssignee.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.taskAssignee.create).toHaveBeenCalled();
    });
  });

  describe('getMemberLoad', () => {
    it('aggregates counts by status', async () => {
      mockPrisma.taskAssignee.count
        .mockResolvedValueOnce(3) // todo
        .mockResolvedValueOnce(2) // inProgress
        .mockResolvedValueOnce(5); // completed
      const r = await service.getMemberLoad('m1');
      expect(r).toEqual({ todo: 3, inProgress: 2, completed: 5, total: 10 });
    });
  });
});
