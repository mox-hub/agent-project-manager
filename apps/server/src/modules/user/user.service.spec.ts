import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../../core/database/prisma.service';

describe('UserService', () => {
  let service: UserService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    roleAssignment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers = [
        {
          id: '1',
          username: 'user1',
          displayName: 'User 1',
          email: 'user1@example.com',
        },
        {
          id: '2',
          username: 'user2',
          displayName: 'User 2',
          email: 'user2@example.com',
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          timezone: true,
          isActive: true,
          createdAt: true,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const mockUser = {
        id: '1',
        username: 'user1',
        displayName: 'User 1',
        email: 'user1@example.com',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          timezone: true,
          isActive: true,
          createdAt: true,
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRoles', () => {
    it('should return user roles', async () => {
      const mockRoles = [
        {
          id: 'role-1',
          userId: '1',
          scopeType: 'global',
          role: 'admin',
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrismaService.roleAssignment.findMany.mockResolvedValue(mockRoles);

      const result = await service.getRoles('1');

      expect(result).toEqual(mockRoles);
      expect(mockPrismaService.roleAssignment.findMany).toHaveBeenCalledWith({
        where: { userId: '1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getRoles('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addRole', () => {
    it('should add role to user', async () => {
      const mockRole = {
        id: 'role-1',
        userId: '1',
        scopeType: 'global',
        role: 'admin',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrismaService.roleAssignment.create.mockResolvedValue(mockRole);

      const result = await service.addRole('1', {
        scopeType: 'global',
        role: 'admin',
      });

      expect(result).toEqual(mockRole);
      expect(mockPrismaService.roleAssignment.create).toHaveBeenCalledWith({
        data: {
          userId: '1',
          scopeType: 'global',
          projectId: undefined,
          role: 'admin',
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addRole('non-existent', {
          scopeType: 'global',
          role: 'admin',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeRole', () => {
    it('should remove role from user', async () => {
      const mockRole = {
        id: 'role-1',
        userId: '1',
        scopeType: 'global',
        role: 'admin',
      };

      mockPrismaService.roleAssignment.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.roleAssignment.delete.mockResolvedValue(mockRole);

      const result = await service.removeRole('1', 'role-1');

      expect(result).toBeUndefined();
      expect(mockPrismaService.roleAssignment.delete).toHaveBeenCalledWith({
        where: { id: 'role-1' },
      });
    });

    it('should throw NotFoundException when role assignment not found', async () => {
      mockPrismaService.roleAssignment.findUnique.mockResolvedValue(null);

      await expect(service.removeRole('1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when role belongs to different user', async () => {
      const mockRole = {
        id: 'role-1',
        userId: '2', // Different user
        scopeType: 'global',
        role: 'admin',
      };

      mockPrismaService.roleAssignment.findUnique.mockResolvedValue(mockRole);

      await expect(service.removeRole('1', 'role-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
