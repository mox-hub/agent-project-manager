import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import {
  CreateProjectRoleDto,
  UpdateProjectRoleDto,
  ExecutionRole,
} from './project-role.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectRoleDefinitionService {
  private readonly logger = new Logger(ProjectRoleDefinitionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 列出项目级角色 + 全局默认模板（projectId is null）
   */
  async list(projectId: string) {
    const [projectRoles, globalRoles] = await Promise.all([
      this.prisma.projectRoleDefinition.findMany({
        where: { projectId },
        orderBy: [{ executionRole: 'asc' }, { key: 'asc' }],
      }),
      this.prisma.projectRoleDefinition.findMany({
        where: { projectId: null },
        orderBy: [{ executionRole: 'asc' }, { key: 'asc' }],
      }),
    ]);
    return { projectRoles, globalRoles };
  }

  /**
   * 仅项目级角色
   */
  async listProject(projectId: string) {
    return this.prisma.projectRoleDefinition.findMany({
      where: { projectId },
      orderBy: [{ executionRole: 'asc' }, { key: 'asc' }],
    });
  }

  /**
   * 仅全局默认模板（projectId is null）
   */
  async listGlobal() {
    return this.prisma.projectRoleDefinition.findMany({
      where: { projectId: null },
      orderBy: [{ executionRole: 'asc' }, { key: 'asc' }],
    });
  }

  /**
   * 详情
   */
  async findById(id: string) {
    const role = await this.prisma.projectRoleDefinition.findUnique({
      where: { id },
    });
    if (!role) throw new NotFoundException(`ProjectRole ${id} not found`);
    return role;
  }

  /**
   * 创建项目级角色（覆盖/继承全局模板）
   */
  async create(projectId: string, dto: CreateProjectRoleDto) {
    const existing = await this.prisma.projectRoleDefinition.findFirst({
      where: { projectId, key: dto.key },
    });
    if (existing) {
      throw new ConflictException(
        `ProjectRole key="${dto.key}" already exists in project`,
      );
    }
    const data: Prisma.ProjectRoleDefinitionCreateInput = {
      projectId,
      key: dto.key,
      name: dto.name,
      description: dto.description ?? null,
      executionRole: (dto.executionRole ?? 'general') as string,
      defaultCliProviderId: dto.defaultCliProviderId ?? null,
      promptHint: dto.promptHint ?? null,
    };
    return this.prisma.projectRoleDefinition.create({ data });
  }

  async update(id: string, dto: UpdateProjectRoleDto) {
    await this.findById(id);
    const data: Prisma.ProjectRoleDefinitionUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.executionRole !== undefined)
      data.executionRole = dto.executionRole as string;
    if (dto.defaultCliProviderId !== undefined)
      data.defaultCliProviderId = dto.defaultCliProviderId ?? null;
    if (dto.promptHint !== undefined) data.promptHint = dto.promptHint ?? null;
    return this.prisma.projectRoleDefinition.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.projectRoleDefinition.delete({ where: { id } });
  }

  /**
   * 把全局默认模板复制到项目级（项目创建时调用）
   */
  async seedProjectRolesFromGlobal(projectId: string) {
    const globalRoles = await this.prisma.projectRoleDefinition.findMany({
      where: { projectId: null },
    });
    if (globalRoles.length === 0) {
      this.logger.warn('No global role templates found; skip project seeding');
      return [];
    }
    const created = await Promise.all(
      globalRoles.map((g) =>
        this.prisma.projectRoleDefinition.create({
          data: {
            projectId,
            key: g.key,
            name: g.name,
            description: g.description,
            executionRole: g.executionRole,
            defaultCliProviderId: g.defaultCliProviderId,
            promptHint: g.promptHint,
          },
        }),
      ),
    );
    return created;
  }

  /**
   * 解析执行角色 → 项目级角色（找不到则回退到全局模板）
   */
  async resolveByExecutionRole(
    projectId: string,
    executionRole: ExecutionRole,
  ) {
    // 优先项目级
    const projectRole = await this.prisma.projectRoleDefinition.findFirst({
      where: { projectId, executionRole },
    });
    if (projectRole) return projectRole;
    // 回退全局
    return this.prisma.projectRoleDefinition.findFirst({
      where: { projectId: null, executionRole },
    });
  }
}
