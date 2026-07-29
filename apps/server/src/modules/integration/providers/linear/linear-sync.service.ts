import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma.service';
import { MessageBusService } from '../../../../core/message-bus/message-bus.service';
import { EncryptionService } from '../../../../core/crypto/encryption.service';
import { LinearClient } from './linear-client';
import { LinearProviderService } from './linear-provider.service';
import {
  LINEAR_CONFLICT_WINDOW_MS,
  LINEAR_LOCKED_PROJECT_FIELDS,
  LINEAR_PRIORITY_TO_TASK,
  LINEAR_STATE_TYPE_TO_WORKFLOW,
  TASK_PRIORITY_TO_LINEAR,
  TASK_PROVIDER_LINEAR,
} from './linear.constants';
import type { SyncDirection } from './linear.constants';
import type {
  LinearIssue,
  LinearProject,
  LinearTeam,
} from './linear.types';

const STATUS_NORMALIZE: Record<string, string> = {
  backlog: 'backlog',
  planned: 'planned',
  in_progress: 'in_progress',
  completed: 'completed',
  canceled: 'canceled',
};

export interface SyncSummary {
  added: number;
  updated: number;
  conflicts: number;
  errors: number;
  errors_detail?: Array<{ id?: string; message: string }>;
}

export interface SyncProgress {
  phase: 'fetching' | 'syncing' | 'completed' | 'error';
  current: number;
  total: number;
  message: string;
  currentItem?: string;
}

export interface SyncJobResult {
  jobId: string;
  status: 'started' | 'completed' | 'failed';
  summary?: SyncSummary;
  error?: string;
}

export type ProgressCallback = (progress: SyncProgress) => void | Promise<void>;

@Injectable()
export class LinearSyncService {
  private readonly logger = new Logger(LinearSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly provider: LinearProviderService,
    private readonly messageBus: MessageBusService,
  ) {}

