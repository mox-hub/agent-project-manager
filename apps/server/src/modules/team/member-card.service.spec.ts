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
    project: {
      findMany: jest.fn(),
    },
    team: {
      findMany: jest.fn(),
    },
  };

  const mockTaskAssignee = {
    getMemberLoad: jest.fn(),
  };

  const baseMember = {
    id: 'm1',
    shortId: 'ab12cd34',
    type: 'human',
    displayName: 'Alice',
    handle: 'alice',
    email: 'a@x.com',
    avatarUrl: null,
    title: null,
    description: null,
    trustLevel: null,
    trustScore: null,
    personalPrompt: null,
    thinkingLevel: null,
    tags: null,
    status: 'active',
    userId: 'u1',
    metadata: null,
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
    mockPrisma.memberActivity.findMany.mockResolvedValue([]);
    mockTaskAssignee.getMemberLoad.mockResolvedValue({
      todo: 0,
      inProgress: 0,
      completed: 0,
      total: 0,
    });
  });

  it('throws when member not found', async () => {
    mockPrisma.member.findUnique.mockResolvedValue(null);
    await expect(service.getCard('m1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('resolves member by shortId when id lookup misses', async () => {
    mockPrisma.member.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(baseMember);
    mockPrisma.memberProjectBinding.findMany.mockResolvedValue([]);
    mockPrisma.teamMember.findMany.mockResolvedValue([]);

    const card = await service.getCard('ab12cd34');
    expect(card.id).toBe('m1');
    expect(card.shortId).toBe('ab12cd34');
  });

  it('builds aggregate card from binding/team data', async () => {
    mockPrisma.member.findUnique.mockResolvedValue(baseMember);
    mockPrisma.memberProjectBinding.findMany.mockResolvedValue([
      { projectId: 'p1', role: 'maintainer' },
    ]);
    mockPrisma.teamMember.findMany.mockResolvedValue([
      { teamId: 't1', role: 'owner' },
    ]);
    mockPrisma.project.findMany.mockResolvedValue([
      { id: 'p1', name: 'Demo', color: 'red' },
    ]);
    mockPrisma.team.findMany.mockResolvedValue([
      { id: 't1', name: 'Core', color: 'blue' },
    ]);

    const card = await service.getCard('m1');
    expect(card.id).toBe('m1');
    expect(card.displayName).toBe('Alice');
    expect(card.projects).toHaveLength(1);
    expect(card.projects[0].projectName).toBe('Demo');
    expect(card.teams).toHaveLength(1);
    expect(card.teams[0].teamName).toBe('Core');
    expect(card.title).toBeNull();
    expect(card.hasPersonalPrompt).toBe(false);
    expect(card.trustLevel).toBeNull();
  });

  it('handles null optional fields', async () => {
    mockPrisma.member.findUnique.mockResolvedValue(baseMember);
    mockPrisma.memberProjectBinding.findMany.mockResolvedValue([]);
    mockPrisma.teamMember.findMany.mockResolvedValue([]);

    const card = await service.getCard('m1');
    expect(card.id).toBe('m1');
    expect(card.displayName).toBe('Alice');
    expect(card.projects).toHaveLength(0);
    expect(card.teams).toHaveLength(0);
    expect(card.tags).toEqual([]);
  });

  it('getCardBatch skips null entries', async () => {
    mockPrisma.member.findUnique.mockImplementation(
      ({ where }: { where: { id?: string; shortId?: string } }) =>
        where.id === 'm2' || where.shortId === 'm2'
          ? Promise.resolve({ ...baseMember, id: 'm2', shortId: 'zz99yy88' })
          : Promise.resolve(null),
    );
    mockPrisma.memberProjectBinding.findMany.mockResolvedValue([]);
    mockPrisma.teamMember.findMany.mockResolvedValue([]);

    const r = await service.getCardBatch(['m1', 'm2']);
    expect(r).toHaveLength(1);
    expect((r as any)[0].id).toBe('m2');
  });
});
