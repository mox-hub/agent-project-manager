import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GitService } from './git.service';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { ProjectWorkspaceService } from './project-workspace.service';

describe('GitService', () => {
  let service: GitService;

  const mockPrismaService = {
    project: {
      findFirst: jest.fn(),
    },
    repository: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    commit: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    pullRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    pullRequestReview: {
      create: jest.fn(),
    },
  };

  const mockMessageBusService = {
    publish: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    setContext: jest.fn(),
  };

  const mockWorkspaceService = {
    getWorkspacePath: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: MessageBusService, useValue: mockMessageBusService },
        { provide: ProjectWorkspaceService, useValue: mockWorkspaceService },
      ],
    }).compile();

    service = module.get<GitService>(GitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRepository', () => {
    const userId = 'user-1';
    const dto = {
      projectId: 'proj-1',
      name: 'test-repo',
      localPath: undefined,
      remoteUrl: 'https://github.com/test/repo.git',
      defaultBranch: 'main',
    };

    it('should throw NotFoundException if project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.createRepository(dto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create repository and publish event', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        name: 'Test',
      });
      const repoResult = {
        id: 'repo-1',
        projectId: 'proj-1',
        name: 'test-repo',
        project: { id: 'proj-1', name: 'Test' },
      };
      mockPrismaService.repository.create.mockResolvedValue(repoResult);

      const result = await service.createRepository(dto, userId);

      expect(result).toEqual(repoResult);
      expect(mockMessageBusService.publish).toHaveBeenCalledWith(
        'repository.created',
        {
          repositoryId: 'repo-1',
          projectId: 'proj-1',
        },
      );
    });
  });

  describe('getRepositories', () => {
    it('should return repositories filtered by user membership', async () => {
      const repos = [
        {
          id: 'repo-1',
          name: 'repo-a',
          project: { id: 'p-1', name: 'P1' },
        },
      ];
      mockPrismaService.repository.findMany.mockResolvedValue(repos);

      const result = await service.getRepositories({}, 'user-1');

      expect(result).toEqual(repos);
      expect(mockPrismaService.repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            project: { members: { some: { userId: 'user-1' } } },
          }),
        }),
      );
    });

    it('should filter by projectId when provided', async () => {
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      await service.getRepositories({ projectId: 'p-1' }, 'user-1');

      expect(mockPrismaService.repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 'p-1' }),
        }),
      );
    });
  });

  describe('getRepositoryById', () => {
    it('should throw NotFoundException when repo not found', async () => {
      mockPrismaService.repository.findFirst.mockResolvedValue(null);

      await expect(
        service.getRepositoryById('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return repository when found', async () => {
      const repo = {
        id: 'repo-1',
        name: 'test',
        project: { id: 'p-1', name: 'P1' },
      };
      mockPrismaService.repository.findFirst.mockResolvedValue(repo);

      const result = await service.getRepositoryById('repo-1', 'user-1');
      expect(result).toEqual(repo);
    });
  });

  describe('getRepositoryStatus', () => {
    it('should return clean status when localPath not available', async () => {
      mockPrismaService.repository.findFirst.mockResolvedValue({
        id: 'repo-1',
        localPath: null,
      });

      const result = await service.getRepositoryStatus('repo-1', 'user-1');
      expect(result.clean).toBe(true);
      expect(result.changedFiles).toEqual([]);
      expect(result.error).toBe('Local path not available');
    });
  });

  describe('getPullRequests', () => {
    it('should return PRs for a repository', async () => {
      mockPrismaService.repository.findFirst.mockResolvedValue({
        id: 'repo-1',
      });
      const prs = [{ id: 'pr-1', title: 'Fix bug', reviews: [] }];
      mockPrismaService.pullRequest.findMany.mockResolvedValue(prs);

      const result = await service.getPullRequests('repo-1', {}, 'user-1');
      expect(result).toEqual(prs);
    });
  });

  describe('getPullRequestById', () => {
    it('should throw NotFoundException when PR not found', async () => {
      mockPrismaService.pullRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.getPullRequestById('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user is not a member', async () => {
      mockPrismaService.pullRequest.findUnique.mockResolvedValue({
        id: 'pr-1',
        repo: { project: { members: [] } },
      });

      await expect(
        service.getPullRequestById('pr-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createPullRequestReview', () => {
    it('should create review and publish event', async () => {
      mockPrismaService.pullRequest.findUnique.mockResolvedValue({
        id: 'pr-1',
        repo: { project: { members: [{ userId: 'user-1' }] } },
      });
      const review = { id: 'rev-1', prId: 'pr-1', state: 'approved' };
      mockPrismaService.pullRequestReview.create.mockResolvedValue(review);

      const result = await service.createPullRequestReview(
        'pr-1',
        { type: 'code-review', state: 'approved', summary: 'LGTM' },
        'user-1',
      );

      expect(result).toEqual(review);
      expect(mockMessageBusService.publish).toHaveBeenCalledWith(
        'pull_request.review.created',
        { prId: 'pr-1', reviewId: 'rev-1' },
      );
    });
  });
});
