import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InviteService } from './invite.service';
import { PrismaService } from '@/core/database/prisma.service';
import { AuthService } from '@/modules/auth/auth.service';

describe('InviteService', () => {
  let service: InviteService;

  const mockPrisma = {
    teamInvite: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    teamMember: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockAuth = {
    ensureMemberForUser: jest.fn(),
  };

  const future = new Date(Date.now() + 3600_000);
  const past = new Date(Date.now() - 3600_000);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthService, useValue: mockAuth },
      ],
    }).compile();
    service = module.get<InviteService>(InviteService);
    jest.clearAllMocks();
  });

  it('preview 返回团队与邀请摘要', async () => {
    mockPrisma.teamInvite.findUnique.mockResolvedValue({
      id: 'i1',
      teamId: 't1',
      email: 'a@x.com',
      role: 'member',
      status: 'pending',
      expiresAt: future,
    });
    mockPrisma.team.findUnique.mockResolvedValue({
      id: 't1',
      name: 'Core',
      avatarUrl: null,
      ownerId: 'u-owner',
    });
    mockPrisma.user.findUnique.mockResolvedValue({ displayName: '管理员' });

    const res = await service.preview('tok');
    expect(res.teamName).toBe('Core');
    expect(res.inviterName).toBe('管理员');
    expect(res.status).toBe('pending');
  });

  it('preview 将过期 pending 标记为 expired', async () => {
    mockPrisma.teamInvite.findUnique.mockResolvedValue({
      teamId: 't1',
      status: 'pending',
      expiresAt: past,
      role: 'member',
      email: '',
    });
    mockPrisma.team.findUnique.mockResolvedValue(null);

    const res = await service.preview('tok');
    expect(res.status).toBe('expired');
  });

  it('accept 邮箱不匹配时拒绝', async () => {
    mockPrisma.teamInvite.findUnique.mockResolvedValue({
      id: 'i1',
      teamId: 't1',
      email: 'a@x.com',
      role: 'member',
      status: 'pending',
      expiresAt: future,
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'other@x.com',
      displayName: 'B',
    });

    await expect(service.accept('tok', 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accept 成功：建 Member 入队并标记邀请', async () => {
    mockPrisma.teamInvite.findUnique.mockResolvedValue({
      id: 'i1',
      teamId: 't1',
      email: 'a@x.com',
      role: 'maintainer',
      status: 'pending',
      expiresAt: future,
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'A@X.com',
      displayName: 'Alice',
    });
    mockAuth.ensureMemberForUser.mockResolvedValue({ id: 'm1' });
    mockPrisma.teamMember.findFirst.mockResolvedValue(null);
    mockPrisma.teamMember.create.mockResolvedValue({ id: 'tm1' });
    mockPrisma.teamInvite.update.mockResolvedValue({ status: 'accepted' });

    const res = await service.accept('tok', 'u1');
    expect(res.teamId).toBe('t1');
    expect(mockPrisma.teamMember.create).toHaveBeenCalledWith({
      data: { teamId: 't1', memberId: 'm1', role: 'maintainer' },
    });
    expect(mockPrisma.teamInvite.update).toHaveBeenCalled();
  });

  it('directAdd 已在团队时拒绝', async () => {
    mockPrisma.team.findUnique.mockResolvedValue({ id: 't1' });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@x.com',
      displayName: 'A',
    });
    mockAuth.ensureMemberForUser.mockResolvedValue({ id: 'm1' });
    mockPrisma.teamMember.findFirst.mockResolvedValue({ id: 'tm1' });

    await expect(
      service.directAdd('t1', 'u1', 'member'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('directAdd 用户不存在时 404', async () => {
    mockPrisma.team.findUnique.mockResolvedValue({ id: 't1' });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.directAdd('t1', 'ghost', 'member'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
