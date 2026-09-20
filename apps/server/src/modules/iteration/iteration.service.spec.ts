import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { IterationService } from './iteration.service';
import { PrismaService } from '../../core/database/prisma.service';

describe('IterationService', () => {
  let service: IterationService;

  const mockPrismaService = {
    project: {
      findFirst: vi.fn(),
    },
    iteration: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IterationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<IterationService>(IterationService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create iteration with maintainer role', async () => {
      const createDto = {
        projectId: 'project-1',
        name: 'Sprint 1',
        goal: 'Complete features',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
        capacity: 100,
      };

      const mockProject = {
        id: 'project-1',
        members: [{ userId: 'user-1', role: 'maintainer' }],
      };

      const mockIteration = {
        id: 'iteration-1',
        ...createDto,
        status: 'planned',
        _count: { issues: 0 },
      };

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.iteration.create.mockResolvedValue(mockIteration);

      const result = await service.create(createDto, 'user-1');

      expect(result).toEqual(mockIteration);
      expect(mockPrismaService.iteration.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for insufficient permissions', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            projectId: 'project-1',
            name: 'Sprint 1',
            startDate: '2024-01-01',
            endDate: '2024-01-14',
          },
          'user-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return iterations for project', async () => {
      const mockProject = {
        id: 'project-1',
        members: [{ userId: 'user-1' }],
      };

      const mockIterations = [
        {
          id: 'iteration-1',
          name: 'Sprint 1',
          projectId: 'project-1',
          _count: { issues: 5 },
        },
      ];

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.iteration.findMany.mockResolvedValue(mockIterations);

      const result = await service.findAll('project-1', 'user-1');

      expect(result).toEqual(mockIterations);
      expect(mockPrismaService.iteration.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { startDate: 'desc' },
        include: {
          _count: {
            select: {
              issues: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.findAll('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
