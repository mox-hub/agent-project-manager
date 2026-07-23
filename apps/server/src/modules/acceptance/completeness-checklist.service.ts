import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { CreateChecklistDto, UpdateChecklistDto } from './dto/checklist.dto';

@Injectable()
export class CompletenessChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取系统预置清单
   */
  async getSystemChecklists() {
    return this.prisma.completenessChecklist.findMany({
      where: { isSystem: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 按项目类型和技术栈获取清单
   */
  async findByTechStack(projectType: string, techStack: string) {
    const checklist = await this.prisma.completenessChecklist.findFirst({
      where: {
        projectType,
        techStack,
        isSystem: true,
      },
    });

    return checklist;
  }

  /**
   * 获取团队自定义清单
   */
  async findTeamChecklists(ownerId: string) {
    return this.prisma.completenessChecklist.findMany({
      where: {
        isSystem: false,
        ownerId,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * 创建团队自定义清单
   */
  async createTeamChecklist(dto: CreateChecklistDto, ownerId: string) {
    return this.prisma.completenessChecklist.create({
      data: {
        name: dto.name,
        description: dto.description,
        projectType: dto.projectType,
        techStack: dto.techStack,
        checklist: dto.checklist as any,
        isSystem: false,
        ownerId,
      },
    });
  }

  /**
   * 更新团队自定义清单
   */
  async updateTeamChecklist(id: string, dto: UpdateChecklistDto, ownerId: string) {
    const checklist = await this.prisma.completenessChecklist.findUnique({
      where: { id },
    });

    if (!checklist) {
      throw new NotFoundException(`Checklist ${id} not found`);
    }

    if (checklist.isSystem) {
      throw new BadRequestException('Cannot modify system checklists');
    }

    if (checklist.ownerId !== ownerId) {
      throw new BadRequestException('Not authorized to modify this checklist');
    }

    return this.prisma.completenessChecklist.update({
      where: { id },
      data: {
        ...dto,
        checklist: dto.checklist ? dto.checklist as any : undefined,
        version: { increment: 1 },
      },
    });
  }

  /**
   * 获取单个清单
   */
  async findOne(id: string) {
    const checklist = await this.prisma.completenessChecklist.findUnique({
      where: { id },
    });

    if (!checklist) {
      throw new NotFoundException(`Checklist ${id} not found`);
    }

    return checklist;
  }

  /**
   * 将清单应用到验收（生成技术标准）
   */
  async applyToAcceptance(acceptanceId: string, checklistId: string) {
    const [acceptance, checklist] = await Promise.all([
      this.prisma.acceptance.findUnique({ where: { id: acceptanceId } }),
      this.prisma.completenessChecklist.findUnique({ where: { id: checklistId } }),
    ]);

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${acceptanceId} not found`);
    }
    if (!checklist) {
      throw new NotFoundException(`Checklist ${checklistId} not found`);
    }

    const items = checklist.checklist as any[];
    if (!Array.isArray(items)) {
      throw new BadRequestException('Invalid checklist format');
    }

    // 批量创建技术标准
    const maxOrder = await this.prisma.acceptanceCriteria.aggregate({
      where: { acceptanceId },
      _max: { order: true },
    });

    let orderOffset = (maxOrder._max.order ?? -1) + 1;

    const created = await Promise.all(
      items.map((item) =>
        this.prisma.acceptanceCriteria.create({
          data: {
            acceptanceId,
            criteriaType: 'technical',
            category: item.category,
            content: item.content,
            source: 'template',
            weight: 1,
            severity: item.severity || 'medium',
            order: orderOffset++,
            metadata: { fromChecklist: checklistId, checklistName: checklist.name },
          },
        }),
      ),
    );

    return {
      checklist,
      createdCount: created.length,
      criteria: created,
    };
  }

  /**
   * 列出所有可用清单
   */
  async findAll(params?: {
    projectType?: string;
    techStack?: string;
    isSystem?: boolean;
  }) {
    const where: any = {};
    if (params?.projectType) where.projectType = params.projectType;
    if (params?.techStack) where.techStack = params.techStack;
    if (params?.isSystem !== undefined) where.isSystem = params.isSystem;

    return this.prisma.completenessChecklist.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * 创建预置清单（系统初始化用）
   */
  async createSystemChecklist(data: {
    name: string;
    description?: string;
    projectType: string;
    techStack: string;
    checklist: any[];
  }) {
    return this.prisma.completenessChecklist.create({
      data: {
        name: data.name,
        description: data.description,
        projectType: data.projectType,
        techStack: data.techStack,
        checklist: data.checklist as any,
        isSystem: true,
      },
    });
  }
}
