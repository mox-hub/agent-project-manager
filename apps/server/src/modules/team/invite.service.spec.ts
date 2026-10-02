import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { InviteService } from './invite.service';
import { PrismaService } from '@/core/database/prisma.service';
import { AuthService } from '@/modules/auth/auth.service';
import { createWorkspace } from '@/core/database/workspace-registry.util';
import { getCurrentWorkspaceId } from '@/core/database/workspace-context';

describe('InviteService', () => {
  let service: InviteService;

  const mockPrisma = {
    teamInvite: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    roleAssignment: {
      create: vi.fn(),
    },
    teamMember: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };

  const mockAuth = {
    ensureMemberForUser: vi.fn(),
  };

  const future = new Date(Date.now() + 3600_000);
  const past = new Date(Date.now() - 3600_000);

  // 非默认工作区（CAP-A-25）：跨库定位要有真实的注册表与库文件，扫描面才非空
  let tmpRoot: string;
  let workspaceId: string;
  let previousRegistry: string | undefined;
  let previousTemplate: string | undefined;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-invite-test-'));
    previousRegistry = process.env.WORKSPACE_REGISTRY_PATH;
    previousTemplate = process.env.WORKSPACE_TEMPLATE_PATH;
    process.env.WORKSPACE_REGISTRY_PATH = path.join(tmpRoot, 'workspaces.json');
    process.env.WORKSPACE_TEMPLATE_PATH = path.resolve(
      process.cwd(),
      'prisma/template.db',
    );
    workspaceId = createWorkspace({
      name: 'invite-ws',
      path: path.join(tmpRoot, 'ws-a'),
    }).id;
  });

  afterAll(() => {
    if (previousRegistry === undefined)
      delete process.env.WORKSPACE_REGISTRY_PATH;
    else process.env.WORKSPACE_REGISTRY_PATH = previousRegistry;
    if (previousTemplate === undefined)
      delete process.env.WORKSPACE_TEMPLATE_PATH;
    else process.env.WORKSPACE_TEMPLATE_PATH = previousTemplate;
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthService, useValue: mockAuth },
      ],
    }).compile();
    service = module.get<InviteService>(InviteService);
    vi.clearAllMocks();
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

  // ---------------------------------------------------------------------------
  // 跨工作区定位 + 邀请即建（CAP-A-25 ④ / GAP-T-57）
  // ---------------------------------------------------------------------------

  const actor = {
    id: 'u1',
    username: 'alice',
    email: 'a@x.com',
    displayName: 'Alice',
    passwordHash: 'hash',
    authProvider: 'local',
    avatarUrl: null,
    timezone: null,
    isActive: true,
  };

  it('accept 跨库定位邀请，且写入全部发生在**目标工作区**上下文内', async () => {
    // 邀请只存在于非默认工作区：默认库查空 → 命中目标工作区
    mockPrisma.teamInvite.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue({
        id: 'i1',
        teamId: 't1',
        email: 'a@x.com',
        role: 'member',
        status: 'pending',
        expiresAt: future,
      });
    mockPrisma.user.findUnique.mockResolvedValue(actor);
    mockAuth.ensureMemberForUser.mockResolvedValue({ id: 'm1' });
    mockPrisma.teamMember.findFirst.mockResolvedValue(null);

    const writeContexts: Array<string | null> = [];
    mockPrisma.teamMember.create.mockImplementation(async () => {
      writeContexts.push(getCurrentWorkspaceId());
      return { id: 'tm1' };
    });
    const inviteUpdateContexts: Array<string | null> = [];
    mockPrisma.teamInvite.update.mockImplementation(async () => {
      inviteUpdateContexts.push(getCurrentWorkspaceId());
      return {};
    });

    const res = await service.accept('tok', 'u1');

    expect(res).toEqual({ teamId: 't1', memberId: 'm1', role: 'member' });
    // 关键：入队与邀请核销都在目标工作区库上执行，而不是调用方（默认库）上下文
    expect(writeContexts).toEqual([workspaceId]);
    expect(inviteUpdateContexts).toEqual([workspaceId]);
  });

  it('目标库无该主体时按**同 id** 新建镜像并补全局 user 角色（跨库引用口径一致）', async () => {
    mockPrisma.teamInvite.findUnique.mockResolvedValue({
      id: 'i1',
      teamId: 't1',
      email: 'a@x.com',
      role: 'member',
      status: 'pending',
      expiresAt: future,
    });
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(actor) // 身份来源库
      .mockResolvedValue(null); // byId / byEmail / byUsername 全空
    mockPrisma.user.create.mockResolvedValue(actor);
    mockPrisma.roleAssignment.create.mockResolvedValue({});
    mockAuth.ensureMemberForUser.mockResolvedValue({ id: 'm1' });
    mockPrisma.teamMember.findFirst.mockResolvedValue(null);
    mockPrisma.teamMember.create.mockResolvedValue({ id: 'tm1' });
    mockPrisma.teamInvite.update.mockResolvedValue({});

    await service.accept('tok', 'u1');

    // 保 id + 带 passwordHash（否则用户无法在目标工作区登录，本能力等于没落地）
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: actor.id,
        username: actor.username,
        passwordHash: actor.passwordHash,
      }),
    });
    expect(mockPrisma.roleAssignment.create).toHaveBeenCalledWith({
      data: { userId: actor.id, scopeType: 'global', role: 'user' },
    });
  });

  it('目标库已有同 email 的主体时复用，绝不造出第二个「人」', async () => {
    mockPrisma.teamInvite.findUnique.mockResolvedValue({
      id: 'i1',
      teamId: 't1',
      email: 'a@x.com',
      role: 'member',
      status: 'pending',
      expiresAt: future,
    });
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(actor) // 身份来源库
      .mockResolvedValueOnce(null) // byId：该库中 id 不同
      .mockResolvedValue({ id: 'u-other', email: 'a@x.com' }); // byEmail 命中既有行
    mockAuth.ensureMemberForUser.mockResolvedValue({ id: 'm2' });
    mockPrisma.teamMember.findFirst.mockResolvedValue(null);
    mockPrisma.teamMember.create.mockResolvedValue({ id: 'tm1' });
    mockPrisma.teamInvite.update.mockResolvedValue({});

    await service.accept('tok', 'u1');

    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.roleAssignment.create).not.toHaveBeenCalled();
    // 入队用的是既有行对应的 Member，而不是新建的
    expect(mockAuth.ensureMemberForUser).toHaveBeenCalledWith(
      'u-other',
      expect.anything(),
    );
  });
});