  /**
   * 从 IntegrationConfig 拿到 LinearClient（解密 API Key）
   */
  private async getClient(integrationId: string): Promise<LinearClient> {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });
    if (!integration) {
      throw new NotFoundException(`Integration ${integrationId} not found`);
    }
    if (integration.provider !== TASK_PROVIDER_LINEAR) {
      throw new BadRequestException(
        `Integration ${integrationId} is not Linear (provider=${integration.provider})`,
      );
    }
    let apiKey: string;
    try {
      const decrypted = this.encryption.decryptJson<{
        apiKey: string;
        apiKeyType?: string;
        defaultTeamId?: string;
      }>(integration.configJson as unknown as string);
      apiKey = decrypted.apiKey;
      if (!apiKey) {
        throw new Error('Missing apiKey');
      }
    } catch (err) {
      throw new BadRequestException(
        `Failed to decrypt Linear configuration: ${(err as Error).message}`,
      );
    }
    return new LinearClient(apiKey);
  }

  private async assertProjectMember(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException(
        'You do not have access to this project',
      );
    }
    return project;
  }

  private async logSync(
    integrationId: string,
    projectId: string | null,
    resourceType: 'project' | 'task',
    resourceId: string | null,
    action: string,
    direction: 'inbound' | 'outbound' | 'internal',
    status: 'success' | 'failed' | 'conflict',
    message?: string,
    payload?: Record<string, unknown>,
  ) {
    await this.prisma.integrationSyncLog.create({
      data: {
        integrationId,
        projectId: projectId ?? undefined,
        resourceType,
        resourceId: resourceId ?? undefined,
        action,
        direction,
        status,
        message,
        payload: payload ? (payload as any) : undefined,
      },
    });
  }

  private normalizeWorkflowStatus(
    type: string | null | undefined,
    name: string | null | undefined,
  ): string {
    if (type && LINEAR_STATE_TYPE_TO_WORKFLOW[type.toLowerCase()]) {
      return LINEAR_STATE_TYPE_TO_WORKFLOW[type.toLowerCase()];
    }
    if (name) {
      const key = name.toLowerCase().replace(/[\s-]/g, '_');
      if (STATUS_NORMALIZE[key]) {
        return STATUS_NORMALIZE[key];
      }
    }
    return 'planned';
  }

  private normalizePriority(p: number | null | undefined): string {
    if (p == null) return 'medium';
    return LINEAR_PRIORITY_TO_TASK[p] ?? 'medium';
  }

  /**
   * 单向拉取 Linear project → 本地 project
   * - 若 targetLocalProjectId 提供，则仅更新 name/description/icon/color/workflowStatus/priority/healthStatus/targetDate
   * - 若未提供，则新建本地 project（source=linear, fieldsLockedExternally=true）
   */
  async syncProject(args: {
    integrationId: string;
    linearProjectId: string;
    targetLocalProjectId?: string;
    actorId: string;
  }): Promise<{
    projectId: string;
    linearProjectId: string;
    created: boolean;
    status: 'synced';
  }> {
    const { integrationId, linearProjectId, targetLocalProjectId, actorId } = args;
    const client = await this.getClient(integrationId);
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });
    if (!integration) {
      throw new NotFoundException(`Integration ${integrationId} not found`);
    }

    if (targetLocalProjectId) {
      await this.assertProjectMember(targetLocalProjectId, actorId);
    }

    // 拉取 Linear project 详情
    let linearProject: LinearProject | null = null;
    try {
      const projPage = await this.provider.fetchProjects(client, { first: 250 });
      const found = projPage.projects.find((p) => p.id === linearProjectId);
      if (found) {
        linearProject = found;
      }
    } catch (err) {
      await this.logSync(
        integrationId,
        targetLocalProjectId ?? null,
        'project',
        linearProjectId,
        'pull',
        'inbound',
        'failed',
        (err as Error).message,
      );
      throw err;
    }

    if (!linearProject) {
      throw new NotFoundException(
        `Linear project ${linearProjectId} not visible to this API key`,
      );
    }

    const externalWorkspace = linearProject.teams?.nodes?.[0]
      ? linearProject.teams.nodes[0].id
      : null;

    let created = false;
    let projectId: string;
    const externalUrl = linearProject.url ?? null;

    if (targetLocalProjectId) {
      // 已绑定，仅更新外部字段
      const updated = await this.prisma.project.update({
        where: { id: targetLocalProjectId },
        data: {
          name: linearProject.name,
          description: linearProject.description ?? null,
          icon: linearProject.icon ?? null,
          color: linearProject.color ?? null,
          workflowStatus: this.normalizeWorkflowStatus(null, linearProject.state ?? null),
          priority: this.normalizePriority(linearProject.priority),
          targetDate: linearProject.targetDate
            ? new Date(linearProject.targetDate)
            : null,
          externalProvider: TASK_PROVIDER_LINEAR,
          externalProjectId: linearProject.id,
          syncStatus: 'synced',
          lastSyncAt: new Date(),
          syncErrorMessage: null,
        },
      });
      projectId = updated.id;
    } else {
      // 新建本地 Project
      const isMember = await this.prisma.projectMember.findFirst({
        where: { projectId: integration.projectId ?? '' },
      }).catch(() => null);
      void isMember;
      const created_ = await this.prisma.project.create({
        data: {
          name: linearProject.name,
          description: linearProject.description ?? null,
          icon: linearProject.icon ?? null,
          color: linearProject.color ?? null,
          type: 'team',
          visibility: 'internal',
          status: 'active',
          source: TASK_PROVIDER_LINEAR,
          externalProvider: TASK_PROVIDER_LINEAR,
          externalProjectId: linearProject.id,
          fieldsLockedExternally: true,
          workflowStatus: this.normalizeWorkflowStatus(
            null,
            linearProject.state ?? null,
          ),
          priority: this.normalizePriority(linearProject.priority),
          targetDate: linearProject.targetDate
            ? new Date(linearProject.targetDate)
            : null,
          syncStatus: 'synced',
          lastSyncAt: new Date(),
          syncErrorMessage: null,
          createdBy: actorId,
          members: {
            create: { userId: actorId, role: 'owner' },
          },
        },
      });
      projectId = created_.id;
      created = true;
    }

    // 维护 TaskProviderLink
    await this.prisma.taskProviderLink.upsert({
      where: {
        integrationId_externalProjectId: {
          integrationId,
          externalProjectId: linearProject.id,
        },
      },
      create: {
        integrationId,
        projectId,
        externalProvider: TASK_PROVIDER_LINEAR,
        externalProjectId: linearProject.id,
        externalWorkspaceId: externalWorkspace,
        syncStatus: 'synced',
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
      update: {
        projectId,
        externalWorkspaceId: externalWorkspace,
        syncStatus: 'synced',
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
    });

    // 维护 ExternalProjectLink（可视化用）
    await this.prisma.externalProjectLink.upsert({
      where: {
        projectId_provider: {
          projectId,
          provider: TASK_PROVIDER_LINEAR,
        },
      },
      create: {
        projectId,
        provider: TASK_PROVIDER_LINEAR,
        externalProjectId: linearProject.id,
        externalProjectUrl: externalUrl ?? '',
        lastSyncAt: new Date(),
        syncStatus: 'active',
      },
      update: {
        lastSyncAt: new Date(),
        syncStatus: 'active',
        externalProjectUrl: externalUrl ?? '',
        externalProjectId: linearProject.id,
      },
    });

    await this.logSync(
      integrationId,
      projectId,
      'project',
      linearProject.id,
      'pull',
      'inbound',
      'success',
      created ? 'Project created from Linear' : 'Project fields updated',
    );

    this.messageBus.publish('linear.sync.completed', {
      integrationId,
      projectId,
      action: 'pull_project',
      created,
      linearProjectId: linearProject.id,
    });

    return {
      projectId,
      linearProjectId: linearProject.id,
      created,
      status: 'synced',
    };
  }

  /**
   * 任务双向同步（核心状态机）
   * direction: pull / push / two-way / force-pull / force-push
   */
  async syncProjectTasks(args: {
    projectId: string;
    integrationId: string;
    linearProjectId: string;
    direction: SyncDirection;
    taskIds?: string[];
    actorId: string;
    confirm?: boolean;
    progressCallback?: ProgressCallback;
  }): Promise<SyncSummary> {
    const {
      projectId,
      integrationId,
      linearProjectId,
      direction,
      taskIds,
      actorId,
      confirm,
      progressCallback,
    } = args;

    const emitProgress = async (progress: SyncProgress) => {
      if (progressCallback) {
        await progressCallback(progress);
      }
      this.messageBus.publish('linear.sync.progress', {
        projectId,
        ...progress,
      });
    };

    await this.assertProjectMember(projectId, actorId);

    if (direction.startsWith('force-') && !confirm) {
      throw new BadRequestException(
        `Force sync requires explicit confirmation (confirm: true)`,
      );
    }

    const client = await this.getClient(integrationId);
    const summary: SyncSummary = {
      added: 0,
      updated: 0,
      conflicts: 0,
      errors: 0,
      errors_detail: [],
    };

    // 阶段1：拉取 Linear issues（全部分页）
    await emitProgress({
      phase: 'fetching',
      current: 0,
      total: 100,
      message: 'Fetching Linear issues...',
    });

    const linearIssues: LinearIssue[] = [];
    let cursor: string | null = null;
    let pageNum = 0;
    do {
      const page = await this.provider.fetchProjectIssues(client, linearProjectId, {
        first: 50,
        after: cursor,
      });
      linearIssues.push(...page.issues);
      pageNum++;
      await emitProgress({
        phase: 'fetching',
        current: pageNum * 10,
        total: 100,
        message: `Fetching issues... (${linearIssues.length} loaded)`,
      });
      if (page.issues.length === 0 || !page.hasNextPage) break;
      cursor = page.endCursor ?? null;
      if (!cursor) break;
    } while (cursor != null && linearIssues.length < 500);

    // 拉取本地已绑定的任务
    const localTasks = await this.prisma.task.findMany({
      where: {
        projectId,
        externalProvider: TASK_PROVIDER_LINEAR,
        ...(taskIds && taskIds.length > 0 ? { id: { in: taskIds } } : {}),
      },
    });

    const localByExternalId = new Map(localTasks.map((t) => [t.externalIssueId, t]));
    const linearById = new Map(linearIssues.map((i) => [i.id, i]));

    // 一、pull / two-way：从 Linear 拉
    const totalPullItems = linearIssues.length;
    let pullIndex = 0;
    if (direction === 'pull' || direction === 'two-way' || direction === 'force-pull') {
      for (const issue of linearIssues) {
        pullIndex++;
        await emitProgress({
          phase: 'syncing',
          current: Math.floor((pullIndex / totalPullItems) * 80),
          total: 100,
          message: `Pulling: ${issue.identifier}`,
          currentItem: issue.identifier,
        });

        const local = localByExternalId.get(issue.id);
        const incoming = this.issueToTaskPatch(issue);

        if (!local) {
          // 新建
          try {
            await this.prisma.task.create({
              data: {
                projectId,
                title: incoming.title,
                description: incoming.description ?? null,
                status: incoming.status,
                priority: incoming.priority,
                type: 'task',
                externalProvider: TASK_PROVIDER_LINEAR,
                externalIssueId: issue.id,
                externalIdentifier: issue.identifier,
                externalUrl: issue.url,
                externalVersion: issue.updatedAt,
                syncStatus: 'synced',
                lastExternalSyncAt: new Date(),
                localUpdatedAt: new Date(),
                reporterId: actorId,
              },
            });
            summary.added++;
            await this.logSync(
              integrationId,
              projectId,
              'task',
              issue.id,
              'pull',
              'inbound',
              'success',
              `Task ${issue.identifier} created`,
            );
          } catch (err) {
            summary.errors++;
            summary.errors_detail?.push({
              id: issue.identifier,
              message: (err as Error).message,
            });
          }
          continue;
        }

        // 已存在 → 比较版本（hybrid 策略）
        const conflict = this.detectConflict(local, issue);
        if (conflict.hasConflict && direction !== 'force-pull') {
          // 标记冲突并跳过
          await this.prisma.task.update({
            where: { id: local.id },
            data: {
              syncStatus: 'conflict',
              metadata: {
                ...(local.metadata as Record<string, unknown> | null),
                conflictHistory: [
                  ...(((local.metadata as any)?.conflictHistory as any[]) ?? []),
                  {
                    direction,
                    detectedAt: new Date().toISOString(),
                    localVersion: local.externalVersion,
                    remoteVersion: issue.updatedAt,
                    localFields: conflict.localFields,
                  },
                ],
              },
            },
          });
          await this.logSync(
            integrationId,
            projectId,
            'task',
            issue.id,
            'pull',
            'inbound',
            'conflict',
            `Conflict detected on ${issue.identifier}`,
          );
          summary.conflicts++;
          this.messageBus.publish('linear.task.conflict', {
            integrationId,
            projectId,
            taskId: local.id,
            externalIssueId: issue.id,
            identifier: issue.identifier,
            localFields: conflict.localFields,
            detectedAt: new Date().toISOString(),
          });
          continue;
        }

        // pull 更新
        try {
          await this.prisma.task.update({
            where: { id: local.id },
            data: {
              title: incoming.title,
              description: incoming.description ?? null,
              status: incoming.status,
              priority: incoming.priority,
              externalVersion: issue.updatedAt,
              syncStatus: 'synced',
              lastExternalSyncAt: new Date(),
            },
          });
          summary.updated++;
          this.messageBus.publish('linear.task.pulled', {
            integrationId,
            projectId,
            taskId: local.id,
            externalIssueId: issue.id,
            identifier: issue.identifier,
            direction,
          });
        } catch (err) {
          summary.errors++;
          summary.errors_detail?.push({
            id: issue.identifier,
            message: (err as Error).message,
          });
        }
      }
    }

    // 二、push / two-way：把本地变更推到 Linear
    if (direction === 'push' || direction === 'two-way' || direction === 'force-push') {
      const tasksToPush = await this.prisma.task.findMany({
        where: {
          projectId,
          externalProvider: TASK_PROVIDER_LINEAR,
          externalIssueId: { not: null },
          ...(direction === 'push' || direction === 'force-push'
            ? {}
            : // two-way 只推 localUpdatedAt 较新的
              {
                OR: [
                  { syncStatus: { in: ['pending', 'error'] } },
                  { lastExternalSyncAt: null },
                  {
                    localUpdatedAt: {
                      gt: new Date(Date.now() - 60 * 60 * 1000),
                    },
                  },
                ],
              }),
          ...(taskIds && taskIds.length > 0 ? { id: { in: taskIds } } : {}),
        },
      });

      let pushIndex = 0;
      const totalPushItems = tasksToPush.length;
      for (const task of tasksToPush) {
        pushIndex++;
        if (pushIndex % 5 === 0 || pushIndex === totalPushItems) {
          await emitProgress({
            phase: 'syncing',
            current: 80 + Math.floor((pushIndex / Math.max(totalPushItems, 1)) * 20),
            total: 100,
            message: `Pushing: ${task.externalIdentifier ?? task.id}`,
            currentItem: task.externalIdentifier ?? undefined,
          });
        }
        if (!task.externalIssueId) continue;
        const issueId = task.externalIssueId;
        const matchingIssue = linearById.get(issueId);

        // 如果 Linear 端已被删除
        if (!matchingIssue && direction !== 'force-push') {
          // 跳过，已删除不同步
          await this.logSync(
            integrationId,
            projectId,
            'task',
            issueId,
            'push',
            'outbound',
            'failed',
            `Issue ${issueId} no longer exists on Linear side`,
          );
          summary.errors++;
          continue;
        }

        const input = this.taskToIssueInput(task);
        try {
          const result = await this.provider.updateIssue(client, issueId, input);
          if (result?.success) {
            await this.prisma.task.update({
              where: { id: task.id },
              data: {
                syncStatus: 'synced',
                lastExternalSyncAt: new Date(),
                externalVersion: result.issue?.updatedAt ?? task.externalVersion,
              },
            });
            summary.updated++;
            await this.logSync(
              integrationId,
              projectId,
              'task',
              issueId,
              'push',
              'outbound',
              'success',
              `Pushed task ${task.externalIdentifier ?? task.id}`,
            );
            this.messageBus.publish('linear.task.pushed', {
              integrationId,
              projectId,
              taskId: task.id,
              externalIssueId: issueId,
              identifier: task.externalIdentifier,
              direction,
            });
          } else {
            summary.errors++;
            await this.prisma.task.update({
              where: { id: task.id },
              data: { syncStatus: 'error' },
            });
          }
        } catch (err) {
          summary.errors++;
          summary.errors_detail?.push({
            id: task.externalIdentifier ?? task.id,
            message: (err as Error).message,
          });
          await this.prisma.task.update({
            where: { id: task.id },
            data: { syncStatus: 'error' },
          });
          await this.logSync(
            integrationId,
            projectId,
            'task',
            issueId,
            'push',
            'outbound',
            'failed',
            (err as Error).message,
          );
        }
      }
    }

    // 更新 Project 同步状态
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        lastSyncAt: new Date(),
        syncStatus: summary.errors > 0 ? 'error' : 'synced',
        syncErrorMessage:
          summary.errors > 0
            ? `${summary.errors} issue(s) failed; see sync log`
            : null,
      },
    });

    await emitProgress({
      phase: 'completed',
      current: 100,
      total: 100,
      message: `Sync completed: +${summary.added} added, ~${summary.updated} updated, !${summary.conflicts} conflicts, ×${summary.errors} errors`,
    });

    this.messageBus.publish('linear.sync.completed', {
      integrationId,
      projectId,
      action: `sync_tasks_${direction}`,
      summary,
    });

    return summary;
  }

  /**
   * 创建 Linear issue（推送本地任务到 Linear）
   */
  async pushCreateTask(args: {
    projectId: string;
    integrationId: string;
    localTaskId: string;
    actorId: string;
  }) {
    const { projectId, integrationId, localTaskId, actorId } = args;
    await this.assertProjectMember(projectId, actorId);
    const task = await this.prisma.task.findFirst({
      where: { id: localTaskId, projectId },
    });
    if (!task) throw new NotFoundException('Local task not found');
    if (task.externalProvider === TASK_PROVIDER_LINEAR && task.externalIssueId) {
      throw new ConflictException(
        'Task is already linked to a Linear issue',
      );
    }
    const link = await this.prisma.taskProviderLink.findFirst({
      where: { projectId, integrationId },
    });
    if (!link) {
      throw new BadRequestException(
        'Project is not linked to a Linear project. Please run project sync first.',
      );
    }
    const client = await this.getClient(integrationId);
    const input = this.taskToIssueInput(task);
    // Linear 团队映射：本系统中 Linear 实际团队 ID 写在 link.externalTeamId
    if (link.externalTeamId) {
      (input as any).teamId = link.externalTeamId;
    } else {
      (input as any).projectId = link.externalProjectId;
    }
    const result = await this.provider.createIssue(client, input);
    if (!result?.success || !result.issue) {
      throw new BadRequestException(
        'Linear rejected issue creation (see logs)',
      );
    }
    await this.prisma.task.update({
      where: { id: task.id },
      data: {
        externalProvider: TASK_PROVIDER_LINEAR,
        externalIssueId: result.issue.id,
        externalIdentifier: result.issue.identifier,
        externalUrl: result.issue.url,
        externalVersion: result.issue.updatedAt,
        syncStatus: 'synced',
        lastExternalSyncAt: new Date(),
      },
    });
    return {
      taskId: task.id,
      linearIssueId: result.issue.id,
      identifier: result.issue.identifier,
      url: result.issue.url,
    };
  }

  /**
   * 手动解决冲突（use_linear | use_local | keep_both）
   */
  async resolveConflict(args: {
    taskId: string;
    integrationId: string;
    resolution: 'use_linear' | 'use_local' | 'keep_both';
    actorId: string;
  }) {
    const { taskId, integrationId, resolution, actorId } = args;
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (!task.project) throw new BadRequestException('Task not linked to a project');
    const isMember = task.project.members.some((m) => m.userId === actorId);
    if (!isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }
    if (!task.externalIssueId) {
      throw new BadRequestException('Task is not linked to Linear');
    }

    if (resolution === 'use_local') {
      return this.pushTaskToLinear(taskId, integrationId, actorId);
    }

    const client = await this.getClient(integrationId);
    const issue = await this.fetchIssue(client, task.externalIssueId);
    const incoming = this.issueToTaskPatch(issue);

    if (resolution === 'keep_both') {
      // 在本地创建一条新任务记录 Linear 的版本
      const created = await this.prisma.task.create({
        data: {
          projectId: task.projectId,
          title: `${incoming.title} (remote copy)`,
          description: incoming.description ?? null,
          status: incoming.status,
          priority: incoming.priority,
          type: 'task',
          externalProvider: TASK_PROVIDER_LINEAR,
          externalIssueId: issue.id,
          externalIdentifier: issue.identifier,
          externalUrl: issue.url,
          externalVersion: issue.updatedAt,
          syncStatus: 'synced',
          lastExternalSyncAt: new Date(),
          reporterId: actorId,
          parentTaskId: task.parentTaskId ?? null,
        },
      });
      await this.prisma.task.update({
        where: { id: taskId },
        data: { syncStatus: 'synced' },
      });
      this.messageBus.publish('linear.task.resolved', {
        integrationId,
        projectId: task.projectId,
        taskId,
        externalIssueId: task.externalIssueId,
        identifier: issue.identifier,
        resolution,
        createdRemoteCopyId: created.id,
      });
      return { resolution, createdRemoteCopyId: created.id };
    }

    // use_linear
    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: incoming.title,
        description: incoming.description ?? null,
        status: incoming.status,
        priority: incoming.priority,
        externalVersion: issue.updatedAt,
        syncStatus: 'synced',
        lastExternalSyncAt: new Date(),
      },
    });
    this.messageBus.publish('linear.task.resolved', {
      integrationId,
      projectId: task.projectId,
      taskId,
      externalIssueId: task.externalIssueId,
      identifier: issue.identifier,
      resolution,
    });
    return { resolution, taskId };
  }

  /**
   * 推送单个任务到 Linear（resolve / 用作常规 push）
   */
  private async pushTaskToLinear(
    taskId: string,
    integrationId: string,
    actorId: string,
  ): Promise<{ taskId: string; resolution: 'use_local' }> {
    void actorId;
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!task || !task.externalIssueId) {
      throw new BadRequestException('Task is not linked to Linear');
    }
    const client = await this.getClient(integrationId);
    const input = this.taskToIssueInput(task);
    const result = await this.provider.updateIssue(
      client,
      task.externalIssueId,
      input,
    );
    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        syncStatus: result?.success ? 'synced' : 'error',
        externalVersion: result?.issue?.updatedAt ?? task.externalVersion,
        lastExternalSyncAt: new Date(),
      },
    });
    this.messageBus.publish('linear.task.resolved', {
      integrationId,
      projectId: task.projectId,
      taskId,
      externalIssueId: task.externalIssueId,
      identifier: task.externalIdentifier,
      resolution: 'use_local',
    });
    return { taskId, resolution: 'use_local' };
  }

  /**
   * 测试连接 + 获取 viewer 信息
   */
  async testConnection(integrationId: string) {
    const client = await this.getClient(integrationId);
    const viewer = await this.provider.fetchViewer(client);
    return {
      ok: true,
      viewer: {
        id: viewer.id,
        name: viewer.name,
        email: viewer.email,
        organizations: viewer.organization
          ? [
              {
                id: viewer.organization.id,
                name: viewer.organization.name,
                urlKey: viewer.organization.urlKey,
              },
            ]
          : [],
        teams: viewer.teams?.nodes ?? [],
      } as {
        id: string;
        name: string;
        email: string;
        organizations: { id: string; name: string; urlKey?: string }[];
        teams: LinearTeam[];
      },
    };
  }

  /**
   * 列出 Linear 远端项目（用于"选择要同步的 Linear project" UI）
   */
  async listRemoteProjects(integrationId: string) {
    const client = await this.getClient(integrationId);
    const page = await this.provider.fetchProjects(client, { first: 250 });
    return page.projects.map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon ?? null,
      color: p.color ?? null,
      description: p.description ?? null,
      url: p.url ?? null,
      state: p.state ?? null,
      priority: p.priority ?? null,
      teams: p.teams?.nodes ?? [],
      updatedAt: p.updatedAt,
    }));
  }

  async getSyncLogs(integrationId: string, limit = 50, projectId?: string) {
    return this.prisma.integrationSyncLog.findMany({
      where: { integrationId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  /**
   * 内部工具
   */
  private issueToTaskPatch(issue: LinearIssue): {
    title: string;
    description: string | null;
    status: string;
    priority: string;
  } {
    return {
      title: issue.title || issue.identifier,
      description: issue.description ?? null,
      status: this.normalizeWorkflowStatus(issue.state?.type, issue.state?.name),
      priority: this.normalizePriority(issue.priority),
    };
  }

  private taskToIssueInput(task: {
    title: string;
    description?: string | null;
    priority: string;
    status: string;
  }): Record<string, unknown> {
    return {
      title: task.title,
      description: task.description ?? undefined,
      priority: TASK_PRIORITY_TO_LINEAR[task.priority] ?? 0,
      // 状态映射：Linear 用 state.id 才是稳定标识，这里只塞 type（API 接受 type）
      // 调用方需确保项目有对应的 workflow state
    };
  }

  private detectConflict(
    local: {
      externalVersion: string | null;
      localUpdatedAt: Date | null;
      metadata: unknown;
    },
    issue: LinearIssue,
  ): {
    hasConflict: boolean;
    localFields?: string[];
  } {
    if (!local.externalVersion) {
      return { hasConflict: false };
    }
    const remoteTs = new Date(issue.updatedAt).getTime();
    const localExtTs = new Date(local.externalVersion).getTime();
    const localUpdTs = local.localUpdatedAt
      ? new Date(local.localUpdatedAt).getTime()
      : 0;

    const remoteMoreRecent = remoteTs - localExtTs > LINEAR_CONFLICT_WINDOW_MS;
    const localMoreRecent = localUpdTs - localExtTs > LINEAR_CONFLICT_WINDOW_MS;
    if (remoteMoreRecent && localMoreRecent) {
      return {
        hasConflict: true,
        localFields: ['title', 'description', 'status', 'priority'],
      };
    }
    return { hasConflict: false };
  }

  private async fetchIssue(client: LinearClient, issueId: string): Promise<LinearIssue> {
    // 通过 projects 链路无法保证出现单个 issue；用 project issues 方式获取是 OK 的
    // 这里采用最简单实现：从 cache 中取，或者直接做一次 GraphQL 单 issue 查询
    const query = `
      query Issue($id: String!) {
        issue(id: $id) {
          id identifier title description priority priorityLabel estimate url createdAt updatedAt archivedAt dueDate startedAt completedAt
          state { id name type color position }
          labels { nodes { id name color } }
          assignee { id name email }
        }
      }
    `;
    const data = await client.request<{ issue: LinearIssue | null }>({
      query,
      variables: { id: issueId },
    });
    if (!data.issue) {
      throw new NotFoundException(`Linear issue ${issueId} not found`);
    }
    return data.issue;
  }

  /**
   * 检查一个项目字段是否属于 Linear 锁定的字段
   */
  isProjectFieldLocked(field: string): boolean {
    return (LINEAR_LOCKED_PROJECT_FIELDS as readonly string[]).includes(field);
  }
}
