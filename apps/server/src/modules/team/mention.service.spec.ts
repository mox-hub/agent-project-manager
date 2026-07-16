import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MentionService } from './mention.service';
import { PrismaService } from '../../core/database/prisma.service';

describe('MentionService', () => {
  let service: MentionService;

  const mockPrisma = {
    member: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    mention: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<MentionService>(MentionService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws when member missing', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ memberId: 'm1', sourceType: 'task', sourceId: 't1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('parseAndCreate', () => {
    it('returns 0 when no handles', async () => {
      const r = await service.parseAndCreate({
        text: 'plain text',
        sourceType: 'task',
        sourceId: 't1',
      });
      expect(r.created).toBe(0);
    });

    it('parses unique handles and creates mentions', async () => {
      mockPrisma.member.findMany.mockResolvedValue([
        { id: 'm1', handle: 'alice', displayName: 'Alice' },
        { id: 'm2', handle: 'bob', displayName: 'Bob' },
      ]);
      const r = await service.parseAndCreate(
        {
          text: 'Hello @alice and @alice and @bob!',
          sourceType: 'comment',
          sourceId: 'c1',
        },
        'u1',
      );
      expect(r.created).toBe(2);
      expect(mockPrisma.mention.createMany).toHaveBeenCalledTimes(1);
    });

    it('skips when no member matches', async () => {
      mockPrisma.member.findMany.mockResolvedValue([]);
      const r = await service.parseAndCreate({
        text: '@unknown',
        sourceType: 'comment',
        sourceId: 'c1',
      });
      expect(r.created).toBe(0);
    });
  });

  describe('suggest', () => {
    it('returns [] on empty query', async () => {
      const r = await service.suggest('');
      expect(r).toEqual([]);
    });

    it('filters inactive members and matches handle/displayName', async () => {
      mockPrisma.member.findMany.mockResolvedValue([{ id: 'm1' }]);
      const r = await service.suggest('ali');
      expect(r.length).toBe(1);
      const where = mockPrisma.member.findMany.mock.calls[0][0].where;
      expect(where.status).toEqual({ not: 'inactive' });
      expect(where.OR).toBeDefined();
    });
  });
});
