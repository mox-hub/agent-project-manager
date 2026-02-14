import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';

describe('ProjectService', () => {
  let service: ProjectService;

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    projectTemplate: {
      findUnique: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
    },
  };

  const mockMessageBusService = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MessageBusService,
          useValue: mockMessageBusService,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create project without template', async () => {
      const createDto = {
        name: 'Test Project',
        description: 'Test Description',
        type: 'software',
        visibility: 'private',
      };

      const mockProject = {
        id: 'project-1',
        ...createDto,
        status: 'active',
        createdBy: 'user-1',
        members: [],
      };

      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const result = await service.create(createDto, 'user-1');

      expect(result).toEqual(mockProject);
      expect(mockPrismaService.project.create).toHaveBeenCalled();
      expect(mockMessageBusService.publish).toHaveBeenCalledWith(
        'project.created',
        expect.objectContaining({
          projectId: 'project-1',
          userId: 'user-1',
        }),
      );
    });

    it('should create project with template', async () => {
      const createDto = {
        name: 'Test Project',
        description: 'Test Description',
        type: 'software',
        visibility: 'private',
        templateId: 'template-1',
      };

      const mockTemplate = {
        id: 'template-1',
        defaultStatuses: { task: ['todo', 'in_progress'] },
      };

      const mockProject = {
        id: 'project-1',
        ...createDto,
        status: 'active',
        createdBy: 'user-1',
        members: [],
      };

      mockPrismaService.projectTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const result = await service.create(createDto, 'user-1');

      expect(result).toEqual(mockProject);
      expect(mockPrismaService.projectTemplate.findUnique).toHaveBeenCalledWith(
        { where: { id: 'template-1' } },
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      const mockProjects = [
        { id: 'project-1', name: 'Project 1' },
        { id: 'project-2', name: 'Project 2' },
      ];

      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);
      mockPrismaService.project.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, pageSize: 20 }, 'user-1');

      expect(result.data).toEqual(mockProjects);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by search query', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([]);
      mockPrismaService.project.count.mockResolvedValue(0);

      await service.findAll({ q: 'test', page: 1, pageSize: 20 }, 'user-1');

      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'test' } },
              { description: { contains: 'test' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return project by id', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        members: [],
      };

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);

      const result = await service.findOne('project-1', 'user-1');

      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update project with owner role', async () => {
      const mockMember = {
        projectId: 'project-1',
        userId: 'user-1',
        role: 'owner',
      };

      const mockProject = {
        id: 'project-1',
        name: 'Updated Project',
        members: [],
      };

      mockPrismaService.projectMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.project.update.mockResolvedValue(mockProject);

      const result = await service.update(
        'project-1',
        { name: 'Updated Project' },
        'user-1',
      );

      expect(result).toEqual(mockProject);
      expect(mockMessageBusService.publish).toHaveBeenCalledWith(
        'project.updated',
        expect.any(Object),
      );
    });

    it('should throw ForbiddenException for insufficient permissions', async () => {
      mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.update('project-1', { name: 'Updated' }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('archive', () => {
    it('should archive project with owner role', async () => {
      const mockMember = {
        projectId: 'project-1',
        userId: 'user-1',
        role: 'owner',
      };

      const mockProject = {
        id: 'project-1',
        status: 'archived',
      };

      mockPrismaService.projectMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.project.update.mockResolvedValue(mockProject);

      const result = await service.archive('project-1', 'user-1');

      expect(result.status).toBe('archived');
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

      await expect(service.archive('project-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
