import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class MilestoneService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // 获取里程碑及其关联的任务（通过 MilestoneTask 连接表）
    const milestones = await this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { targetDate: 'asc' },
      include: {
        tasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
              },
            },
          },
        },
      },
    });

    // 返回格式化的里程碑数据，包含任务统计
    return milestones.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      status: milestone.status,
      targetDate: milestone.targetDate?.toISOString() || null,
      description: milestone.description,
      taskCount: milestone.tasks.length,
      tasks: milestone.tasks.map((mt) => ({
        id: mt.task.id,
        title: mt.task.title,
        status: mt.task.status,
        priority: mt.task.priority,
      })),
    }));
  }

  async create(
    projectId: string,
    data: {
      name: string;
      description?: string;
      targetDate?: string | null;
      iterationId?: string | null;
      status?: string;
      metadata?: Record<string, any>;
    },
    userId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId,
            role: { in: ['owner', 'maintainer'] },
          },
        },
      },
    });

    if (!project) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const targetDate = data.targetDate ? new Date(data.targetDate) : null;

    return this.prisma.milestone.create({
      data: {
        projectId,
        iterationId: data.iterationId || null,
        name: data.name,
        description: data.description,
        targetDate,
        status: data.status || 'planned',
        metadata: data.metadata || {},
      },
    });
  }
}
