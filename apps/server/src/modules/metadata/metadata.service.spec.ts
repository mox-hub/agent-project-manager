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

  describe('createOrUpdateStatus（视觉字段与部分更新语义）', () => {
    it('创建透传 color/icon/description/group/allowedNextStatusKeys', async () => {
      const payload = {
        type: 'task',
        key: 'code_review',
        name: 'Code Review',
        group: 'started',
        color: '#3b82f6',
        icon: 'CircleAlert',
        description: '评审中',
        order: 35,
        allowedNextStatusKeys: ['done'],
      };
      mockPrismaService.statusDefinition.findUnique.mockResolvedValue(null);
      mockPrismaService.statusDefinition.create.mockResolvedValue({
        id: 'st-new',
        ...payload,
      });

      await service.createOrUpdateStatus(payload);

      expect(mockPrismaService.statusDefinition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'task',
          key: 'code_review',
          group: 'started',
          color: '#3b82f6',
          icon: 'CircleAlert',
          description: '评审中',
          allowedNextStatusKeys: ['done'],
        }),
      });
    });

    it('部分更新（拖拽排序只传 order）不抹掉 color/icon 等未传字段', async () => {
      mockPrismaService.statusDefinition.findUnique.mockResolvedValue({
        id: 'st-1',
        type: 'task',
        key: 'todo',
        name: '待办',
        color: '#6b7280',
        icon: 'Circle',
      });
      mockPrismaService.statusDefinition.update.mockResolvedValue({
        id: 'st-1',
        order: 20,
      });

      await service.createOrUpdateStatus({
        id: 'st-1',
        type: 'task',
        key: 'todo',
        name: '待办',
        order: 20,
      });

      expect(mockPrismaService.statusDefinition.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'st-1' },
          data: expect.not.objectContaining({
            color: expect.anything(),
            icon: expect.anything(),
          }),
        }),
      );
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
