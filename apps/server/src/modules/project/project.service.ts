import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string) {
    // If templateId is provided, load template and apply defaults
    let templateData: any = null;
    if (createProjectDto.templateId) {
      templateData = await this.prisma.projectTemplate.findUnique({
        where: { id: createProjectDto.templateId },
      });
    }

    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        description: createProjectDto.description,
        type: createProjectDto.type,
        visibility: createProjectDto.visibility,
        status: 'active',
        config: createProjectDto.config || templateData?.defaultStatuses || {},
        createdBy: userId,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Publish event
    this.messageBus.publish('project.created', {
      projectId: project.id,
      userId,
      project,
    });

    return project;
  }

  async findAll(query: ProjectQueryDto, userId: string) {
    const { q, status, type, memberId, page = 1, pageSize = 20 } = query;

    // Ensure numeric pagination values (query params arrive as strings)
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 20;

    const where: any = {};

    // Search by name/description
    if (q) {
      where.OR = [{ name: { contains: q } }, { description: { contains: q } }];
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    // Filter by member participation
    if (memberId) {
      where.members = {
        some: {
          userId: memberId,
        },
      };
    } else {
      // Default: show projects user is a member of
      where.members = {
        some: {
          userId,
        },
      };
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { updatedAt: 'desc' },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          _count: {
            select: {
              tasks: true,
              iterations: true,
            },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            iterations: true,
            milestones: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string) {
    // Check if user has permission (owner or maintainer)
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
    });

    if (!member || !['owner', 'maintainer'].includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Publish event
    this.messageBus.publish('project.updated', {
      projectId: project.id,
      userId,
      project,
    });

    return project;
  }

  async archive(id: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
    });

    if (!member || member.role !== 'owner') {
      throw new ForbiddenException('Only owner can archive project');
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: { status: 'archived' },
    });

    this.messageBus.publish('project.updated', {
      projectId: project.id,
      userId,
      project,
    });

    return project;
  }

  async restore(id: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
    });

    if (!member || member.role !== 'owner') {
      throw new ForbiddenException('Only owner can restore project');
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: { status: 'active' },
    });

    this.messageBus.publish('project.updated', {
      projectId: project.id,
      userId,
      project,
    });

    return project;
  }
}
