import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { ProjectWorkspaceService } from './project-workspace.service';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import {
  RepositoryQueryDto,
  CommitQueryDto,
  DiffQueryDto,
} from './dto/git-query.dto';
import simpleGit from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly messageBus: MessageBusService,
    private readonly workspace: ProjectWorkspaceService,
  ) {
    this.logger.setContext('GitService');
  }

  async createRepository(dto: CreateRepositoryDto, userId: string) {
    // Validate that project exists and user has access
    const project = await this.prisma.project.findFirst({
      where: {
        id: dto.projectId,
        members: {
          some: {
            userId,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // If localPath is provided, validate it exists and is a git repo
    if (dto.localPath) {
      if (!fs.existsSync(dto.localPath)) {
        throw new BadRequestException('Local path does not exist');
      }

      const gitPath = path.join(dto.localPath, '.git');
      if (!fs.existsSync(gitPath)) {
        throw new BadRequestException('Local path is not a git repository');
      }

      // Try to get default branch from git
      try {
        const git = simpleGit(dto.localPath);
        const branches = await git.branchLocal();
        if (!dto.defaultBranch) {
          dto.defaultBranch = branches.current || 'main';
        }
      } catch (error) {
        this.logger.warn(
          `Failed to read git info from ${dto.localPath}`,
          error,
        );
      }
    }

    const repository = await this.prisma.repository.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        localPath: dto.localPath,
        remoteUrl: dto.remoteUrl,
        role: dto.role,
        defaultBranch: dto.defaultBranch || 'main',
        provider: dto.provider,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.messageBus.publish('repository.created', {
      repositoryId: repository.id,
      projectId: repository.projectId,
    });

    return repository;
  }

  async getRepositories(query: RepositoryQueryDto, userId: string) {
    const where: any = {
      project: {
        members: {
          some: {
            userId,
          },
        },
      },
    };

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.provider) {
      where.provider = query.provider;
    }

    return this.prisma.repository.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getRepositoryById(repoId: string, userId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: {
        id: repoId,
        project: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found or access denied');
    }

    return repository;
  }

  async getRepositoryStatus(repoId: string, userId: string) {
    const repository = await this.getRepositoryById(repoId, userId);

    if (!repository.localPath || !fs.existsSync(repository.localPath)) {
      return {
        clean: true,
        ahead: 0,
        behind: 0,
        changedFiles: [],
        error: 'Local path not available',
      };
    }

    try {
      const git = simpleGit(repository.localPath);
      const status = await git.status();

      const changedFiles = status.files.map((file: any) => ({
        path: file.path,
        status:
          file.index === '?' ? 'untracked' : file.working_dir || file.index,
      }));

      // Get ahead/behind info
      const branchInfo = await git.branch();
      const currentBranch = branchInfo.current;
      let ahead = 0;
      let behind = 0;

      if (currentBranch && repository.remoteUrl) {
        try {
          const branchSummary = await git.branch(['-vv']);
          const branchLine = branchSummary.all.find((b: string) =>
            b.startsWith(currentBranch),
          );
          if (branchLine) {
            const match = branchLine.match(
              /\[([^\]]+)\]|ahead (\d+)|behind (\d+)/g,
            );
            if (match) {
              match.forEach((m: string) => {
                if (m.includes('ahead')) {
                  ahead = parseInt(m.match(/\d+/)?.[0] || '0', 10);
                }
                if (m.includes('behind')) {
                  behind = parseInt(m.match(/\d+/)?.[0] || '0', 10);
                }
              });
            }
          }
        } catch (error) {
          this.logger.warn('Failed to get branch tracking info', error);
        }
      }

      return {
        clean: status.isClean(),
        ahead,
        behind,
        changedFiles,
        currentBranch,
      };
    } catch (error) {
      this.logger.error('Failed to get repository status', error);
      throw new BadRequestException('Failed to get repository status');
    }
  }

  async getCommits(repoId: string, query: CommitQueryDto, userId: string) {
    const repository = await this.getRepositoryById(repoId, userId);

    if (!repository.localPath || !fs.existsSync(repository.localPath)) {
      return {
        data: [],
        total: 0,
        page: query.page || 1,
        pageSize: query.pageSize || 20,
      };
    }

    try {
      const git = simpleGit(repository.localPath);
      const options: any = {
        maxCount: query.pageSize || 20,
        format: {
          hash: '%H',
          authorName: '%an',
          authorEmail: '%ae',
          authorDate: '%ai',
          message: '%s',
        },
      };

      if (query.from) {
        options.from = query.from;
      }
      if (query.to) {
        options.to = query.to;
      }
      if (query.author) {
        options.author = query.author;
      }
      if (query.path) {
        options.path = query.path;
      }

      const log = await git.log(options);

      // Map to our Commit model format and save to database
      const commits = await Promise.all(
        log.all.map(async (commit: any) => {
          // Check if commit already exists
          let dbCommit = await this.prisma.commit.findFirst({
            where: {
              repoId,
              hash: commit.hash,
            },
            include: {
              files: true,
            },
          });

          if (!dbCommit) {
            // Get changed files
            const diffSummary = await git.diffSummary([
              `${commit.hash}^`,
              commit.hash,
            ]);

            dbCommit = await this.prisma.commit.create({
              data: {
                repoId,
                hash: commit.hash,
                authorName: commit.author_name,
                authorEmail: commit.author_email,
                authorDate: new Date(commit.date),
                message: commit.message,
                files: {
                  create: diffSummary.files.map((file: any) => ({
                    path: file.file,
                    status: file.binary ? 'binary' : 'modified',
                    additions: file.insertions,
                    deletions: file.deletions,
                    changes: file.changes,
                  })),
                },
              },
              include: {
                files: true,
              },
            });
          }

          return dbCommit;
        }),
      );

      return {
        data: commits,
        total: log.total,
        page: query.page || 1,
        pageSize: query.pageSize || 20,
      };
    } catch (error) {
      this.logger.error('Failed to get commits', error);
      throw new BadRequestException('Failed to get commits');
    }
  }

  async getCommitById(commitId: string, userId: string) {
    const commit = await this.prisma.commit.findUnique({
      where: { id: commitId },
      include: {
        repo: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                members: {
                  where: {
                    userId,
                  },
                },
              },
            },
          },
        },
        files: true,
      },
    });

    if (!commit || commit.repo.project.members.length === 0) {
      throw new NotFoundException('Commit not found or access denied');
    }

    return commit;
  }

  async generateDiff(dto: DiffQueryDto, userId: string) {
    const repository = await this.getRepositoryById(dto.repoId, userId);

    if (!repository.localPath || !fs.existsSync(repository.localPath)) {
      throw new BadRequestException('Local path not available');
    }

    try {
      const git = simpleGit(repository.localPath);
      const diffSummary = await git.diffSummary([
        dto.baseRef,
        dto.targetRef,
        ...(dto.pathFilter || []),
      ]);

      const files = diffSummary.files.map((file: any) => ({
        path: file.file,
        status: file.binary
          ? 'binary'
          : file.insertions > 0 && file.deletions === 0
            ? 'added'
            : file.insertions === 0 && file.deletions > 0
              ? 'deleted'
              : 'modified',
        additions: file.insertions,
        deletions: file.deletions,
        changes: file.changes,
      }));

      const totalAdditions =
        typeof diffSummary.insertions === 'object' &&
        'total' in diffSummary.insertions
          ? (diffSummary.insertions as any).total
          : (diffSummary.insertions as number);
      const totalDeletions =
        typeof diffSummary.deletions === 'object' &&
        'total' in diffSummary.deletions
          ? (diffSummary.deletions as any).total
          : (diffSummary.deletions as number);

      return {
        files,
        totalAdditions,
        totalDeletions,
        totalChanges: diffSummary.changed,
      };
    } catch (error) {
      this.logger.error('Failed to generate diff', error);
      throw new BadRequestException('Failed to generate diff');
    }
  }

  async getPullRequests(repoId: string, query: any, userId: string) {
    const repository = await this.getRepositoryById(repoId, userId);

    const where: any = {
      repoId: repository.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.author) {
      where.author = query.author;
    }

    return this.prisma.pullRequest.findMany({
      where,
      include: {
        reviews: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getPullRequestById(prId: string, userId: string) {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id: prId },
      include: {
        repo: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                members: {
                  where: {
                    userId,
                  },
                },
              },
            },
          },
        },
        reviews: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!pr || pr.repo.project.members.length === 0) {
      throw new NotFoundException('Pull request not found or access denied');
    }

    return pr;
  }

  async createPullRequestReview(
    prId: string,
    dto: {
      type: string;
      state: string;
      summary?: string;
      comments?: any[];
    },
    userId: string,
  ) {
    const pr = await this.getPullRequestById(prId, userId);

    const review = await this.prisma.pullRequestReview.create({
      data: {
        prId: pr.id,
        reviewerId: userId,
        type: dto.type,
        state: dto.state,
        summary: dto.summary,
        comments: dto.comments || [],
      },
    });

    this.messageBus.publish('pull_request.review.created', {
      prId: pr.id,
      reviewId: review.id,
    });

    return review;
  }

  // Branch Management
  async getBranches(
    repoId: string,
    userId: string,
    includeRemote: boolean = false,
  ) {
    const repository = await this.getRepositoryById(repoId, userId);

    if (!repository.localPath || !fs.existsSync(repository.localPath)) {
      return {
        local: [],
        remote: [],
        current: null,
      };
    }

    try {
      const git = simpleGit(repository.localPath);
      const branchSummary = await git.branchLocal();
      const currentBranch = branchSummary.current;

      const localBranches = branchSummary.all.map((branch: string) => ({
        name: branch,
        current: branch === currentBranch,
        tracking: null as string | null,
      }));

      let remoteBranches: any[] = [];
      if (includeRemote) {
        try {
          const remoteSummary = await git.branch(['-r']);
          remoteBranches = remoteSummary.all.map((branch: string) => ({
            name: branch.replace(/^origin\//, ''),
            remote: 'origin',
            fullName: branch,
          }));
        } catch (error) {
          this.logger.warn('Failed to get remote branches', error);
        }
      }

      // Get tracking information
      const branchInfo = await git.branch(['-vv']);
      const branchesWithTracking = localBranches.map((branch) => {
        const branchLine = branchInfo.all.find((b: string) =>
          b.startsWith(branch.name),
        );
        if (branchLine) {
          const trackingMatch = branchLine.match(/\[([^\]]+)\]/);
          if (trackingMatch) {
            branch.tracking = trackingMatch[1];
          }
        }
        return branch;
      });

      return {
        local: branchesWithTracking,
        remote: remoteBranches,
        current: currentBranch,
      };
    } catch (error) {
      this.logger.error('Failed to get branches', error);
      throw new BadRequestException('Failed to get branches');
    }
  }

  async createBranch(
    repoId: string,
    userId: string,
    dto: { name: string; from?: string; checkout?: boolean },
  ) {
    const repository = await this.getRepositoryById(repoId, userId);

    if (!repository.localPath || !fs.existsSync(repository.localPath)) {
      throw new BadRequestException('Local path not available');
    }

    try {
      const git = simpleGit(repository.localPath);

      if (dto.from) {
        await git.checkout(dto.from);
      }

      await git.checkoutLocalBranch(dto.name);

      if (dto.checkout) {
        await git.checkout(dto.name);
      }

      return {
        success: true,
        branch: dto.name,
      };
    } catch (error: any) {
      this.logger.error('Failed to create branch', error);
      throw new BadRequestException(
        `Failed to create branch: ${error.message}`,
      );
    }
  }

  async deleteBranch(
    repoId: string,
    userId: string,
    branchName: string,
    force: boolean = false,
  ) {
    const repository = await this.getRepositoryById(repoId, userId);

    if (!repository.localPath || !fs.existsSync(repository.localPath)) {
      throw new BadRequestException('Local path not available');
    }

    try {
      const git = simpleGit(repository.localPath);
      await git.deleteLocalBranch(branchName, force);

      return {
        success: true,
        branch: branchName,
      };
    } catch (error: any) {
      this.logger.error('Failed to delete branch', error);
      throw new BadRequestException(
        `Failed to delete branch: ${error.message}`,
      );
    }
  }

  async checkoutBranch(
    repoId: string,
    userId: string,
    branchName: string,
    dto?: { create?: boolean; from?: string },
  ) {
    const repository = await this.getRepositoryById(repoId, userId);

    if (!repository.localPath || !fs.existsSync(repository.localPath)) {
      throw new BadRequestException('Local path not available');
    }

    try {
      const git = simpleGit(repository.localPath);

      if (dto?.create) {
        if (dto.from) {
          await git.checkout(dto.from);
        }
        await git.checkoutLocalBranch(branchName);
      } else {
        await git.checkout(branchName);
      }

      return {
        success: true,
        branch: branchName,
      };
    } catch (error: any) {
      this.logger.error('Failed to checkout branch', error);
      throw new BadRequestException(
        `Failed to checkout branch: ${error.message}`,
      );
    }
  }

  // Enhanced Diff APIs
  async getWorkingDiff(repoId: string, userId: string) {
    const repository = await this.getRepositoryById(repoId, userId);

    if (!repository.localPath || !fs.existsSync(repository.localPath)) {
      throw new BadRequestException('Local path not available');
    }

    try {
      const git = simpleGit(repository.localPath);
      const diffSummary = await git.diffSummary(['HEAD']);

      const files = diffSummary.files.map((file: any) => ({
        path: file.file,
        status: file.binary
          ? 'binary'
          : file.insertions > 0 && file.deletions === 0
            ? 'added'
            : file.insertions === 0 && file.deletions > 0
              ? 'deleted'
              : 'modified',
        additions: file.insertions,
        deletions: file.deletions,
        changes: file.changes,
      }));

      const totalAdditions =
        typeof diffSummary.insertions === 'object' &&
        'total' in diffSummary.insertions
          ? (diffSummary.insertions as any).total
          : (diffSummary.insertions as number);
      const totalDeletions =
        typeof diffSummary.deletions === 'object' &&
        'total' in diffSummary.deletions
          ? (diffSummary.deletions as any).total
          : (diffSummary.deletions as number);

      return {
        files,
        totalAdditions,
        totalDeletions,
        totalChanges: diffSummary.changed,
      };
    } catch (error) {
      this.logger.error('Failed to get working diff', error);
      throw new BadRequestException('Failed to get working diff');
    }
  }

  async getStagedDiff(repoId: string, userId: string) {
    const repository = await this.getRepositoryById(repoId, userId);

    if (!repository.localPath || !fs.existsSync(repository.localPath)) {
      throw new BadRequestException('Local path not available');
    }

    try {
      const git = simpleGit(repository.localPath);
      const diffSummary = await git.diffSummary(['--cached', 'HEAD']);

      const files = diffSummary.files.map((file: any) => ({
        path: file.file,
        status: file.binary
          ? 'binary'
          : file.insertions > 0 && file.deletions === 0
            ? 'added'
            : file.insertions === 0 && file.deletions > 0
              ? 'deleted'
              : 'modified',
        additions: file.insertions,
        deletions: file.deletions,
        changes: file.changes,
      }));

      const totalAdditions =
        typeof diffSummary.insertions === 'object' &&
        'total' in diffSummary.insertions
          ? (diffSummary.insertions as any).total
          : (diffSummary.insertions as number);
      const totalDeletions =
        typeof diffSummary.deletions === 'object' &&
        'total' in diffSummary.deletions
          ? (diffSummary.deletions as any).total
          : (diffSummary.deletions as number);

      return {
        files,
        totalAdditions,
        totalDeletions,
        totalChanges: diffSummary.changed,
      };
    } catch (error) {
      this.logger.error('Failed to get staged diff', error);
      throw new BadRequestException('Failed to get staged diff');
    }
  }
}
