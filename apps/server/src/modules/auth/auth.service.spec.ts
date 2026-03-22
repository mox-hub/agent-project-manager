import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../core/database/prisma.service';
import { ConfigService } from '../../core/config/config.service';
import { BusinessException } from '../../core/exceptions/business.exception';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    roleAssignment: {
      findMany: jest.fn(),
    },
    actorClaimSnapshot: {
      create: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
    },
    agentIdentityBinding: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('7d'),
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
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
    jest.clearAllMocks();
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
});
