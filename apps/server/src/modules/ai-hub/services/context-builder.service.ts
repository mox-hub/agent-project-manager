import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

export interface ContextData {
  projectSummary?: string;
  taskDetails?: string;
  recentActivities?: string;
  gitDiff?: string;
}

@Injectable()
export class ContextBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async buildContext(options: {
    projectId?: string;
    taskId?: string;
    includeProjectSummary?: boolean;
    includeTaskDetails?: boolean;
    includeRecentActivities?: boolean;
    includeGitDiff?: boolean;
  }): Promise<ContextData> {
    const context: ContextData = {};

    if (options.includeProjectSummary && options.projectId) {
      context.projectSummary = await this.getProjectSummary(options.projectId);
    }

    if (options.includeTaskDetails && options.taskId) {
      context.taskDetails = await this.getTaskDetails(options.taskId);
    }

    if (options.includeRecentActivities) {
      if (options.projectId) {
        context.recentActivities = await this.getProjectRecentActivities(
          options.projectId,
        );
      } else if (options.taskId) {
        context.recentActivities = await this.getTaskRecentActivities(
          options.taskId,
        );
      }
    }

    // Git diff will be implemented in Phase 4
    if (options.includeGitDiff) {
      context.gitDiff = 'Git diff integration coming in Phase 4';
    }

    return context;
  }

  private async getProjectSummary(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            tasks: true,
            iterations: true,
            members: true,
          },
        },
      },
    });

    if (!project) {
      return '';
    }

    return `项目名称: ${project.name}
描述: ${project.description || '无'}
类型: ${project.type}
状态: ${project.status}
任务数: ${project._count.tasks}
迭代数: ${project._count.iterations}
成员数: ${project._count.members}`;
  }

  private async getTaskDetails(taskId: string): Promise<string> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        taskTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!task) {
      return '';
    }

    const tags = task.taskTags.map((tt) => tt.tag.name).join(', ');

    return `任务标题: ${task.title}
描述: ${task.description || '无'}
状态: ${task.status}
优先级: ${task.priority}
负责人: ${task.assignee?.displayName || '未分配'}
报告人: ${task.reporter?.displayName || '未知'}
标签: ${tags || '无'}
截止日期: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '无'}`;
  }

  private async getProjectRecentActivities(
    projectId: string,
    limit = 10,
  ): Promise<string> {
    const activities = await this.prisma.taskActivity.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (activities.length === 0) {
      return '暂无最近活动';
    }

    return activities
      .map(
        (act) =>
          `[${new Date(act.timestamp).toLocaleString()}] ${act.type}: ${
            act.summary || ''
          } (任务: ${act.task.title})`,
      )
      .join('\n');
  }

  private async getTaskRecentActivities(
    taskId: string,
    limit = 10,
  ): Promise<string> {
    const activities = await this.prisma.taskActivity.findMany({
      where: { taskId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    if (activities.length === 0) {
      return '暂无最近活动';
    }

    return activities
      .map(
        (act) =>
          `[${new Date(act.timestamp).toLocaleString()}] ${act.type}: ${
            act.summary || ''
          }`,
      )
      .join('\n');
  }

  formatContextForPrompt(context: ContextData): string {
    const parts: string[] = [];

    if (context.projectSummary) {
      parts.push('## 项目信息\n' + context.projectSummary);
    }

    if (context.taskDetails) {
      parts.push('## 任务信息\n' + context.taskDetails);
    }

    if (context.recentActivities) {
      parts.push('## 最近活动\n' + context.recentActivities);
    }

    if (context.gitDiff) {
      parts.push('## Git 变更\n' + context.gitDiff);
    }

    return parts.length > 0
      ? '以下是与本次对话相关的上下文信息：\n\n' + parts.join('\n\n')
      : '';
  }

  /**
   * Build a structured task execution context enriched with ProjectAIContext data.
   * Used by AI Worker Coordinator for dispatch context packs.
   */
  async buildTaskExecutionContext(taskId: string, projectId: string) {
    const [task, aiContext] = await Promise.all([
      this.prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignee: {
            select: { id: true, username: true, displayName: true },
          },
          reporter: {
            select: { id: true, username: true, displayName: true },
          },
          taskTags: { include: { tag: true } },
          dependencies: {
            include: {
              dependsOnTask: {
                select: { id: true, title: true, status: true },
              },
            },
          },
          subTasks: {
            select: { id: true, title: true, status: true },
          },
        },
      }),
      this.prisma.projectAIContext.findUnique({
        where: { projectId },
      }),
    ]);

    if (!task) {
      return null;
    }

    return {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: task.taskTags.map((tt) => tt.tag.name),
        assignee: task.assignee?.displayName ?? null,
        dependencies: task.dependencies.map((d) => ({
          id: d.dependsOnTask.id,
          title: d.dependsOnTask.title,
          status: d.dependsOnTask.status,
        })),
        subTasks: task.subTasks,
      },
      projectContext: aiContext
        ? {
            techStack: aiContext.techStack as string[] | null,
            languages: aiContext.languages as string[] | null,
            frameworks: aiContext.frameworks as string[] | null,
            complexityLevel: aiContext.complexityLevel,
            lifecyclePhase: aiContext.lifecyclePhase,
            healthScore: aiContext.healthScore,
            riskIndicators: aiContext.riskIndicators as Record<
              string,
              unknown
            > | null,
          }
        : null,
      generatedAt: new Date().toISOString(),
    };
  }
}
