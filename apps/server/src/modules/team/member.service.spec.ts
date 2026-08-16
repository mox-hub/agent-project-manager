import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { MemberService } from './member.service';
import { PrismaService } from '../../core/database/prisma.service';

describe('MemberService', () => {
  let service: MemberService;

  const mockPrisma = {
    member: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    memberProjectBinding: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    memberActivity: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MemberService>(MemberService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('rejects duplicate handle', async () => {
      mockPrisma.member.findUnique.mockResolvedValueOnce({ id: 'm1' });
      await expect(
        service.create(
          {
            type: 'human',
            userId: 'u1',
            displayName: 'A',
            handle: 'dup',
          } as any,
          'u1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects duplicate userId', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null); // handle check
      mockPrisma.member.findFirst.mockResolvedValue({ id: 'm1' }); // userId check
      await expect(
        service.create(
          {
            type: 'human',
            userId: 'u-dup',
            displayName: 'A',
            handle: 'a',
          } as any,
          'u1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates human member successfully', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null);
      mockPrisma.member.findFirst.mockResolvedValue(null);
      mockPrisma.member.create.mockResolvedValue({ id: 'm1', handle: 'a' });
      const result = await service.create(
        { type: 'human', userId: 'u1', displayName: 'A', handle: 'a' } as any,
        'u1',
      );
      expect(result.id).toBe('m1');
      expect(mockPrisma.member.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update member', async () => {
      mockPrisma.member.findUnique.mockResolvedValue({
        id: 'm1',
        displayName: 'Old Name',
      });
      mockPrisma.member.update.mockResolvedValue({
        id: 'm1',
        displayName: 'New Name',
      });

      const result = await service.update('m1', { displayName: 'New Name' });
      expect(result.displayName).toBe('New Name');
    });

    it('throws NotFoundException when member not found', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { displayName: 'New' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('bindProject', () => {
    it('throws when member or project missing', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null);
      await expect(
        service.bindProject('m1', { projectId: 'p1', role: 'member' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when binding already exists', async () => {
      mockPrisma.member.findUnique.mockResolvedValue({ id: 'm1' });
      mockPrisma.memberProjectBinding.findFirst.mockResolvedValue({
        id: 'b1',
        memberId: 'm1',
        projectId: 'p1',
      });
      await expect(
        service.bindProject('m1', { projectId: 'p1', role: 'maintainer' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates new binding when missing', async () => {
      mockPrisma.member.findUnique.mockResolvedValue({ id: 'm1' });
      mockPrisma.memberProjectBinding.findFirst.mockResolvedValue(null);
      mockPrisma.memberProjectBinding.create.mockResolvedValue({ id: 'b2' });
      const r = await service.bindProject('m1', {
        projectId: 'p1',
        role: 'member',
      });
      expect(mockPrisma.memberProjectBinding.create).toHaveBeenCalled();
      expect(r.id).toBe('b2');
    });
  });

  describe('list', () => {
    it('filters by status when provided', async () => {
      mockPrisma.member.findMany.mockResolvedValue([]);
      mockPrisma.member.count.mockResolvedValue(0);
      await service.list({ status: 'active' } as any);
      const call = mockPrisma.member.findMany.mock.calls[0][0];
      expect(call.where.status).toEqual('active');
    });

    it('filters by projectId via projectBindings', async () => {
      mockPrisma.member.findMany.mockResolvedValue([]);
      mockPrisma.member.count.mockResolvedValue(0);
      mockPrisma.memberProjectBinding.findMany.mockResolvedValue([
        { memberId: 'm1' },
      ]);
      await service.list({ projectId: 'p1' } as any);
      const call = mockPrisma.member.findMany.mock.calls[0][0];
      expect(call.where.id).toEqual({ in: ['m1'] });
    });
  });
});
