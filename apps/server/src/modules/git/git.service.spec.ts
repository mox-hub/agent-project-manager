import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GitService } from './git.service';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { ProjectWorkspaceService } from './project-workspace.service';
import { GitHubSDKService } from '../integration/providers/github/github-sdk.service';

describe('GitService', () => {
  let service: GitService;

  const mockPrismaService = {
    project: {
      findFirst: vi.fn(),
    },
    repository: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    commit: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    pullRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    pullRequestReview: {
      create: vi.fn(),
    },
    integrationConfig: {
      findMany: vi.fn(),
    },
  };

  const mockMessageBusService = {
    publish: vi.fn(),
  };

  const mockLoggerService = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    setContext: vi.fn(),
  };

  const mockWorkspaceService = {
    getWorkspacePath: vi.fn(),
  };

  const mockGitHubSdkService = {
    getClientForIntegration: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: MessageBusService, useValue: mockMessageBusService },
        { provide: ProjectWorkspaceService, useValue: mockWorkspaceService },
        { provide: GitHubSDKService, useValue: mockGitHubSdkService },
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
    const githubRepo = {
      id: 'repo-1',
      projectId: 'proj-1',
      remoteUrl: 'https://github.com/owner/repo.git',
      provider: null,
    };

    const livePulls = [
      {
        id: 101,
        number: 1,
        title: 'Open PR',
        body: 'body-1',
        state: 'open',
        merged: false,
        draft: false,
        labels: ['feat', 'ui'],
        user: { login: 'alice' },
        head: { ref: 'feat-a', sha: 'sha-a' },
        base: { ref: 'main', sha: 'sha-0' },
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-11T00:00:00Z',
        mergedAt: null,
        htmlUrl: 'https://github.com/owner/repo/pull/1',
      },
      {
        id: 102,
        number: 2,
        title: 'Merged PR',
        body: null,
        state: 'closed',
        merged: true,
        draft: false,
        labels: [],
        user: { login: 'bob' },
        head: { ref: 'feat-b', sha: 'sha-b' },
        base: { ref: 'main', sha: 'sha-0' },
        createdAt: '2026-09-09T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
        mergedAt: '2026-09-10T12:00:00Z',
        htmlUrl: 'https://github.com/owner/repo/pull/2',
      },
      {
        id: 103,
        number: 3,
        title: 'Draft PR',
        body: null,
        state: 'open',
        merged: false,
        draft: true,
        user: { login: 'carol' },
        head: { ref: 'feat-c', sha: 'sha-c' },
        base: { ref: 'main', sha: 'sha-0' },
        createdAt: '2026-09-12T00:00:00Z',
        updatedAt: '2026-09-12T00:00:00Z',
        mergedAt: null,
        htmlUrl: 'https://github.com/owner/repo/pull/3',
      },
    ];

    function mockIntegrationCandidates(ids: string[]) {
      mockPrismaService.integrationConfig.findMany.mockResolvedValue(
        ids.map((id) => ({ id, scope: 'global' })),
      );
    }

    function mockLiveClient() {
      const client = { listPullRequests: vi.fn().mockResolvedValue(livePulls) };
      mockIntegrationCandidates(['int-1']);
      mockGitHubSdkService.getClientForIntegration.mockResolvedValue(client);
      return client;
    }

    it('should return local PRs without live fallback when local data exists', async () => {
      mockPrismaService.repository.findFirst.mockResolvedValue(githubRepo);
      const prs = [{ id: 'pr-1', title: 'Fix bug', reviews: [] }];
      mockPrismaService.pullRequest.findMany.mockResolvedValue(prs);

      const result = await service.getPullRequests('repo-1', {}, 'user-1');
      expect(result).toEqual(prs);
      expect(
        mockGitHubSdkService.getClientForIntegration,
      ).not.toHaveBeenCalled();
    });

    it('should fall back to live GitHub pulls when local table is empty', async () => {
      mockPrismaService.repository.findFirst.mockResolvedValue(githubRepo);
      mockPrismaService.pullRequest.findMany.mockResolvedValue([]);
      const client = mockLiveClient();

      const result = await service.getPullRequests('repo-1', {}, 'user-1');

      expect(client.listPullRequests).toHaveBeenCalledWith(
        'owner',
        'repo',
        'all',
      );
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        id: 'gh-live-101',
        repoId: 'repo-1',
        externalId: 'owner/repo#1',
        title: 'Open PR',
        author: 'alice',
        sourceBranch: 'feat-a',
        targetBranch: 'main',
        status: 'open',
        labels: ['feat', 'ui'],
        metadata: {
          source: 'github-live',
          number: 1,
          htmlUrl: 'https://github.com/owner/repo/pull/1',
        },
        reviews: [],
      });
      expect(result[1]).toMatchObject({ status: 'merged', author: 'bob' });
      expect(result[2]).toMatchObject({ status: 'draft', author: 'carol' });
    });

    it('should pull all and filter locally for merged/draft status', async () => {
      mockPrismaService.repository.findFirst.mockResolvedValue(githubRepo);
      mockPrismaService.pullRequest.findMany.mockResolvedValue([]);
      const client = mockLiveClient();

      const result = await service.getPullRequests(
        'repo-1',
        { status: 'merged' },
        'user-1',
      );

      expect(client.listPullRequests).toHaveBeenCalledWith(
        'owner',
        'repo',
        'all',
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ status: 'merged', id: 'gh-live-102' });
    });

    it('should pass open/closed status through to GitHub state', async () => {
      mockPrismaService.repository.findFirst.mockResolvedValue(githubRepo);
      mockPrismaService.pullRequest.findMany.mockResolvedValue([]);
      const client = mockLiveClient();

      const result = await service.getPullRequests(
        'repo-1',
        { status: 'open' },
        'user-1',
      );

      expect(client.listPullRequests).toHaveBeenCalledWith(
        'owner',
        'repo',
        'open',
      );
      expect(result).toHaveLength(3);
    });

    it('should skip live fallback for non-GitHub remoteUrl', async () => {
      mockPrismaService.repository.findFirst.mockResolvedValue({
        ...githubRepo,
        remoteUrl: 'https://gitlab.com/owner/repo.git',
      });
      mockPrismaService.pullRequest.findMany.mockResolvedValue([]);

      const result = await service.getPullRequests('repo-1', {}, 'user-1');

      expect(result).toEqual([]);
      expect(
        mockGitHubSdkService.getClientForIntegration,
      ).not.toHaveBeenCalled();
    });

    it('should return empty array when no github integration is available', async () => {
      mockPrismaService.repository.findFirst.mockResolvedValue({
        ...githubRepo,
        remoteUrl: 'git@github.com:owner/repo.git',
      });
      mockPrismaService.pullRequest.findMany.mockResolvedValue([]);
      mockIntegrationCandidates([]);

      const result = await service.getPullRequests('repo-1', {}, 'user-1');

      expect(result).toEqual([]);
      expect(
        mockGitHubSdkService.getClientForIntegration,
      ).not.toHaveBeenCalled();
    });

    it('should skip stale undecryptable integrations and use the next candidate', async () => {
      mockPrismaService.repository.findFirst.mockResolvedValue(githubRepo);
      mockPrismaService.pullRequest.findMany.mockResolvedValue([]);
      mockIntegrationCandidates(['int-stale', 'int-current']);
      const client = { listPullRequests: vi.fn().mockResolvedValue(livePulls) };
      mockGitHubSdkService.getClientForIntegration
        .mockRejectedValueOnce(new Error('Failed to decrypt token'))
        .mockResolvedValueOnce(client);

      const result = await service.getPullRequests('repo-1', {}, 'user-1');

      expect(
        mockGitHubSdkService.getClientForIntegration,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockGitHubSdkService.getClientForIntegration,
      ).toHaveBeenNthCalledWith(1, 'int-stale');
      expect(
        mockGitHubSdkService.getClientForIntegration,
      ).toHaveBeenNthCalledWith(2, 'int-current');
      expect(result).toHaveLength(3);
    });

    it('should return empty array instead of throwing when GitHub API fails', async () => {
      mockPrismaService.repository.findFirst.mockResolvedValue(githubRepo);
      mockPrismaService.pullRequest.findMany.mockResolvedValue([]);
      const client = {
        listPullRequests: vi
          .fn()
          .mockRejectedValue(new Error('Bad credentials')),
      };
      mockIntegrationCandidates(['int-1']);
      mockGitHubSdkService.getClientForIntegration.mockResolvedValue(client);

      const result = await service.getPullRequests('repo-1', {}, 'user-1');

      expect(result).toEqual([]);
      expect(mockLoggerService.warn).toHaveBeenCalled();
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
