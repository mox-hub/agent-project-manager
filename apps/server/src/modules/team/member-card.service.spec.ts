import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MemberCardService } from './member-card.service';
import { PrismaService } from '../../core/database/prisma.service';
import { TaskAssigneeService } from './task-assignee.service';

describe('MemberCardService', () => {
  let service: MemberCardService;

  const mockPrisma = {
    member: {
      findUnique: jest.fn(),
    },
    memberProjectBinding: {
      findMany: jest.fn(),
    },
    teamMember: {
      findMany: jest.fn(),
    },
    memberActivity: {
      findMany: jest.fn(),
    },
  };

  const mockTaskAssignee = {
    getMemberLoad: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberCardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TaskAssigneeService, useValue: mockTaskAssignee },
      ],
    }).compile();
    service = module.get<MemberCardService>(MemberCardService);
    jest.clearAllMocks();
  });

  it('throws when member not found', async () => {
    mockPrisma.member.findUnique.mockResolvedValue(null);
    await expect(service.getCard('m1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('builds aggregate card from binding/team/load/activity', async () => {
    mockPrisma.member.findUnique.mockResolvedValue({
      id: 'm1',
      type: 'human',
      displayName: 'Alice',
      handle: 'alice',
      email: 'a@x.com',
      avatarUrl: null,
      status: 'active',
      metadata: null,
      userId: 'u1',
      aiModelConfigId: null,
    });
    mockPrisma.memberProjectBinding.findMany.mockResolvedValue([
      {
        projectId: 'p1',
        role: 'maintainer',
      },
    ]);
    mockPrisma.teamMember.findMany.mockResolvedValue([
      { teamId: 't1', role: 'owner' },
    ]);

    const card = await service.getCard('m1');
    expect(card.id).toBe('m1');
    expect(card.displayName).toBe('Alice');
    expect(card.projects).toHaveLength(1);
    expect(card.teams).toHaveLength(1);
    expect(card.aiModelConfigId).toBeNull();
  });

  it('handles null optional fields', async () => {
    mockPrisma.member.findUnique.mockResolvedValue({
      id: 'm1',
      type: 'human',
      displayName: 'A',
      handle: 'a',
      email: null,
      avatarUrl: null,
      status: 'active',
      metadata: null,
      userId: 'u1',
      aiModelConfigId: null,
    });
    mockPrisma.memberProjectBinding.findMany.mockResolvedValue([]);
    mockPrisma.teamMember.findMany.mockResolvedValue([]);

    const card = await service.getCard('m1');
    expect(card.metadata).toBeNull();
    expect(card.aiModelConfigId).toBeNull();
    expect(card.projects).toHaveLength(0);
    expect(card.teams).toHaveLength(0);
  });

  it('getCardBatch skips null entries', async () => {
    mockPrisma.member.findUnique
      .mockResolvedValueOnce(null) // first card throws
      .mockResolvedValueOnce({
        id: 'm2',
        type: 'human',
        displayName: 'B',
        handle: 'b',
        email: null,
        avatarUrl: null,
        status: 'active',
        metadata: null,
        userId: 'u2',
        aiModelConfigId: null,
      });
    mockPrisma.memberProjectBinding.findMany.mockResolvedValue([]);
    mockPrisma.teamMember.findMany.mockResolvedValue([]);

    const r = await service.getCardBatch(['m1', 'm2']);
    expect(r).toHaveLength(1);
    expect((r as any)[0].id).toBe('m2');
  });
});
