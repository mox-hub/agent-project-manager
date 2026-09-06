import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CreateIssueTemplateDto,
  UpdateIssueTemplateDto,
  UseIssueTemplateDto,
} from './dto/create-issue-template.dto';

@Injectable()
export class IssueTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateIssueTemplateDto, userId: string) {
    const { items, ...templateData } = dto;

    const template = await this.prisma.issueTemplate.create({
      data: {
        ...templateData,
        items: items
          ? {
              create: items.map((item) => ({
                title: item.title,
                description: item.description,
                status: item.status,
                priority: item.priority,
                estimate: item.estimate,
                parentItemId: item.parentItemId,
              })),
            }
          : undefined,
      },
      include: {
        items: true,
      },
    });

    return template;
  }

  async findAll(projectId?: string) {
    const templates = await this.prisma.issueTemplate.findMany({
      where: {
        OR: [{ projectId: null }, { projectId }],
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return templates;
  }

  async findOne(id: string) {
    const template = await this.prisma.issueTemplate.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template;
  }

  async update(id: string, dto: UpdateIssueTemplateDto) {
    const { items, ...templateData } = dto;

    // 仅在显式提供 items 时整体替换条目；否则保留既有条目（部分更新不能清空模板）
    const template = await this.prisma.issueTemplate.update({
      where: { id },
      data: {
        ...templateData,
        items:
          items !== undefined
            ? {
                deleteMany: {},
                create: items.map((item) => ({
                  title: item.title,
                  description: item.description,
                  status: item.status,
                  priority: item.priority,
                  estimate: item.estimate,
                  parentItemId: item.parentItemId,
                })),
              }
            : undefined,
      },
      include: {
        items: true,
      },
    });

    return template;
  }

  async delete(id: string) {
    await this.prisma.issueTemplate.delete({
      where: { id },
    });
  }

  async useTemplate(
    templateId: string,
    dto: UseIssueTemplateDto,
    userId: string,
  ) {
    const template = await this.findOne(templateId);

    // Verify project exists and user has access
    const project = await this.prisma.project.findFirst({
      where: {
        id: dto.projectId,
        members: {
          some: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    // Get default status
    let defaultStatus = await this.prisma.statusDefinition.findFirst({
      where: {
        type: 'task',
        projectId: dto.projectId,
      },
      orderBy: { order: 'asc' },
    });

    if (!defaultStatus) {
      defaultStatus = await this.prisma.statusDefinition.findFirst({
        where: {
          type: 'task',
          projectId: null,
        },
        orderBy: { order: 'asc' },
      });
    }

    const status = defaultStatus?.key || 'todo';

    // Create tasks from template items
    const createdTasks = await Promise.all(
      template.items.map(async (item) => {
        return this.prisma.issue.create({
          data: {
            projectId: dto.projectId,
            title: item.title,
            description: item.description,
            status: item.status || status,
            priority: item.priority || 'medium',
            estimate: item.estimate,
            reporterId: userId,
          },
        });
      }),
    );

    return {
      template: template.name,
      tasksCreated: createdTasks.length,
      tasks: createdTasks,
    };
  }
}
