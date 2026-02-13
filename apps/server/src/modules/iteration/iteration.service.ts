import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateIterationDto } from './dto/create-iteration.dto';

@Injectable()
export class IterationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createIterationDto: CreateIterationDto, userId: string) {
    // Verify project access
    const project = await this.prisma.project.findFirst({
      where: {
        id: createIterationDto.projectId,
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

    return this.prisma.iteration.create({
      data: {
        projectId: createIterationDto.projectId,
        name: createIterationDto.name,
        goal: createIterationDto.goal,
        startDate: new Date(createIterationDto.startDate),
        endDate: new Date(createIterationDto.endDate),
        capacity: createIterationDto.capacity,
        status: 'planned',
      },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });
  }

  async findAll(projectId: string, userId: string) {
    // Verify project access
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

    return this.prisma.iteration.findMany({
      where: { projectId },
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });
  }
}
