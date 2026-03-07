import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto, UseTaskTemplateDto } from './dto/create-task-template.dto';

@Injectable()
export class TaskTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskTemplateDto, userId: string) {
    const { items, ...templateData } = dto;

    const template = await this.prisma.taskTemplate.create({
      data: {
        ...templateData,
        items: items ? {
          create: items.map(item => ({
            title: item.title,
            description: item.description,
            status: item.status,
            priority: item.priority,
            estimate: item.estimate,
            parentItemId: item.parentItemId,
          })),
        } : undefined,
      },
      include: {
        items: true,
      },
    });

    return template;
  }

  async findAll(projectId?: string) {
    const templates = await this.prisma.taskTemplate.findMany({
      where: {
        OR: [
          { projectId: null },
          { projectId },
        ],
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
    const template = await this.prisma.taskTemplate.findUnique({
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

  async update(id: string, dto: UpdateTaskTemplateDto) {
    const { items, ...templateData } = dto;

    // First, delete all existing items
    await this.prisma.taskTemplateItem.deleteMany({
      where: { templateId: id },
    });

    // Then update the template with new items
    const template = await this.prisma.taskTemplate.update({
      where: { id },
      data: {
        ...templateData,
        items: items ? {
          create: items.map(item => ({
            title: item.title,
            description: item.description,
            status: item.status,
            priority: item.priority,
            estimate: item.estimate,
            parentItemId: item.parentItemId,
          })),
        } : undefined,
      },
      include: {
        items: true,
      },
    });

    return template;
  }

  async delete(id: string) {
    await this.prisma.taskTemplate.delete({
      where: { id },
    });

    return { success: true };
  }

  async useTemplate(templateId: string, dto: UseTaskTemplateDto, userId: string) {
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
        return this.prisma.task.create({
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
