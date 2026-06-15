import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

export interface CreateModuleInput {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateModuleInput {
  name?: string;
  description?: string;
}

@Injectable()
export class ProjectModuleService {
  constructor(private readonly prisma: PrismaService) {}

  private validateCode(code: string) {
    if (!/^[A-Z]{2,4}$/.test(code)) {
      throw new BadRequestException('moduleCode 必须是 2-4 位大写字母');
    }
  }

  async list(projectId: string) {
    return this.prisma.projectModule.findMany({
      where: { projectId },
      orderBy: { code: 'asc' },
    });
  }

  async create(projectId: string, input: CreateModuleInput) {
    this.validateCode(input.code);
    const existing = await this.prisma.projectModule.findUnique({
      where: { projectId_code: { projectId, code: input.code } },
    });
    if (existing) {
      throw new ConflictException(`模块代码 ${input.code} 已存在`);
    }
    return this.prisma.projectModule.create({
      data: {
        projectId,
        code: input.code,
        name: input.name,
        description: input.description,
      },
    });
  }

  async update(projectId: string, moduleId: string, input: UpdateModuleInput) {
    const row = await this.prisma.projectModule.findUnique({ where: { id: moduleId } });
    if (!row || row.projectId !== projectId) {
      throw new NotFoundException(`模块 ${moduleId} 不存在`);
    }
    return this.prisma.projectModule.update({
      where: { id: moduleId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });
  }

  async remove(projectId: string, moduleId: string) {
    const row = await this.prisma.projectModule.findUnique({ where: { id: moduleId } });
    if (!row || row.projectId !== projectId) {
      throw new NotFoundException(`模块 ${moduleId} 不存在`);
    }
    // 阻止: 还有任务引用此模块
    const referenced = await this.prisma.task.count({
      where: { projectId, shortId: { contains: `-${row.code}-` } },
    });
    if (referenced > 0) {
      throw new ConflictException(
        `该代码下还有 ${referenced} 个任务/Bug 引用, 请先迁移或删除这些任务`,
      );
    }
    await this.prisma.projectModule.delete({ where: { id: moduleId } });
    return { ok: true };
  }
}
