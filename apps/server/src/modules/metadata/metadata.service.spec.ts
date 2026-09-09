import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';

describe('MetadataService', () => {
  let service: MetadataService;

  const mockPrismaService = {
    tag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    statusDefinition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    projectRoleDefinition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    projectTemplate: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetadataService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        { provide: MessageBusService, useValue: { publish: vi.fn() } },
      ],
    }).compile();

    service = module.get<MetadataService>(MetadataService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTags', () => {
    it('should return tags list', async () => {
      const mockTags = [
        { id: '1', name: 'backend', color: '#FF5733' },
        { id: '2', name: 'frontend', color: '#33FF57' },
      ];

      mockPrismaService.tag.findMany.mockResolvedValue(mockTags);

      const result = await service.getTags();

      expect(result).toEqual(mockTags);
      expect(mockPrismaService.tag.findMany).toHaveBeenCalled();
    });

    it('should filter by projectId', async () => {
      await service.getTags('project-1');

      expect(mockPrismaService.tag.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('createOrUpdateTag', () => {
    it('should create new tag', async () => {
      const tagData = {
        name: 'test-tag',
        color: '#FF0000',
        description: 'Test tag',
      };

      const mockTag = { ...tagData, id: '1' };
      mockPrismaService.tag.create.mockResolvedValue(mockTag);

      const result = await service.createOrUpdateTag(tagData);

      expect(result).toEqual(mockTag);
      expect(mockPrismaService.tag.create).toHaveBeenCalled();
    });

    it('should update existing tag', async () => {
      const tagData = {
        id: '1',
        name: 'test-tag',
        color: '#FF0000',
      };

      const mockTag = { ...tagData };
      mockPrismaService.tag.findUnique.mockResolvedValue({
        id: '1',
        name: 'test-tag',
      });
      mockPrismaService.tag.update.mockResolvedValue(mockTag);

      const result = await service.createOrUpdateTag(tagData);

      expect(result).toEqual(mockTag);
      expect(mockPrismaService.tag.update).toHaveBeenCalled();
    });
  });

  describe('deleteTag', () => {
    it('should delete tag successfully', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue({ id: '1' });
      mockPrismaService.tag.delete.mockResolvedValue({ id: '1' });

      const result = await service.deleteTag('1');

      expect(result).toBeUndefined();
      expect(mockPrismaService.tag.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when tag not found', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(null);

      await expect(service.deleteTag('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStatuses', () => {
    it('should return status definitions', async () => {
      const mockStatuses = [
        {
          id: '1',
          type: 'task',
          key: 'todo',
          name: '待办',
          order: 10,
        },
      ];

      mockPrismaService.statusDefinition.findMany.mockResolvedValue(
        mockStatuses,
      );

      const result = await service.getStatuses(undefined, 'task');

      expect(result).toEqual(mockStatuses);
      expect(mockPrismaService.statusDefinition.findMany).toHaveBeenCalled();
    });
  });
});
