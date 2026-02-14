import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

    return this.prisma.milestone.findMany({
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
              },
            },
          },
        },
      },
    });
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

