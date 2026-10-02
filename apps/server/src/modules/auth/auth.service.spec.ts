import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../core/database/prisma.service';
import { ConfigService } from '../../core/config/config.service';
import {
  BusinessException,
  ErrorCode,
} from '../../core/exceptions/business.exception';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  DEFAULT_WORKSPACE_ID,
  createWorkspace,
} from '../../core/database/workspace-registry.util';
import { runInWorkspace } from '../../core/database/workspace-scope.util';
import { getCurrentWorkspaceId } from '../../core/database/workspace-context';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    roleAssignment: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    actorClaimSnapshot: {
      create: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
    appConfig: {
      findFirst: vi.fn(),
    },
    registrationInvite: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    member: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  const mockJwtService = {
    sign: vi.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfigService = {
    get: vi.fn().mockReturnValue('7d'),
    getOrThrow: vi.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should throw BusinessException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('invalid', 'password')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw BusinessException for user without password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        username: 'test',
        passwordHash: null,
      });

      await expect(service.validateUser('test', 'password')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw BusinessException for inactive user', async () => {
      const passwordHash = await bcrypt.hash('password', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        username: 'test',
        passwordHash,
        isActive: false,
      });

      await expect(service.validateUser('test', 'password')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw BusinessException for invalid password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        username: 'test',
        passwordHash,
        isActive: true,
      });

      await expect(
        service.validateUser('test', 'wrong-password'),
      ).rejects.toThrow(BusinessException);
    });

    it('should return user without passwordHash for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password', 10);
      const mockUser = {
        id: '1',
        username: 'test',
        displayName: 'Test User',
        email: 'test@example.com',
        passwordHash,
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser('test', 'password');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.id).toBe('1');
      expect(result.username).toBe('test');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'test' },
      });
    });

    it('should login with email identifier when username lookup misses', async () => {
      const passwordHash = await bcrypt.hash('password', 10);
      const mockUser = {
        id: '1',
        username: 'test',
        displayName: 'Test User',
        email: 'test@example.com',
        passwordHash,
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockImplementation(
        (args: { where: { username?: string; email?: string } }) => {
          if (args.where.username) return Promise.resolve(null);
          return Promise.resolve(
            args.where.email === 'test@example.com' ? mockUser : null,
          );
        },
      );

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.id).toBe('1');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'test@example.com' },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should normalize email identifier case for email fallback', async () => {
      const passwordHash = await bcrypt.hash('password', 10);
      const mockUser = {
        id: '2',
        username: 'agent-exp',
        email: 'agent-exp@night.test',
        passwordHash,
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockImplementation(
        (args: { where: { username?: string; email?: string } }) => {
          if (args.where.username) return Promise.resolve(null);
          return Promise.resolve(
            args.where.email === 'agent-exp@night.test' ? mockUser : null,
          );
        },
      );

      const result = await service.validateUser(
        'Agent-Exp@Night.Test',
        'password',
      );

      expect(result.id).toBe('2');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'agent-exp@night.test' },
      });
    });

    it('should prefer username exact match without email fallback', async () => {
      const passwordHash = await bcrypt.hash('password', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '3',
        username: 'admin@example.com',
        email: 'other@example.com',
        passwordHash,
        isActive: true,
      });

      const result = await service.validateUser(
        'admin@example.com',
        'password',
      );

      expect(result.id).toBe('3');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'admin@example.com' },
      });
    });

    it('should throw BusinessException for unknown email identifier', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.validateUser('ghost@example.com', 'password'),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('register', () => {
    it('should throw 409 with EMAIL_ALREADY_REGISTERED when email is taken', async () => {
      // open 注册模式：无 appConfig 记录
      mockPrismaService.appConfig.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-1',
        username: 'taken',
        email: 'taken@example.com',
      });

      const error = await service
        .register({
          email: 'taken@example.com',
          password: 'password123',
        })
        .catch((e: BusinessException) => e);

      expect(error).toBeInstanceOf(BusinessException);
      expect(error.errorCode).toBe(ErrorCode.EMAIL_ALREADY_REGISTERED);
      expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
    });
  });

  describe('login', () => {
    it('should create session and return access token', async () => {
      const mockUser = {
        id: '1',
        username: 'test',
        displayName: 'Test User',
        email: 'test@example.com',
      };

      mockPrismaService.session.create.mockResolvedValue({ id: 'session-1' });
      mockPrismaService.roleAssignment.findMany.mockResolvedValue([
        {
          scopeType: 'project',
          projectId: 'proj-1',
          role: 'maintainer',
        },
      ]);
      mockPrismaService.actorClaimSnapshot.create.mockResolvedValue({
        id: 'claim-1',
        issuedAt: new Date('2026-03-22T10:00:00.000Z'),
        expiresAt: new Date('2026-03-29T10:00:00.000Z'),
      });

      const result = await service.login(mockUser);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('subjectClaim');
      expect(result.user.id).toBe('1');
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(mockPrismaService.session.create).toHaveBeenCalled();
      expect(mockPrismaService.actorClaimSnapshot.create).toHaveBeenCalled();
    });
  });

  describe('getCurrentUserWithRoles', () => {
    it('should return user with roles', async () => {
      const mockUser = {
        id: '1',
        username: 'test',
        displayName: 'Test User',
        email: 'test@example.com',
        avatarUrl: null,
        timezone: null,
      };

      const mockRoles = [
        {
          id: 'role-1',
          scopeType: 'global',
          projectId: null,
          role: 'admin',
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.roleAssignment.findMany.mockResolvedValue(mockRoles);

      const result = await service.getCurrentUserWithRoles('1');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('roles');
      expect(result).toHaveProperty('subjectClaim');
      expect(result.user.id).toBe('1');
      expect(result.roles).toHaveLength(1);
    });
  });

  describe('validateJwtPayload', () => {
    it('should validate session-bound token and update session activity', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        username: 'test',
        displayName: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed',
        isActive: true,
      });
      mockPrismaService.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: '1',
        expiresAt: new Date(Date.now() + 60_000),
      });
      mockPrismaService.session.update.mockResolvedValue({
        id: 'session-1',
      });

      const result = await service.validateJwtPayload({
        sub: '1',
        sid: 'session-1',
      });

      expect(result.id).toBe('1');
      expect(result.sessionId).toBe('session-1');
      expect(mockPrismaService.session.update).toHaveBeenCalled();
    });
  });

  /**
   * ⑤ 区分性提示（CAP-A-25 / GAP-T-57）：凭证对但「人不在当前工作区」必须与
   * 「密码错误」区分开——前者可行动（切工作区/接受邀请），后者只能重试。
   * 并且**不得**因此引入账号枚举面：密码不对时依旧只有 INVALID_CREDENTIALS。
   */
  describe('validateUser 工作区区分性提示', () => {
    let tmpRoot: string;
    let foreignWsId: string;
    let previousRegistry: string | undefined;
    let previousTemplate: string | undefined;
    let passwordHash: string;

    beforeAll(async () => {
      tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-auth-ws-test-'));
      previousRegistry = process.env.WORKSPACE_REGISTRY_PATH;
      previousTemplate = process.env.WORKSPACE_TEMPLATE_PATH;
      process.env.WORKSPACE_REGISTRY_PATH = path.join(
        tmpRoot,
        'workspaces.json',
      );
      process.env.WORKSPACE_TEMPLATE_PATH = path.resolve(
        process.cwd(),
        'prisma/template.db',
      );
      foreignWsId = createWorkspace({
        name: 'foreign-ws',
        path: path.join(tmpRoot, 'ws-a'),
      }).id;
      // 测试用低 cost（4）换速度：这里验的是分支逻辑，不是 bcrypt 强度
      passwordHash = await bcrypt.hash('correct-pw', 4);
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

    /** 主体只住在默认库；在当前（非默认）工作区里查不到 */
    function stubSubjectOnlyInDefaultWorkspace() {
      mockPrismaService.user.findUnique.mockImplementation(async () => {
        const current = getCurrentWorkspaceId();
        if (current === null || current === DEFAULT_WORKSPACE_ID) {
          return {
            id: 'u1',
            username: 'alice',
            email: 'a@x.com',
            displayName: 'Alice',
            passwordHash,
            isActive: true,
          };
        }
        return null;
      });
    }

    it('当前工作区无此主体但密码在别处对得上 → WORKSPACE_SUBJECT_MISSING', async () => {
      stubSubjectOnlyInDefaultWorkspace();

      const error = await runInWorkspace(foreignWsId, () =>
        service.validateUser('alice', 'correct-pw'),
      ).catch((e: BusinessException) => e);

      expect(error).toBeInstanceOf(BusinessException);
      expect(error.errorCode).toBe(ErrorCode.WORKSPACE_SUBJECT_MISSING);
      expect(error.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      // 提示里点名当前工作区，用户才知道该切回哪儿
      expect(error.message).toContain('foreign-ws');
    });

    it('密码不对时不得区分（不引入账号枚举面）→ 仍是 INVALID_CREDENTIALS', async () => {
      stubSubjectOnlyInDefaultWorkspace();

      const error = await runInWorkspace(foreignWsId, () =>
        service.validateUser('alice', 'wrong-pw'),
      ).catch((e: BusinessException) => e);

      expect(error.errorCode).toBe(ErrorCode.INVALID_CREDENTIALS);
    });

    it('未选择工作区（走默认库）时不做跨库探测 → INVALID_CREDENTIALS', async () => {
      // 主体只住在非默认工作区：此时默认库里查不到，但**也不该**去别处翻找——
      // 没有工作区选择就没有「选错了」这回事，报可行动的提示反而是误导。
      mockPrismaService.user.findUnique.mockImplementation(async () =>
        getCurrentWorkspaceId() === foreignWsId
          ? {
              id: 'u2',
              username: 'alice',
              email: 'a@x.com',
              displayName: 'Alice',
              passwordHash,
              isActive: true,
            }
          : null,
      );

      const error = await service
        .validateUser('alice', 'correct-pw')
        .catch((e: BusinessException) => e);

      expect(error.errorCode).toBe(ErrorCode.INVALID_CREDENTIALS);
    });
  });
});
